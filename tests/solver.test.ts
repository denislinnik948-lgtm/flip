/**
 * Spec §26 — Solver: solvability, optimality on small boards, and that the
 * returned solution actually solves.
 *
 * Optimality is checked against an independent breadth-first search rather than
 * against the solver's own reasoning (spec §13).
 */

import { describe, expect, it } from 'vitest';

import { actionMask } from '../src/core/actions';
import { applyMask, fromMask, isSolved, solvedBoard } from '../src/core/board';
import { createRng } from '../src/core/rng';
import { bruteForceSolve, isSolvable, solve } from '../src/core/solver';
import type { Board, CellType, GridSize } from '../src/core/types';

function uniform(size: GridSize, type: CellType): CellType[] {
  return new Array<CellType>(size * size).fill(type);
}

/** Plays a solution and asserts the board ends all-ON. */
function playsOut(board: Board, cellTypes: readonly CellType[], solution: readonly number[]): boolean {
  const final = solution.reduce(
    (b, i) => applyMask(b, actionMask(cellTypes, board.size, i)),
    board,
  );
  return isSolved(final);
}

/** Every board reachable on a 3×3, as (mask, board) pairs. */
function all3x3Boards(): Board[] {
  return Array.from({ length: 512 }, (_, mask) => fromMask(3, mask));
}

describe('solvability', () => {
  it('an already-solved board needs zero moves', () => {
    const result = solve(solvedBoard(4), uniform(4, 'cross'));
    expect(result).toEqual({ solvable: true, optimalMoves: 0, solution: [] });
  });

  it('3×3 CROSS is fully solvable — every one of the 512 boards', () => {
    // 3×3 Lights Out has a full-rank matrix, so no board is ever a dead end.
    const types = uniform(3, 'cross');
    for (const board of all3x3Boards()) {
      expect(solve(board, types).solvable).toBe(true);
    }
  });

  it('reports unsolvable boards instead of guessing', () => {
    // With only ROW actions a column can never be changed independently, so any
    // board with two differing cells in the same row is out of reach.
    const types = uniform(3, 'row');
    const board = fromMask(3, 0b111111110); // one cell OFF, alone in its row
    expect(solve(board, types).solvable).toBe(false);
    expect(isSolvable(board, types)).toBe(false);
  });

  it('isSolvable agrees with solve across all 3×3 ROW boards', () => {
    const types = uniform(3, 'row');
    for (const board of all3x3Boards()) {
      expect(isSolvable(board, types)).toBe(solve(board, types).solvable);
    }
  });
});

describe('returned solutions actually solve', () => {
  it.each([3, 4, 5] as GridSize[])('on %i×%i across mixed mechanics', (size) => {
    const rng = createRng(20260908 + size);
    for (let trial = 0; trial < 120; trial++) {
      const types = Array.from({ length: size * size }, () =>
        rng.weighted([
          ['cross', 0.5],
          ['row', 0.25],
          ['col', 0.25],
        ] as const),
      ) as CellType[];

      // Scramble from solved so the board is reachable by construction.
      let board = solvedBoard(size);
      for (let k = 0; k < 8; k++) board = applyMask(board, actionMask(types, size, rng.int(size * size)));

      const result = solve(board, types);
      expect(result.solvable).toBe(true);
      expect(playsOut(board, types, result.solution)).toBe(true);
      expect(result.solution).toHaveLength(result.optimalMoves);
      expect(new Set(result.solution).size).toBe(result.solution.length);
    }
  });
});

describe('optimality, verified by exhaustive BFS', () => {
  it('matches BFS on every 3×3 CROSS board', () => {
    const types = uniform(3, 'cross');
    for (const board of all3x3Boards()) {
      expect(solve(board, types).optimalMoves).toBe(bruteForceSolve(board, types).optimalMoves);
    }
  });

  it('matches BFS on every 3×3 board for mixed mechanic layouts', () => {
    const rng = createRng(4242);
    for (let layout = 0; layout < 12; layout++) {
      const types = Array.from({ length: 9 }, () =>
        rng.weighted([
          ['cross', 0.5],
          ['row', 0.25],
          ['col', 0.25],
        ] as const),
      ) as CellType[];

      for (const board of all3x3Boards()) {
        const gf2 = solve(board, types);
        const bfs = bruteForceSolve(board, types);
        expect(gf2.solvable).toBe(bfs.solvable);
        if (gf2.solvable) expect(gf2.optimalMoves).toBe(bfs.optimalMoves);
      }
    }
  });

  it('matches BFS on sampled 4×4 boards', () => {
    const rng = createRng(1013);
    for (let trial = 0; trial < 40; trial++) {
      const types = Array.from({ length: 16 }, () =>
        rng.weighted([
          ['cross', 0.5],
          ['row', 0.25],
          ['col', 0.25],
        ] as const),
      ) as CellType[];

      let board = solvedBoard(4);
      for (let k = 0; k < 10; k++) board = applyMask(board, actionMask(types, 4, rng.int(16)));

      const gf2 = solve(board, types);
      const bfs = bruteForceSolve(board, types);
      expect(gf2.optimalMoves).toBe(bfs.optimalMoves);
      expect(playsOut(board, types, gf2.solution)).toBe(true);
    }
  });

  it('beats the scramble length when the scramble was wasteful', () => {
    // Tapping the same cross twice cancels out (spec §5); the solver must not
    // report 4 moves for a board that is really 2 away.
    const types = uniform(4, 'cross');
    let board = solvedBoard(4);
    for (const i of [0, 5, 0, 5, 9, 12]) board = applyMask(board, actionMask(types, 4, i));
    const result = solve(board, types);
    expect(result.optimalMoves).toBe(2);
    expect(result.solution).toEqual([9, 12]);
  });

  it('never counts two taps that share one effect', () => {
    // Both cells in row 0 drive the same ROW action, so the optimum uses one.
    const types: CellType[] = [
      'row', 'row', 'row', 'row',
      'cross', 'cross', 'cross', 'cross',
      'cross', 'cross', 'cross', 'cross',
      'cross', 'cross', 'cross', 'cross',
    ];
    const board = applyMask(solvedBoard(4), actionMask(types, 4, 1));
    const result = solve(board, types);
    expect(result.optimalMoves).toBe(1);
    expect(result.solution).toEqual([0]); // canonical cell for the row action
  });
});

describe('bruteForceSolve guard', () => {
  it('refuses 5×5, where the state space is 32M', () => {
    expect(() => bruteForceSolve(solvedBoard(5), uniform(5, 'cross'))).toThrow(/5×5/);
  });
});
