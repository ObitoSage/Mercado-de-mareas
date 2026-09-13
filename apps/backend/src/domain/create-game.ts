import { GAME_RULES } from '@mercado/shared';
import type { GameState, Tide } from '@mercado/shared';
import { createBoard } from './board.js';
import { createSeededRandom } from './random.js';

const TIDES = ['LOW', 'RISING', 'HIGH', 'FALLING'] as const;

export function createGame(input: { id: string; playerName: string; seed: number }): GameState {
  const board = createBoard();
  const random = createSeededRandom(input.seed);

  return {
    id: input.id,
    seed: input.seed,
    board,
    round: 1,
    tide: TIDES[((input.seed % 4) + 4) % 4] as Tide,
    phase: 'PLAYER_TURN',
    activeActor: 'PLAYER',
    actionPoints: GAME_RULES.actionsPerTurn,
    players: {
      PLAYER: {
        id: 'PLAYER', kind: 'HUMAN',
        name: input.playerName.trim().slice(0, 30) || 'Capitana',
        position: { row: 6, column: 0 },
        coins: 0, cargo: [], cargoCapacity: GAME_RULES.cargoCapacity,
      },
      AI: {
        id: 'AI', kind: 'BOT', name: 'Rival',
        position: { row: 0, column: 6 },
        coins: 0, cargo: [], cargoCapacity: GAME_RULES.cargoCapacity,
      },
    },
    supplies: board.flatMap((tile) => tile.supplyGood ? [{
      position: { ...tile.position }, good: tile.supplyGood, stock: random.integer(2, 4),
    }] : []),
    prices: { FISH: 3, SPICE: 5, PEARL: 7 },
    demand: { FISH: 0, SPICE: 0, PEARL: 0 },
    result: null,
    eventLog: [{ type: 'GAME_STARTED', round: 1, message: 'Comienza la partida. Es el turno de la capitana.' }],
  };
}
