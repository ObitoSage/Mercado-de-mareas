import type { Tile } from '@mercado/shared';

export const TILE_LAYOUT = [
  'WWIWWWM',
  'WWWWWSW',
  'WWRRRWW',
  'WIWPWIW',
  'WWRRRWW',
  'WFWWWWW',
  'MWWWIWW',
] as const;

const TILE_TYPES = {
  W: { kind: 'SEA' },
  I: { kind: 'ISLAND' },
  R: { kind: 'REEF' },
  M: { kind: 'MARKET_PORT' },
  F: { kind: 'SUPPLY_PORT', supplyGood: 'FISH' },
  S: { kind: 'SUPPLY_PORT', supplyGood: 'SPICE' },
  P: { kind: 'SUPPLY_PORT', supplyGood: 'PEARL' },
} as const;

export function createBoard(): readonly Tile[] {
  return TILE_LAYOUT.flatMap((line, row) => Array.from(line, (symbol, column): Tile => ({
    position: { row, column },
    ...TILE_TYPES[symbol as keyof typeof TILE_TYPES],
  })));
}
