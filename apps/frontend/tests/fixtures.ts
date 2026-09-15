import type { GameState, Good, Tile, TileKind } from '@mercado/shared';

export function createGameFixture(overrides: Partial<GameState> = {}): GameState {
  const layout = ['WWIWWWM', 'WWWWWSW', 'WWRRRWW', 'WIWPWIW', 'WWRRRWW', 'WFWWWWW', 'MWWWIWW'];
  const kinds: Record<string, TileKind> = { W: 'SEA', I: 'ISLAND', R: 'REEF', M: 'MARKET_PORT', F: 'SUPPLY_PORT', S: 'SUPPLY_PORT', P: 'SUPPLY_PORT' };
  const goods: Partial<Record<string, Good>> = { F: 'FISH', S: 'SPICE', P: 'PEARL' };
  const board: Tile[] = layout.flatMap((line, row) => [...line].map((symbol, column) => {
    const kind = kinds[symbol];
    if (!kind) throw new Error(`Casilla desconocida: ${symbol}`);
    const good = goods[symbol];
    return { position: { row, column }, kind, ...(good ? { supplyGood: good } : {}) };
  }));
  const game: GameState = {
    id: 'game-1', seed: 1209, board, round: 1, tide: 'RISING', phase: 'PLAYER_TURN', activeActor: 'PLAYER', actionPoints: 2,
    players: {
      PLAYER: { id: 'PLAYER', kind: 'HUMAN', name: 'Marina', position: { row: 6, column: 0 }, coins: 0, cargo: [], cargoCapacity: 3 },
      AI: { id: 'AI', kind: 'BOT', name: 'Rival', position: { row: 0, column: 6 }, coins: 0, cargo: [], cargoCapacity: 3 },
    },
    supplies: board.flatMap((tile) => tile.supplyGood ? [{ position: tile.position, good: tile.supplyGood, stock: 3 }] : []),
    prices: { FISH: 3, SPICE: 5, PEARL: 7 }, demand: { FISH: 0, SPICE: 0, PEARL: 0 }, result: null,
    eventLog: [{ type: 'GAME_STARTED', round: 1, message: 'Comienza la partida.' }],
  };
  return structuredClone({ ...game, ...overrides });
}
