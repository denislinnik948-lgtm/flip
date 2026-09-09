/**
 * Bitmask helpers.
 *
 * Boards are at most 5×5 = 25 cells (spec §3), so a whole board state fits in a
 * single 32-bit integer with bit i representing cell i. Every action is a XOR of
 * such a mask, which is what makes the self-inverse property (spec §5) and the
 * GF(2) solver (spec §13) fall out for free.
 */

/** Mask with the low `n` bits set. n <= 25 in this game, so this never overflows. */
export function fullMask(n: number): number {
  return n >= 32 ? -1 >>> 0 : (1 << n) - 1;
}

/** Number of set bits — i.e. the move count of a solution vector. */
export function popcount(x: number): number {
  let v = x >>> 0;
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  v = (v + (v >>> 4)) & 0x0f0f0f0f;
  return (v * 0x01010101) >>> 24;
}

/** Indices of the set bits, ascending. */
export function bitIndices(x: number): number[] {
  const out: number[] = [];
  let v = x >>> 0;
  while (v !== 0) {
    const lowest = v & -v;
    out.push(31 - Math.clz32(lowest));
    v ^= lowest;
  }
  return out;
}
