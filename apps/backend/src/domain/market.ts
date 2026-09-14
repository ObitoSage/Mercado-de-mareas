import type { GameState, Good } from '@mercado/shared';

const BASE_PRICES = { FISH: 3, SPICE: 5, PEARL: 7 } as const;

const TIDE_BONUS = {
  LOW: { FISH: 2, SPICE: 0, PEARL: 0 },
  RISING: { FISH: 0, SPICE: 1, PEARL: 0 },
  HIGH: { FISH: 0, SPICE: 0, PEARL: 2 },
  FALLING: { FISH: 0, SPICE: 1, PEARL: 0 },
} as const;

export function getSalePrice(game: GameState, good: Good): number {
  return Math.max(1, BASE_PRICES[good] + TIDE_BONUS[game.tide][good] - game.demand[good]);
}
