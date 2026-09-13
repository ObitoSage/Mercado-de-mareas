import { describe, expect, it } from 'vitest';
import { GAME_RULES, isGameAction } from './index.js';

describe('shared game contracts', () => {
  it('publishes the fixed exam rules', () => {
    expect(GAME_RULES).toEqual({ boardSize: 7, maxRounds: 10, actionsPerTurn: 2, cargoCapacity: 3 });
  });

  it('accepts only supported action payloads', () => {
    expect(isGameAction({ type: 'MOVE', payload: { row: 5, column: 1 } })).toBe(true);
    expect(isGameAction({ type: 'DELETE_GAME' })).toBe(false);
  });

  it('keeps the published rules immutable', () => {
    expect(Object.isFrozen(GAME_RULES)).toBe(true);
  });

  it.each([
    { type: 'MOVE', payload: { row: 0, column: 6 } },
    { type: 'MOVE', payload: { row: -1, column: 7 } },
    { type: 'LOAD' },
    { type: 'SELL', payload: { good: 'FISH' } },
    { type: 'SELL', payload: { good: 'SPICE' } },
    { type: 'SELL', payload: { good: 'PEARL' } },
    { type: 'END_TURN' },
  ])('accepts supported JSON action %j without applying board rules', (action) => {
    expect(isGameAction(action)).toBe(true);
  });

  it.each([
    null,
    undefined,
    true,
    1,
    'MOVE',
    [],
    {},
    { type: 1 },
    { type: 'move', payload: { row: 0, column: 1 } },
    { type: 'MOVE' },
    { type: 'MOVE', payload: null },
    { type: 'MOVE', payload: [] },
    { type: 'MOVE', payload: '0,1' },
    { type: 'MOVE', payload: { row: 0 } },
    { type: 'MOVE', payload: { column: 1 } },
    { type: 'MOVE', payload: { row: '0', column: 1 } },
    { type: 'MOVE', payload: { row: 0, column: '1' } },
    { type: 'MOVE', payload: { row: 0.5, column: 1 } },
    { type: 'MOVE', payload: { row: 0, column: 1.5 } },
    { type: 'MOVE', payload: { row: NaN, column: 1 } },
    { type: 'MOVE', payload: { row: 0, column: Infinity } },
    { type: 'MOVE', payload: { row: 0, column: 1, extra: true } },
    { type: 'MOVE', payload: { row: 0, column: 1 }, extra: true },
    { type: 'SELL' },
    { type: 'SELL', payload: null },
    { type: 'SELL', payload: [] },
    { type: 'SELL', payload: {} },
    { type: 'SELL', payload: { good: 'GOLD' } },
    { type: 'SELL', payload: { good: 'fish' } },
    { type: 'SELL', payload: { good: 1 } },
    { type: 'SELL', payload: { good: 'FISH', quantity: 2 } },
    { type: 'SELL', payload: { good: 'FISH' }, extra: true },
    { type: 'LOAD', payload: {} },
    { type: 'LOAD', extra: true },
    { type: 'END_TURN', payload: {} },
    { type: 'END_TURN', extra: true },
  ])('rejects malformed or unsupported action %j', (value) => {
    expect(isGameAction(value)).toBe(false);
  });
});
