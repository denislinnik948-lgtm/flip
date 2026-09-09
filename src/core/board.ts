/**
 * Board construction, conversion and solved detection. Spec §3.
 */

import { bitIndices, fullMask } from './bits';
import type { Board, CellState, GridSize } from './types';

export const GRID_SIZES: readonly GridSize[] = [3, 4, 5];

export function isGridSize(n: number): n is GridSize {
  return n === 3 || n === 4 || n === 5;
}

/** A board with every cell ON — the target state and the generator's origin (spec §14). */
export function solvedBoard(size: GridSize): Board {
  return { size, cells: new Array<CellState>(size * size).fill(1) };
}

export function boardFromCells(size: GridSize, cells: readonly CellState[]): Board {
  if (cells.length !== size * size) {
    throw new Error(`Board ${size}×${size} needs ${size * size} cells, got ${cells.length}`);
  }
  return { size, cells: [...cells] };
}

/** Pack a board into a bitmask, bit i set when cell i is ON. */
export function toMask(board: Board): number {
  let mask = 0;
  for (let i = 0; i < board.cells.length; i++) {
    if (board.cells[i] === 1) mask |= 1 << i;
  }
  return mask;
}

export function fromMask(size: GridSize, mask: number): Board {
  const n = size * size;
  const cells = new Array<CellState>(n).fill(0);
  for (const i of bitIndices(mask & fullMask(n))) cells[i] = 1;
  return { size, cells };
}

/** Spec §3: solved when every cell is ON. */
export function isSolved(board: Board): boolean {
  return board.cells.every((c) => c === 1);
}

/** Spec §5: apply a XOR mask. Applying the same mask twice restores the board. */
export function applyMask(board: Board, mask: number): Board {
  return fromMask(board.size, toMask(board) ^ mask);
}

/** Cells that still need to change to reach the all-ON target. */
export function remainingMask(board: Board): number {
  return fullMask(board.cells.length) & ~toMask(board);
}
