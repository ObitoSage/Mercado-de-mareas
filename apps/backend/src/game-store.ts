import { randomInt, randomUUID } from 'node:crypto';
import type { CreateGameRequest, GameState } from '@mercado/shared';
import { createGame } from './domain/create-game.js';

export interface GameStore {
  create(input: CreateGameRequest): GameState;
  get(id: string): GameState | undefined;
  save(game: GameState): void;
}

export function createGameStore(): GameStore {
  const games = new Map<string, GameState>();
  return {
    create(input) {
      const game = createGame({
        id: randomUUID(),
        playerName: input.playerName ?? '',
        seed: input.seed ?? randomInt(0, 2 ** 32),
      });
      games.set(game.id, game);
      return game;
    },
    get: (id) => games.get(id),
    save(game) {
      games.set(game.id, game);
    },
  };
}
