/** Spec §26 — Board: initialization, state changes, solved detection. */

import { describe, expect, it } from 'vitest';

import {
  applyMask,
  boardFromCells,
  fromMask,
  isSolved,
  remainingMask,
  solvedBoard,
  toMask,
} from '../src/core/board';
import type { CellState, GridSize } from '../src/core/types';

const SIZES: GridSize[] = [3, 4, 5];

describe('initialization', () => {
  it.each(SIZES)('solvedBoard(%i) is all ON', (size) => {
    const board = solvedBoard(size);
    expect(board.cells).toHaveLength(size * size);
    expect(board.cells.every((c) => c === 1)).toBe(true);
  });

  it('rejects a cell count that does not match the size', () => {
    expect(() => boardFromCells(3, [1, 0, 1])).toThrow(/needs 9 cells/);
  });

  it('copies the input cells so later mutation cannot leak in', () => {
    const cells: CellState[] = [1, 0, 1, 0, 1, 0, 1, 0, 1];
    const board = boardFromCells(3, cells);
    cells[0] = 0;
    expect(board.cells[0]).toBe(1);
  });
});

describe('solved detection', () => {
  it('is solved only when every cell is ON', () => {
    expect(isSolved(solvedBoard(3))).toBe(true);
    expect(isSolved(boardFromCells(3, [1, 1, 1, 1, 0, 1, 1, 1, 1]))).toBe(false);
    expect(isSolved(boardFromCells(3, new Array<CellState>(9).fill(0)))).toBe(false);
  });

  it('an all-OFF board is not treated as solved', () => {
    // Guards against a "uniform board" shortcut — the target is all ON (spec §3).
    expect(isSolved(fromMask(4, 0))).toBe(false);
  });
});

describe('mask conversion', () => {
  it.each(SIZES)('round-trips every cell position on %i×%i', (size) => {
    const n = size * size;
    for (let i = 0; i < n; i++) {
      const cells = new Array<CellState>(n).fill(0);
      cells[i] = 1;
      const board = boardFromCells(size, cells);
      expect(toMask(board)).toBe(1 << i);
      expect(fromMask(size, toMask(board)).cells).toEqual(cells);
    }
  });

  it('remainingMask marks exactly the OFF cells', () => {
    const board = boardFromCells(3, [1, 0, 1, 0, 1, 0, 1, 1, 1]);
    expect(remainingMask(board)).toBe((1 << 1) | (1 << 3) | (1 << 5));
    expect(remainingMask(solvedBoard(3))).toBe(0);
  });
});

describe('state changes', () => {
  it('applyMask toggles exactly the masked cells', () => {
    const board = solvedBoard(3);
    const flipped = applyMask(board, 0b101);
    expect(flipped.cells).toEqual([0, 1, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('does not mutate the source board', () => {
    const board = solvedBoard(3);
    applyMask(board, 0b111111111);
    expect(isSolved(board)).toBe(true);
  });
});
