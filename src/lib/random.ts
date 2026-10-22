/**
 * random.ts
 * ---------
 * A small, seedable, deterministic pseudo-random generator (mulberry32) plus a
 * string-to-seed hash. Used so that "same seed + same inputs => same results",
 * which is a hard requirement of the simulation.
 *
 * Do NOT use Math.random() anywhere in the simulation; route all randomness
 * through a seeded generator derived from GameState.gameId so playthroughs are
 * reproducible.
 */

/** A pure function returning the next float in [0, 1) and the next state. */
export interface Rng {
  /** Return a float in [0, 1). Advances internal state. */
  next(): number;
  /** Return an integer in [minInclusive, maxInclusive]. */
  nextInt(minInclusive: number, maxInclusive: number): number;
  /** The current raw state (useful for persistence/debugging). */
  state(): number;
}

/** Hash an arbitrary string into a 32-bit unsigned integer seed. */
export function hashStringToSeed(input: string): number {
  let h = 2166136261 >>> 0; // FNV-1a offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Create a mulberry32 RNG from a numeric or string seed. */
export function createRng(seed: number | string): Rng {
  let a = (typeof seed === 'string' ? hashStringToSeed(seed) : seed) >>> 0;

  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    nextInt(minInclusive: number, maxInclusive: number): number {
      if (maxInclusive < minInclusive) {
        throw new RangeError('max must be >= min');
      }
      const span = maxInclusive - minInclusive + 1;
      return minInclusive + Math.floor(next() * span);
    },
    state(): number {
      return a >>> 0;
    },
  };
}

/**
 * Convenience function for one-off seeded random values.
 * Returns a float in [0, 1).
 */
export function seededRandom(seed: number | string): number {
  const rng = createRng(seed);
  return rng.next();
}
