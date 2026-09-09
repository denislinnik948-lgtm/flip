/**
 * Deterministic pseudo-randomness. Spec §25.
 *
 * Same seed always yields the same stream, on every platform and every run.
 * Nothing here may be replaced with Math.random() — generated content is
 * reproducible content.
 */

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Next integer in [0, bound). */
  int(bound: number): number;
  /** Fisher-Yates shuffle of a copy. */
  shuffle<T>(items: readonly T[]): T[];
  /** Pick by weight; weights need not sum to 1. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T;
}

/** mulberry32 — small, fast, and good enough for content generation. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (bound: number): number => Math.floor(next() * bound);

  return {
    next,
    int,
    shuffle<T>(items: readonly T[]): T[] {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
    weighted<T>(entries: readonly (readonly [T, number])[]): T {
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [value, weight] of entries) {
        roll -= weight;
        if (roll < 0) return value;
      }
      return entries[entries.length - 1][0];
    },
  };
}

/**
 * FNV-1a. Stable across platforms and versions — this is what turns a Daily
 * date string into a seed (spec §11), so it must never be "improved".
 */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
