export interface RandomSource {
  next(): number;
  integer(min: number, max: number): number;
  pick<T>(values: readonly T[]): T;
}

export function createSeededRandom(seed: number): RandomSource {
  let state = (seed >>> 0) || 0x9e3779b9;
  const next = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
  return {
    next,
    integer: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(values: readonly T[]) => values[Math.floor(next() * values.length)] as T,
  };
}
