import { describe, expect, it } from 'vitest';
import type { Position, Tile } from '@mercado/shared';
import { createGame } from '../src/domain/create-game.js';
import { createBoard } from '../src/domain/board.js';
import { createSeededRandom } from '../src/domain/random.js';
import { aiAtMarketWithCargo, aiAtSupplyPort, gameAtPlayerStart, gameWith } from './fixtures.js';

describe('createGame', () => {
  it('creates the same variable state for the same seed', () => {
    const a = createGame({ id: 'a', playerName: 'Marina', seed: 1209 });
    const b = createGame({ id: 'b', playerName: 'Marina', seed: 1209 });
    expect({ tide: a.tide, supplies: a.supplies }).toEqual({ tide: b.tide, supplies: b.supplies });
  });

  it('creates a valid 7 by 7 starting state', () => {
    const game = createGame({ id: 'game-1', playerName: 'Marina', seed: 7 });
    expect(game.board).toHaveLength(49);
    expect(game.round).toBe(1);
    expect(game.phase).toBe('PLAYER_TURN');
    expect(game.actionPoints).toBe(2);
    expect(game.players.PLAYER.position).toEqual({ row: 6, column: 0 });
    expect(game.players.AI.position).toEqual({ row: 0, column: 6 });
  });

  it('initializes both traders and the complete official state', () => {
    const game = createGame({ id: 'game-1', playerName: 'Marina', seed: 7 });
    expect(game).toMatchObject({
      id: 'game-1', seed: 7, activeActor: 'PLAYER', result: null,
      prices: { FISH: 3, SPICE: 5, PEARL: 7 },
      demand: { FISH: 0, SPICE: 0, PEARL: 0 },
      players: {
        PLAYER: { id: 'PLAYER', kind: 'HUMAN', name: 'Marina', coins: 0, cargo: [], cargoCapacity: 3 },
        AI: { id: 'AI', kind: 'BOT', coins: 0, cargo: [], cargoCapacity: 3 },
      },
    });
    expect(game.players.AI.name.length).toBeGreaterThan(0);
    expect(game.eventLog).toHaveLength(1);
    expect(game.eventLog[0]).toMatchObject({ type: 'GAME_STARTED', round: 1 });
    expect(game.eventLog[0]?.message.length).toBeGreaterThan(0);
    expect(game.supplies.map(({ position, good }) => ({ position, good }))).toEqual([
      { position: { row: 1, column: 5 }, good: 'SPICE' },
      { position: { row: 3, column: 3 }, good: 'PEARL' },
      { position: { row: 5, column: 1 }, good: 'FISH' },
    ]);
  });

  it.each([
    [0, 'LOW'], [1, 'RISING'], [2, 'HIGH'], [3, 'FALLING'], [8, 'LOW'],
  ])('starts seed %i at tide %s', (seed, tide) => {
    expect(createGame({ id: 'game', playerName: 'Marina', seed: Number(seed) }).tide).toBe(tide);
  });

  it.each([
    ['', 'Capitana'], ['   ', 'Capitana'], ['  Marina  ', 'Marina'],
    ['A'.repeat(31), 'A'.repeat(30)],
  ])('normalizes the captain name %j', (playerName, expected) => {
    expect(createGame({ id: 'game', playerName, seed: 7 }).players.PLAYER.name).toBe(expected);
  });

  it('keeps newly created games independent', () => {
    const a = createGame({ id: 'a', playerName: 'Marina', seed: 7 });
    const b = createGame({ id: 'b', playerName: 'Marina', seed: 7 });
    expect(a.board[0]).not.toBe(b.board[0]);
    expect(a.board[0]?.position).not.toBe(b.board[0]?.position);
    expect(a.players.PLAYER.cargo).not.toBe(b.players.PLAYER.cargo);
    expect(a.players.PLAYER.position).not.toBe(b.players.PLAYER.position);
    expect(a.players.PLAYER.cargo).not.toBe(a.players.AI.cargo);
    expect(a.supplies[0]).not.toBe(b.supplies[0]);
    expect(a.prices).not.toBe(b.prices);
    expect(a.demand).not.toBe(b.demand);
    expect(a.eventLog).not.toBe(b.eventLog);
  });

  it.each([0, 1, 7, 8, 1209, 0xffffffff])('keeps initial supplies within capacity for seed %i', (seed) => {
    const game = createGame({ id: 'game', playerName: 'Marina', seed });
    expect(game.supplies).toHaveLength(3);
    for (const supply of game.supplies) {
      expect(Number.isInteger(supply.stock)).toBe(true);
      expect(supply.stock).toBeGreaterThanOrEqual(2);
      expect(supply.stock).toBeLessThanOrEqual(4);
    }
  });

  it('varies the tide or supplies between seeds 7 and 8', () => {
    const a = createGame({ id: 'a', playerName: 'Marina', seed: 7 });
    const b = createGame({ id: 'b', playerName: 'Marina', seed: 8 });
    expect({ tide: a.tide, supplies: a.supplies }).not.toEqual({ tide: b.tide, supplies: b.supplies });
  });

  it.each([[-1, 'FALLING'], [-4, 'LOW'], [-5, 'FALLING']] as const)(
    'keeps an integer seed %i on the tide cycle', (seed, tide) => {
      expect(createGame({ id: 'game', playerName: 'Marina', seed }).tide).toBe(tide);
    },
  );
});

function reachablePositions(board: readonly Tile[], start: Position, blocked?: Position): Set<string> {
  const key = ({ row, column }: Position): string => `${row},${column}`;
  const available = new Set(board
    .filter((tile) => tile.kind !== 'ISLAND' && (!blocked || key(tile.position) !== key(blocked)))
    .map((tile) => key(tile.position)));
  const visited = new Set([key(start)]);
  const queue = [start];
  for (const { row, column } of queue) {
    for (const next of [
      { row: row - 1, column }, { row: row + 1, column },
      { row, column: column - 1 }, { row, column: column + 1 },
    ]) {
      if (available.has(key(next)) && !visited.has(key(next))) {
        visited.add(key(next));
        queue.push(next);
      }
    }
  }
  return visited;
}

describe('createBoard', () => {
  it('creates the approved map with each coordinate exactly once', () => {
    const board = createBoard();
    const symbols = { SEA: 'W', ISLAND: 'I', REEF: 'R', MARKET_PORT: 'M' } as const;
    const goods = { FISH: 'F', SPICE: 'S', PEARL: 'P' } as const;
    const rows = Array.from({ length: 7 }, (_, row) => board
      .filter((tile) => tile.position.row === row)
      .map((tile) => tile.kind === 'SUPPLY_PORT' && tile.supplyGood
        ? goods[tile.supplyGood] : symbols[tile.kind as keyof typeof symbols])
      .join(''));
    expect(rows).toEqual(['WWIWWWM', 'WWWWWSW', 'WWRRRWW', 'WIWPWIW', 'WWRRRWW', 'WFWWWWW', 'MWWWIWW']);
    expect(board.map((tile) => tile.position)).toEqual(Array.from({ length: 49 }, (_, index) => ({
      row: Math.floor(index / 7), column: index % 7,
    })));
    expect(board.filter((tile) => tile.kind !== 'SUPPLY_PORT').every((tile) => !('supplyGood' in tile))).toBe(true);
  });

  it('connects all navigable tiles during high tide', () => {
    const board = createBoard();
    expect(reachablePositions(board, { row: 6, column: 0 }).size)
      .toBe(board.filter((tile) => tile.kind !== 'ISLAND').length);
  });

  it('keeps an alternate high-tide route from either market to every other port', () => {
    const board = createBoard();
    const ports = board.filter((tile) => tile.kind === 'MARKET_PORT' || tile.kind === 'SUPPLY_PORT');
    for (const start of [{ row: 6, column: 0 }, { row: 0, column: 6 }]) {
      for (const blocked of board.filter((tile) => tile.kind !== 'ISLAND')) {
        if (blocked.position.row === start.row && blocked.position.column === start.column) continue;
        const reachable = reachablePositions(board, start, blocked.position);
        for (const port of ports) {
          if (port === blocked) continue;
          expect(reachable.has(`${port.position.row},${port.position.column}`)).toBe(true);
        }
      }
    }
  });
});

describe('createSeededRandom', () => {
  it('produces the specified xorshift32 sequence', () => {
    const random = createSeededRandom(1);
    expect([random.next(), random.next(), random.next()]).toEqual([
      270369 / 4_294_967_296, 67634689 / 4_294_967_296, 2647435461 / 4_294_967_296,
    ]);
  });

  it('uses a nonzero reproducible fallback for seed zero', () => {
    const a = createSeededRandom(0);
    const b = createSeededRandom(0);
    const values = Array.from({ length: 10 }, () => a.next());
    expect(values).toEqual(Array.from({ length: 10 }, () => b.next()));
    expect(values.every((value) => value > 0 && value < 1)).toBe(true);
  });

  it('generates inclusive integers and selects members using the seeded stream', () => {
    const random = createSeededRandom(1);
    expect(random.integer(2, 4)).toBe(2);
    expect(random.pick(['FISH', 'SPICE', 'PEARL'])).toBe('FISH');
    expect(random.pick(['FISH', 'SPICE', 'PEARL'])).toBe('SPICE');
    const integers = Array.from({ length: 100 }, () => random.integer(2, 4));
    expect(new Set(integers)).toEqual(new Set([2, 3, 4]));
    expect(random.integer(4, 4)).toBe(4);
  });
});

describe('backend fixtures', () => {
  it('starts each fixture from the specified seeded game', () => {
    expect(gameAtPlayerStart()).toEqual(createGame({ id: 'test-game', playerName: 'Marina', seed: 1209 }));
  });

  it('copies nested overrides without sharing them with the source', () => {
    const original = gameAtPlayerStart();
    const before = structuredClone(original);
    const game = gameWith({ round: 3, players: original.players, supplies: original.supplies });
    expect(game.round).toBe(3);
    expect(game.players).toEqual(original.players);
    expect(game.players.AI.position).not.toBe(original.players.AI.position);
    expect(game.players.AI.cargo).not.toBe(original.players.AI.cargo);
    expect(game.supplies[0]?.position).not.toBe(original.supplies[0]?.position);
    expect(original).toEqual(before);
    expect(gameAtPlayerStart().round).toBe(1);
  });

  it('places an active rival at market with a copied cargo', () => {
    const cargo = ['FISH', 'PEARL'] as const;
    const game = aiAtMarketWithCargo(cargo);
    expect(game).toMatchObject({ phase: 'RESOLVING_AI', activeActor: 'AI', actionPoints: 2 });
    expect(game.players.AI.position).toEqual({ row: 0, column: 6 });
    expect(game.players.AI.cargo).toEqual(['FISH', 'PEARL']);
    expect(game.players.AI.cargo).not.toBe(cargo);
    expect(gameAtPlayerStart().players.AI.cargo).toEqual([]);
  });

  it.each([
    ['FISH', { row: 5, column: 1 }],
    ['SPICE', { row: 1, column: 5 }],
    ['PEARL', { row: 3, column: 3 }],
  ] as const)('places the active rival at the %s supply port', (good, position) => {
    const game = aiAtSupplyPort(good);
    expect(game).toMatchObject({ phase: 'RESOLVING_AI', activeActor: 'AI', actionPoints: 2 });
    expect(game.players.AI.position).toEqual(position);
    expect(game.players.AI.cargo).toEqual([]);
    const supply = game.supplies.find((item) => item.good === good);
    expect(supply?.stock).toBeGreaterThanOrEqual(2);
    expect(game.players.AI.position).not.toBe(supply?.position);
  });
});
