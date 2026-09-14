import { describe, expect, it } from 'vitest';
import type { GameResult, GameState } from '@mercado/shared';
import { getSalePrice } from '../src/domain/market.js';
import { advanceAfterAiTurn, finishGame } from '../src/domain/turns.js';
import { gameWith } from './fixtures.js';

function gameAtAiTurn(overrides: Partial<GameState> = {}): GameState {
  return gameWith({
    phase: 'RESOLVING_AI',
    activeActor: 'AI',
    actionPoints: 0,
    ...overrides,
  });
}

describe('market prices', () => {
  it.each([
    ['LOW', 'FISH', 5],
    ['RISING', 'SPICE', 6],
    ['HIGH', 'PEARL', 9],
    ['FALLING', 'SPICE', 6],
  ] as const)('prices %s %s at %i before demand', (tide, good, expected) => {
    expect(getSalePrice(gameWith({ tide }), good)).toBe(expected);
  });

  it.each([
    ['LOW', 'SPICE', 5],
    ['LOW', 'PEARL', 7],
    ['RISING', 'FISH', 3],
    ['RISING', 'PEARL', 7],
    ['HIGH', 'FISH', 3],
    ['HIGH', 'SPICE', 5],
    ['FALLING', 'FISH', 3],
    ['FALLING', 'PEARL', 7],
  ] as const)('does not apply an unrelated %s bonus to %s', (tide, good, expected) => {
    expect(getSalePrice(gameWith({ tide }), good)).toBe(expected);
  });

  it('subtracts round demand without falling below one coin', () => {
    expect(getSalePrice(gameWith({
      tide: 'LOW',
      demand: { FISH: 3, SPICE: 0, PEARL: 0 },
    }), 'FISH')).toBe(2);
    expect(getSalePrice(gameWith({
      tide: 'RISING',
      demand: { FISH: 20, SPICE: 0, PEARL: 0 },
    }), 'FISH')).toBe(1);
  });
});

describe('advanceAfterAiTurn', () => {
  it.each([
    ['LOW', 'RISING'],
    ['RISING', 'HIGH'],
    ['HIGH', 'FALLING'],
    ['FALLING', 'LOW'],
  ] as const)('advances tide %s to %s and starts the next player round', (tide, nextTide) => {
    const game = gameAtAiTurn({
      round: 4,
      tide,
      demand: { FISH: 2, SPICE: 3, PEARL: 4 },
    });
    const before = structuredClone(game);

    const result = advanceAfterAiTurn(game);

    expect(result).toMatchObject({
      round: 5,
      tide: nextTide,
      phase: 'PLAYER_TURN',
      activeActor: 'PLAYER',
      actionPoints: 2,
      demand: { FISH: 0, SPICE: 0, PEARL: 0 },
    });
    expect(result.eventLog.some((event) =>
      event.type === 'TIDE_CHANGED' && event.round === 5 && event.tide === nextTide)).toBe(true);
    expect(game).toEqual(before);
  });

  it('restocks the deterministically selected eligible port by one unit', () => {
    const supplies = gameAtAiTurn().supplies.map((supply) => ({ ...supply, stock: 3 }));
    const game = gameAtAiTurn({ seed: 10_651, round: 1, supplies });

    const a = advanceAfterAiTurn(game);
    const b = advanceAfterAiTurn(game);

    expect(a).toEqual(b);
    expect(a.supplies.map(({ good, stock }) => ({ good, stock }))).toEqual([
      { good: 'SPICE', stock: 3 },
      { good: 'PEARL', stock: 3 },
      { good: 'FISH', stock: 4 },
    ]);
    expect(a.eventLog.at(-1)).toMatchObject({
      type: 'RESTOCKED', round: 2, good: 'FISH', position: { row: 5, column: 1 },
    });
  });

  it('selects only ports below capacity', () => {
    const supplies = gameAtAiTurn().supplies.map((supply) => ({
      ...supply,
      stock: supply.good === 'PEARL' ? 2 : 4,
    }));
    const result = advanceAfterAiTurn(gameAtAiTurn({ supplies }));
    expect(result.supplies.map(({ good, stock }) => ({ good, stock }))).toEqual([
      { good: 'SPICE', stock: 4 },
      { good: 'PEARL', stock: 3 },
      { good: 'FISH', stock: 4 },
    ]);
  });

  it('records that no restock was needed when every port is full', () => {
    const supplies = gameAtAiTurn().supplies.map((supply) => ({ ...supply, stock: 4 }));
    const result = advanceAfterAiTurn(gameAtAiTurn({ supplies }));
    expect(result.supplies).toEqual(supplies);
    expect(result.eventLog.at(-1)).toMatchObject({ type: 'TIDE_CHANGED', round: 2 });
    expect(result.eventLog.at(-1)?.message).toMatch(/no fue necesaria.*reposici[oó]n/i);
    expect(result.eventLog.some((event) => event.type === 'RESTOCKED' && event.round === 2)).toBe(false);
  });

  it('finishes instead of advancing after the AI turn in round ten', () => {
    const result = advanceAfterAiTurn(gameAtAiTurn({ round: 10 }));
    expect(result).toMatchObject({ round: 10, phase: 'FINISHED', actionPoints: 0 });
    expect(result.eventLog.at(-1)).toMatchObject({ type: 'GAME_FINISHED', round: 10 });
  });
});

describe('finishGame', () => {
  it.each([
    [9, 4, 'PLAYER_WIN'],
    [4, 9, 'AI_WIN'],
    [7, 7, 'DRAW'],
  ] as const)('resolves %i versus %i as %s using coins only', (playerCoins, aiCoins, kind) => {
    const base = gameAtAiTurn({ round: 10 });
    const game = gameAtAiTurn({
      round: 10,
      players: {
        PLAYER: { ...base.players.PLAYER, coins: playerCoins, cargo: ['PEARL'] },
        AI: { ...base.players.AI, coins: aiCoins, cargo: ['PEARL', 'PEARL'] },
      },
    });
    const before = structuredClone(game);

    const result = finishGame(game);
    const expectedResult: GameResult = { kind, playerCoins, aiCoins };

    expect(result).toMatchObject({
      phase: 'FINISHED',
      actionPoints: 0,
      result: expectedResult,
      players: {
        PLAYER: { coins: playerCoins, cargo: ['PEARL'] },
        AI: { coins: aiCoins, cargo: ['PEARL', 'PEARL'] },
      },
    });
    expect(result.eventLog.at(-1)).toMatchObject({
      type: 'GAME_FINISHED', round: 10, result: expectedResult,
    });
    expect(game).toEqual(before);
  });

  it('keeps the event log limited to the 50 most recent entries', () => {
    const eventLog = Array.from({ length: 50 }, (_, index) => ({
      type: 'TIDE_CHANGED' as const,
      round: index + 1,
      tide: 'LOW' as const,
      message: `Marea ${index}`,
    }));
    const result = finishGame(gameAtAiTurn({ round: 10, eventLog }));
    expect(result.eventLog).toHaveLength(50);
    expect(result.eventLog[0]).toEqual(eventLog[1]);
    expect(result.eventLog.at(-1)?.type).toBe('GAME_FINISHED');
  });
});
