import { describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '@mercado/shared';
import { dispatchPlayerAction } from '../src/domain/game-engine.js';
import { aiAtMarketWithCargo, gameAtPlayerStart } from './fixtures.js';

function humanTurn(game: GameState): GameState {
  return { ...game, phase: 'PLAYER_TURN', activeActor: 'PLAYER' };
}

describe('dispatchPlayerAction', () => {
  it('applies the first human action without running the rival', () => {
    const game = gameAtPlayerStart();
    const before = structuredClone(game);
    const result = dispatchPlayerAction(game, { type: 'MOVE', payload: { row: 6, column: 1 } });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.game).toMatchObject({ round: 1, phase: 'PLAYER_TURN', activeActor: 'PLAYER', actionPoints: 1 });
    expect(result.game.players.AI).toEqual(game.players.AI);
    expect(result.events).toEqual([expect.objectContaining({ type: 'MOVED', actor: 'PLAYER' })]);
    expect(game).toEqual(before);
  });

  it('runs two ordinary rival moves after the second human action and returns ordered events', () => {
    const first = dispatchPlayerAction(gameAtPlayerStart(), { type: 'MOVE', payload: { row: 6, column: 1 } });
    if (!first.ok) throw new Error(first.error.message);
    const before = structuredClone(first.game);
    const result = dispatchPlayerAction(first.game, { type: 'MOVE', payload: { row: 5, column: 1 } });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.game).toMatchObject({ round: 2, tide: 'HIGH', phase: 'PLAYER_TURN', activeActor: 'PLAYER', actionPoints: 2 });
    expect(result.game.players.AI.position).toEqual({ row: 1, column: 5 });
    expect(result.game.players.AI.cargo).toEqual([]);
    expect(result.events).toEqual([
      expect.objectContaining({ type: 'MOVED', actor: 'PLAYER', round: 1 }),
      expect.objectContaining({ type: 'MOVED', actor: 'AI', round: 1 }),
      expect.objectContaining({ type: 'MOVED', actor: 'AI', round: 1 }),
      expect.objectContaining({ type: 'TIDE_CHANGED', round: 2 }),
      expect.objectContaining({ type: 'RESTOCKED', round: 2 }),
    ]);
    expect(result.game.eventLog).toEqual([...first.game.eventLog, ...result.events]);
    expect(first.game).toEqual(before);
  });

  it('runs the rival when the human explicitly ends a turn with points remaining', () => {
    const result = dispatchPlayerAction(gameAtPlayerStart(), { type: 'END_TURN' });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.game.round).toBe(2);
    expect(result.events[0]).toMatchObject({ type: 'TURN_ENDED', actor: 'PLAYER' });
    expect(result.events.filter((event) => 'actor' in event && event.actor === 'AI')).toHaveLength(2);
  });

  it('returns a rejection without running AI or mutating any state', () => {
    const game = { ...gameAtPlayerStart(), actionPoints: 1 };
    const before = structuredClone(game);
    expect(dispatchPlayerAction(game, { type: 'LOAD' })).toMatchObject({
      ok: false, error: { code: 'NOT_AT_SUPPLY_PORT' },
    });
    expect(game).toEqual(before);
  });

  it('stops AI immediately on END_TURN when its ship is blocked', () => {
    const base = gameAtPlayerStart();
    const game = { ...base, board: base.board.map((tile) =>
      (tile.position.row === 0 && tile.position.column === 5)
      || (tile.position.row === 1 && tile.position.column === 6)
        ? { ...tile, kind: 'ISLAND' as const } : tile) };
    const result = dispatchPlayerAction(game, { type: 'END_TURN' });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.events.filter((event) => 'actor' in event && event.actor === 'AI')).toEqual([
      expect.objectContaining({ type: 'TURN_ENDED', actor: 'AI' }),
    ]);
    expect(result.game.round).toBe(2);
  });

  it('finishes round ten only after two AI sales that respect demand', () => {
    const game = humanTurn({ ...aiAtMarketWithCargo(['PEARL', 'PEARL', 'PEARL']), round: 10 });
    const result = dispatchPlayerAction(game, { type: 'END_TURN' });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.game).toMatchObject({ round: 10, phase: 'FINISHED', actionPoints: 0,
      result: { kind: 'AI_WIN', playerCoins: 0, aiCoins: 13 } });
    expect(result.game.players.AI.cargo).toEqual(['PEARL']);
    expect(result.game.tide).toBe(game.tide);
    expect(result.game.supplies).toEqual(game.supplies);
    expect(result.events.map((event) => event.type)).toEqual(['TURN_ENDED', 'SOLD', 'SOLD', 'GAME_FINISHED']);
    const before = structuredClone(result.game);
    expect(dispatchPlayerAction(result.game, { type: 'END_TURN' })).toMatchObject({ ok: false, error: { code: 'GAME_FINISHED' } });
    expect(result.game).toEqual(before);
  });

  it('returns every new event even when the existing fifty-entry log is truncated', () => {
    const eventLog: GameEvent[] = Array.from({ length: 50 }, (_, index) => ({
      type: 'GAME_STARTED', round: 1, message: `Anterior ${index}`,
    }));
    const game = { ...gameAtPlayerStart(), eventLog };
    const result = dispatchPlayerAction(game, { type: 'END_TURN' });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.events.map((event) => event.type)).toEqual(['TURN_ENDED', 'MOVED', 'MOVED', 'TIDE_CHANGED', 'RESTOCKED']);
    expect(result.game.eventLog).toEqual([...eventLog, ...result.events].slice(-50));
    expect(result.game.eventLog).toHaveLength(50);
    expect(game.eventLog).toEqual(eventLog);
  });

  it('resolves ten reproducible rounds with a rival that earns coins', () => {
    function play(): GameState {
      let game = gameAtPlayerStart();
      for (let round = 1; round <= 10; round++) {
        expect(game.round).toBe(round);
        const result = dispatchPlayerAction(game, { type: 'END_TURN' });
        if (!result.ok) throw new Error(result.error.message);
        expect(result.events.filter((event) => 'actor' in event && event.actor === 'AI').length).toBeLessThanOrEqual(2);
        game = result.game;
      }
      return game;
    }
    const result = play();
    expect(result.phase).toBe('FINISHED');
    expect(result.players.AI.coins).toBeGreaterThan(0);
    expect(result).toEqual(play());
  });
});
