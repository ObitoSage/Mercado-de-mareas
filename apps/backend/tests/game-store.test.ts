import { describe, expect, it } from 'vitest';
import { createGameStore } from '../src/game-store.js';
import { applyAction } from '../src/domain/rules.js';

describe('createGameStore', () => {
  it('creates and retrieves independent games', () => {
    const store = createGameStore();
    const game = store.create({ playerName: 'Marina', seed: 1209 });
    expect(store.get(game.id)).toEqual(game);
    expect(store.get('missing')).toBeUndefined();
    const other = store.create({ playerName: 'Marina', seed: 1209 });
    expect(other.id).not.toBe(game.id);
    expect(game.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
    expect(other.board).not.toBe(game.board);
    expect(other.players.PLAYER.cargo).not.toBe(game.players.PLAYER.cargo);
    expect(other.supplies).toEqual(game.supplies);
    expect(other.tide).toBe(game.tide);
  });

  it('creates a seed and default captain when optional input is omitted', () => {
    const game = createGameStore().create({});
    expect(Number.isInteger(game.seed)).toBe(true);
    expect(game.seed).toBeGreaterThanOrEqual(0);
    expect(game.seed).toBeLessThan(2 ** 32);
    expect(game.players.PLAYER.name).toBe('Capitana');
    expect(game.board).toHaveLength(49);
  });

  it.each([0, -1, 1209])('preserves the explicit seed %i', (seed) => {
    expect(createGameStore().create({ seed }).seed).toBe(seed);
  });

  it('saves the new state by id without changing another game or the old snapshot', () => {
    const store = createGameStore();
    const game = store.create({ seed: 1209 });
    const other = store.create({ seed: 1209 });
    const before = structuredClone(game);
    const moved = applyAction(game, 'PLAYER', { type: 'MOVE', payload: { row: 6, column: 1 } });
    if (!moved.ok) throw new Error(moved.error.message);
    store.save(moved.game);
    expect(store.get(game.id)).toEqual(moved.game);
    expect(store.get(other.id)).toEqual(other);
    expect(game).toEqual(before);
  });

  it('keeps each store private and independent', () => {
    const first = createGameStore();
    const game = first.create({});
    expect(createGameStore().get(game.id)).toBeUndefined();
    expect(Object.keys(first).sort()).toEqual(['create', 'get', 'save']);
  });
});
