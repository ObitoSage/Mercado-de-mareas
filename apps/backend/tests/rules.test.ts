import { describe, expect, it } from 'vitest';
import type { GameState, Position } from '@mercado/shared';
import { applyAction, isAdjacent, validateAction } from '../src/domain/rules.js';
import { gameAtPlayerStart, gameWith } from './fixtures.js';

function withPlayerPosition(position: Position, overrides: Partial<GameState> = {}): GameState {
  const game = gameAtPlayerStart();
  return gameWith({
    ...overrides,
    players: {
      ...game.players,
      PLAYER: { ...game.players.PLAYER, position: { ...position } },
    },
  });
}

function withPlayer(
  playerOverrides: Partial<GameState['players']['PLAYER']>,
  overrides: Partial<GameState> = {},
): GameState {
  const game = gameAtPlayerStart();
  return gameWith({
    ...overrides,
    players: {
      ...game.players,
      PLAYER: { ...game.players.PLAYER, ...playerOverrides },
    },
  });
}

describe('movement rules', () => {
  it.each([
    [{ row: 6, column: 2 }, 'NOT_ADJACENT'],
    [{ row: 7, column: 0 }, 'OUT_OF_BOUNDS'],
  ] as const)('rejects move to %o with %s', (position, code) => {
    const result = applyAction(gameAtPlayerStart(), 'PLAYER', { type: 'MOVE', payload: position });
    expect(result).toMatchObject({ ok: false, error: { code } });
  });

  it('moves one orthogonal tile, spends one point and records the event immutably', () => {
    const game = gameAtPlayerStart();
    const before = structuredClone(game);
    const result = applyAction(game, 'PLAYER', { type: 'MOVE', payload: { row: 6, column: 1 } });
    expect(result).toMatchObject({
      ok: true,
      game: { actionPoints: 1, players: { PLAYER: { position: { row: 6, column: 1 } } } },
      events: [{
        type: 'MOVED', round: 1, actor: 'PLAYER',
        from: { row: 6, column: 0 }, to: { row: 6, column: 1 },
      }],
    });
    if (result.ok) {
      expect(result.game.eventLog.at(-1)).toEqual(result.events[0]);
      expect(result.events[0]?.message).toMatch(/Marina.*6, 1/i);
    }
    expect(game).toEqual(before);
  });

  it.each([
    ['rejects an adjacent island', withPlayerPosition({ row: 6, column: 3 }), { row: 6, column: 4 }, 'TILE_BLOCKED'],
    ['rejects a reef outside high tide', withPlayerPosition({ row: 1, column: 2 }, { tide: 'LOW' }), { row: 2, column: 2 }, 'REEF_CLOSED'],
  ] as const)('%s', (_name, game, position, code) => {
    const before = structuredClone(game);
    const result = applyAction(game, 'PLAYER', { type: 'MOVE', payload: position });
    expect(result).toMatchObject({ ok: false, error: { code } });
    expect(game).toEqual(before);
  });

  it('allows entering a reef during high tide', () => {
    const game = withPlayerPosition({ row: 1, column: 2 }, { tide: 'HIGH' });
    const result = applyAction(game, 'PLAYER', { type: 'MOVE', payload: { row: 2, column: 2 } });
    expect(result).toMatchObject({ ok: true, game: { players: { PLAYER: { position: { row: 2, column: 2 } } } } });
  });

  it('rejects a tile occupied by the other trader', () => {
    const game = gameAtPlayerStart();
    const occupied = gameWith({
      players: {
        ...game.players,
        AI: { ...game.players.AI, position: { row: 6, column: 1 } },
      },
    });
    expect(applyAction(occupied, 'PLAYER', { type: 'MOVE', payload: { row: 6, column: 1 } }))
      .toMatchObject({ ok: false, error: { code: 'TILE_OCCUPIED' } });
  });

  it.each([
    ['AI', gameAtPlayerStart(), 'NOT_ACTIVE_ACTOR'],
    ['PLAYER', gameWith({ actionPoints: 0 }), 'NO_ACTION_POINTS'],
    ['PLAYER', gameWith({ phase: 'FINISHED' }), 'GAME_FINISHED'],
  ] as const)('rejects unavailable actor %s with %s', (actor, game, code) => {
    const before = structuredClone(game);
    const result = applyAction(game, actor, { type: 'MOVE', payload: { row: 6, column: 1 } });
    expect(result).toMatchObject({ ok: false, error: { code } });
    expect(game).toEqual(before);
  });

  it('validates without applying a valid action', () => {
    const game = gameAtPlayerStart();
    const result = validateAction(game, 'PLAYER', { type: 'MOVE', payload: { row: 6, column: 1 } });
    expect(result).toEqual({ ok: true, game, events: [] });
  });

  it.each([
    [{ row: 2, column: 2 }, { row: 2, column: 3 }, true],
    [{ row: 2, column: 2 }, { row: 3, column: 2 }, true],
    [{ row: 2, column: 2 }, { row: 3, column: 3 }, false],
    [{ row: 2, column: 2 }, { row: 2, column: 4 }, false],
  ] as const)('checks orthogonal adjacency from %o to %o', (from, to, expected) => {
    expect(isAdjacent(from, to)).toBe(expected);
  });
});

describe('load rules', () => {
  it('loads one unit, spends one point and decrements stock immutably', () => {
    const game = withPlayerPosition({ row: 5, column: 1 });
    const before = structuredClone(game);
    const fishStock = game.supplies.find((supply) => supply.good === 'FISH')?.stock;
    expect(fishStock).toBeDefined();

    const result = applyAction(game, 'PLAYER', { type: 'LOAD' });

    expect(result).toMatchObject({
      ok: true,
      game: { actionPoints: 1, players: { PLAYER: { cargo: ['FISH'] } } },
      events: [{ type: 'LOADED', round: 1, actor: 'PLAYER', good: 'FISH' }],
    });
    if (result.ok) {
      expect(result.game.supplies.find((supply) => supply.good === 'FISH')?.stock).toBe((fishStock as number) - 1);
      expect(result.game.eventLog.at(-1)).toEqual(result.events[0]);
      expect(result.events[0]?.message).toMatch(/pescado/i);
    }
    expect(game).toEqual(before);
  });

  it.each([
    ['outside a supply port', gameAtPlayerStart(), 'NOT_AT_SUPPLY_PORT'],
    ['when its supply is empty', (() => {
      const game = withPlayerPosition({ row: 5, column: 1 });
      return gameWith({
        players: game.players,
        supplies: game.supplies.map((supply) => supply.good === 'FISH' ? { ...supply, stock: 0 } : supply),
      });
    })(), 'SUPPLY_EMPTY'],
    ['when the cargo is full', withPlayer(
      { position: { row: 5, column: 1 }, cargo: ['FISH', 'SPICE', 'PEARL'] },
    ), 'CARGO_FULL'],
  ] as const)('rejects loading %s', (_name, game, code) => {
    const before = structuredClone(game);
    const result = applyAction(game, 'PLAYER', { type: 'LOAD' });
    expect(result).toMatchObject({ ok: false, error: { code } });
    expect(game).toEqual(before);
  });
});

describe('sell rules', () => {
  it('sells exactly one unit at the tide-adjusted price and raises demand', () => {
    const game = withPlayer(
      { coins: 10, cargo: ['FISH', 'PEARL', 'FISH'] },
      { tide: 'LOW', demand: { FISH: 2, SPICE: 0, PEARL: 0 } },
    );
    const before = structuredClone(game);

    const result = applyAction(game, 'PLAYER', { type: 'SELL', payload: { good: 'FISH' } });

    expect(result).toMatchObject({
      ok: true,
      game: {
        actionPoints: 1,
        demand: { FISH: 3, SPICE: 0, PEARL: 0 },
        players: { PLAYER: { coins: 13, cargo: ['PEARL', 'FISH'] } },
      },
      events: [{ type: 'SOLD', round: 1, actor: 'PLAYER', good: 'FISH', coins: 3 }],
    });
    if (result.ok) {
      expect(result.game.eventLog.at(-1)).toEqual(result.events[0]);
      expect(result.events[0]?.message).toMatch(/pescado.*3 monedas/i);
    }
    expect(game).toEqual(before);
  });

  it('never sells below one coin after demand penalties', () => {
    const game = withPlayer(
      { cargo: ['FISH'] },
      { tide: 'RISING', demand: { FISH: 20, SPICE: 0, PEARL: 0 } },
    );
    const result = applyAction(game, 'PLAYER', { type: 'SELL', payload: { good: 'FISH' } });
    expect(result).toMatchObject({ ok: true, game: { players: { PLAYER: { coins: 1 } } } });
  });

  it.each([
    ['outside a market', withPlayer({ position: { row: 6, column: 1 }, cargo: ['FISH'] }), 'NOT_AT_MARKET'],
    ['when the selected good is absent', withPlayer({ cargo: ['PEARL'] }), 'GOOD_NOT_IN_CARGO'],
  ] as const)('rejects selling %s', (_name, game, code) => {
    const before = structuredClone(game);
    const result = applyAction(game, 'PLAYER', { type: 'SELL', payload: { good: 'FISH' } });
    expect(result).toMatchObject({ ok: false, error: { code } });
    expect(game).toEqual(before);
  });
});

describe('turn ending and event log', () => {
  it('discards remaining points and records the end of the turn immutably', () => {
    const game = gameAtPlayerStart();
    const before = structuredClone(game);
    const result = applyAction(game, 'PLAYER', { type: 'END_TURN' });
    expect(result).toMatchObject({
      ok: true,
      game: { actionPoints: 0 },
      events: [{ type: 'TURN_ENDED', round: 1, actor: 'PLAYER' }],
    });
    if (result.ok) {
      expect(result.events[0]?.message).toMatch(/Marina.*turno/i);
      expect(result.game.eventLog.at(-1)).toEqual(result.events[0]);
    }
    expect(game).toEqual(before);
  });

  it('keeps only the 50 most recent events after a successful action', () => {
    const previousEvents = Array.from({ length: 50 }, (_, index) => ({
      type: 'GAME_STARTED' as const,
      round: 1,
      message: `Evento ${index}`,
    }));
    const game = gameWith({ eventLog: previousEvents });
    const result = applyAction(game, 'PLAYER', { type: 'MOVE', payload: { row: 6, column: 1 } });
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.game.eventLog).toHaveLength(50);
      expect(result.game.eventLog[0]).toEqual(previousEvents[1]);
      expect(result.game.eventLog.at(-1)).toEqual(result.events[0]);
    }
  });
});
