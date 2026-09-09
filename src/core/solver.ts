/**
 * Solver. Spec §13.
 *
 * Solvability and the solution family come from GF(2) elimination; the optimal
 * move count comes from searching that family for the minimum-weight member.
 */

import { distinctActions, type DistinctAction } from './actions';
import { bitIndices, popcount } from './bits';
import { isSolved, remainingMask, toMask } from './board';
import { solveGf2 } from './gf2';
import type { Board, CellType, GridSize } from './types';

export interface SolveResult {
  readonly solvable: boolean;
  /** Fewest taps that reach the all-ON target. 0 when already solved. */
  readonly optimalMoves: number;
  /**
   * One optimal solution, as cell indices to tap, ascending.
   * Actions commute and are self-inverse (spec §5), so order does not matter
   * and the set never contains a repeat.
   */
  readonly solution: readonly number[];
}

const UNSOLVABLE: SolveResult = { solvable: false, optimalMoves: 0, solution: [] };

/**
 * Solve the board to all-ON.
 *
 * Cost note: after dedup there are at most 25 distinct action masks, and k
 * distinct non-zero vectors need rank >= log2(k+1), so the null space is at
 * most 20-dimensional. The enumeration below is therefore bounded by ~2^20
 * single-XOR steps even in the worst case, and is far smaller in practice.
 */
export function solve(board: Board, cellTypes: readonly CellType[]): SolveResult {
  if (isSolved(board)) return { solvable: true, optimalMoves: 0, solution: [] };

  const actions = distinctActions(cellTypes, board.size);
  const { solvable, particular, nullBasis } = solveGf2(
    actions.map((a) => a.mask),
    remainingMask(board),
    board.cells.length,
  );
  if (!solvable) return UNSOLVABLE;

  const best = minimumWeight(particular, nullBasis);
  return {
    solvable: true,
    optimalMoves: popcount(best),
    solution: toCellIndices(best, actions),
  };
}

/** Whether the board can be solved at all — cheaper than asking for the move count. */
export function isSolvable(board: Board, cellTypes: readonly CellType[]): boolean {
  if (isSolved(board)) return true;
  const actions = distinctActions(cellTypes, board.size);
  return solveGf2(
    actions.map((a) => a.mask),
    remainingMask(board),
    board.cells.length,
  ).solvable;
}

/**
 * Walk every solution (particular XOR each subset of the null basis) and keep
 * the one using the fewest actions. Gray-code order means each candidate costs
 * a single XOR rather than rebuilding the subset.
 */
function minimumWeight(particular: number, nullBasis: readonly number[]): number {
  let best = particular;
  let bestWeight = popcount(particular);
  if (nullBasis.length === 0) return best;

  let current = particular;
  const total = 2 ** nullBasis.length;
  for (let i = 1; i < total; i++) {
    // Gray code: successive values differ in exactly the lowest set bit of i.
    current ^= nullBasis[31 - Math.clz32(i & -i)];
    const weight = popcount(current);
    if (weight < bestWeight) {
      bestWeight = weight;
      best = current;
    }
  }
  return best;
}

/** Map a solution vector over distinct actions back to tappable cell indices. */
function toCellIndices(vector: number, actions: readonly DistinctAction[]): number[] {
  return bitIndices(vector)
    .map((j) => actions[j].cellIndex)
    .sort((a, b) => a - b);
}

/**
 * Independent breadth-first optimal search, used by the tests to verify the
 * GF(2) solver's optimality claims (spec §13, §26).
 *
 * Explores the 2^(size²) state space, so it is only practical for 3×3 and 4×4.
 */
export function bruteForceSolve(board: Board, cellTypes: readonly CellType[]): SolveResult {
  if (board.size > 4) {
    throw new Error('bruteForceSolve is a 3×3/4×4 verification aid; 5×5 needs 32M states');
  }
  const actions = distinctActions(cellTypes, board.size);
  const target = (1 << board.cells.length) - 1;
  const start = toMask(board);
  if (start === target) return { solvable: true, optimalMoves: 0, solution: [] };

  // cameFrom[state] = index of the action that first reached it, +1 (0 = unseen).
  const cameFrom = new Int8Array(1 << board.cells.length);
  cameFrom[start] = -1;
  let frontier = [start];
  let depth = 0;

  while (frontier.length > 0) {
    depth++;
    const next: number[] = [];
    for (const state of frontier) {
      for (let j = 0; j < actions.length; j++) {
        const moved = state ^ actions[j].mask;
        if (cameFrom[moved] !== 0) continue;
        cameFrom[moved] = j + 1;
        if (moved === target) {
          return {
            solvable: true,
            optimalMoves: depth,
            solution: reconstruct(moved, start, cameFrom, actions),
          };
        }
        next.push(moved);
      }
    }
    frontier = next;
  }

  return UNSOLVABLE;
}

function reconstruct(
  target: number,
  start: number,
  cameFrom: Int8Array,
  actions: readonly DistinctAction[],
): number[] {
  const path: number[] = [];
  let state = target;
  while (state !== start) {
    const action = actions[cameFrom[state] - 1];
    path.push(action.cellIndex);
    state ^= action.mask;
  }
  return path.sort((a, b) => a - b);
}

/** Convenience for callers that hold cell types and a raw size. */
export function solveCells(
  size: GridSize,
  cellTypes: readonly CellType[],
  cells: Board['cells'],
): SolveResult {
  return solve({ size, cells }, cellTypes);
}
