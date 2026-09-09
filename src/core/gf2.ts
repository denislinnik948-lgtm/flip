/**
 * Linear algebra over GF(2). Spec §13.
 *
 * The system is A · x = b, where each column of A is one action's XOR mask over
 * the board cells, x selects which actions to play, and b is the set of cells
 * that must change. Addition is XOR, so a whole equation row (up to 25 unknowns
 * plus the constant term) fits in one 32-bit integer and elimination is just
 * XOR-ing rows together.
 */

export interface Gf2Solution {
  readonly solvable: boolean;
  /**
   * One solution, as a bitmask over action indices (free variables set to 0).
   * Zero when unsolvable.
   */
  readonly particular: number;
  /**
   * Basis of the null space, each element a bitmask over action indices.
   * Every solution is `particular` XOR some subset of these.
   */
  readonly nullBasis: readonly number[];
}

/**
 * Solve A · x = b.
 *
 * @param columns  One mask per unknown; bit r set when unknown j affects equation r.
 * @param target   The constant term b, as a mask over equations.
 * @param equations Number of equations (board cells).
 */
export function solveGf2(
  columns: readonly number[],
  target: number,
  equations: number,
): Gf2Solution {
  const unknowns = columns.length;

  // Row r holds the coefficients of every unknown in bits 0..unknowns-1, and
  // b[r] in bit `unknowns`. Building it this way keeps elimination to one XOR
  // per row and carries the augmented column along automatically.
  const rows: number[] = [];
  for (let r = 0; r < equations; r++) {
    let row = 0;
    for (let j = 0; j < unknowns; j++) {
      if ((columns[j] >>> r) & 1) row |= 1 << j;
    }
    if ((target >>> r) & 1) row |= 1 << unknowns;
    rows.push(row);
  }

  // Forward elimination to reduced row echelon form.
  const pivotOfColumn = new Int32Array(unknowns).fill(-1);
  let pivotRow = 0;
  for (let col = 0; col < unknowns && pivotRow < equations; col++) {
    let found = -1;
    for (let r = pivotRow; r < equations; r++) {
      if ((rows[r] >>> col) & 1) {
        found = r;
        break;
      }
    }
    if (found === -1) continue;

    const t = rows[pivotRow];
    rows[pivotRow] = rows[found];
    rows[found] = t;

    for (let r = 0; r < equations; r++) {
      if (r !== pivotRow && ((rows[r] >>> col) & 1)) rows[r] ^= rows[pivotRow];
    }

    pivotOfColumn[col] = pivotRow;
    pivotRow++;
  }

  // Inconsistent when a row reads 0 = 1.
  const coefficientMask = (1 << unknowns) - 1;
  for (let r = 0; r < equations; r++) {
    if ((rows[r] & coefficientMask) === 0 && ((rows[r] >>> unknowns) & 1) === 1) {
      return { solvable: false, particular: 0, nullBasis: [] };
    }
  }

  // In RREF each pivot column appears only in its own row, so the particular
  // solution (free variables = 0) is read straight off the augmented column.
  let particular = 0;
  for (let col = 0; col < unknowns; col++) {
    const pr = pivotOfColumn[col];
    if (pr !== -1 && ((rows[pr] >>> unknowns) & 1) === 1) particular |= 1 << col;
  }

  // One null-space basis vector per free variable: set that variable to 1, and
  // each pivot variable to the coefficient linking it to that free column.
  const nullBasis: number[] = [];
  for (let free = 0; free < unknowns; free++) {
    if (pivotOfColumn[free] !== -1) continue;
    let vector = 1 << free;
    for (let col = 0; col < unknowns; col++) {
      const pr = pivotOfColumn[col];
      if (pr !== -1 && ((rows[pr] >>> free) & 1) === 1) vector |= 1 << col;
    }
    nullBasis.push(vector);
  }

  return { solvable: true, particular, nullBasis };
}
