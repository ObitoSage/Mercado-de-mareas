import type { GameState, Good } from '@mercado/shared';
import { createGame } from '../src/domain/create-game.js';

export function gameAtPlayerStart(): GameState {
  return createGame({ id: 'test-game', playerName: 'Marina', seed: 1209 });
}

export function gameWith(overrides: Partial<GameState>): GameState {
  return structuredClone({ ...gameAtPlayerStart(), ...overrides });
}

export function aiAtMarketWithCargo(cargo: readonly Good[]): GameState {
  const game = gameAtPlayerStart();
  return {
    ...game,
    phase: 'RESOLVING_AI',
    activeActor: 'AI',
    players: {
      ...game.players,
      AI: { ...game.players.AI, cargo: [...cargo] },
    },
  };
}

export function aiAtSupplyPort(good: Good): GameState {
  const game = gameAtPlayerStart();
  const supply = game.supplies.find((item) => item.good === good);
  if (!supply) throw new Error(`Falta el puerto de ${good} en el fixture.`);

  return {
    ...game,
    phase: 'RESOLVING_AI',
    activeActor: 'AI',
    players: {
      ...game.players,
      AI: { ...game.players.AI, position: { ...supply.position } },
    },
  };
}
