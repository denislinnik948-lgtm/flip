/**
 * Actions — CROSS, ROW, COLUMN (spec §4). There is no SINGLE (spec §2).
 *
 * The cell's own type decides what tapping it does; the type is fixed for the
 * level, so the whole action set of a level is known up front.
 */

import { fullMask } from './bits';
import type { CellType, GridSize } from './types';

/**
 * Cells toggled by tapping index `i`, ascending. Spec §4.
 *
 * CROSS  — (r,c) plus its four orthogonal neighbours, clipped to the board.
 * ROW    — every cell in row r.
 * COLUMN — every cell in column c.
 */
export function affectedIndices(
  cellTypes: readonly CellType[],
  size: GridSize,
  i: number,
): number[] {
  const r = Math.floor(i / size);
  const c = i % size;
  const type = cellTypes[i];

  if (type === 'row') {
    const out: number[] = [];
    for (let x = 0; x < size; x++) out.push(r * size + x);
    return out;
  }

  if (type === 'col') {
    const out: number[] = [];
    for (let y = 0; y < size; y++) out.push(y * size + c);
    return out;
  }

  // CROSS. Built in ascending index order so callers can rely on it.
  const out: number[] = [];
  if (r > 0) out.push((r - 1) * size + c);
  if (c > 0) out.push(r * size + c - 1);
  out.push(i);
  if (c < size - 1) out.push(r * size + c + 1);
  if (r < size - 1) out.push((r + 1) * size + c);
  return out;
}

/** The same action as a XOR mask over the board. */
export function actionMask(
  cellTypes: readonly CellType[],
  size: GridSize,
  i: number,
): number {
  let mask = 0;
  for (const k of affectedIndices(cellTypes, size, i)) mask |= 1 << k;
  return mask;
}

/** One tappable cell per unique effect. */
export interface DistinctAction {
  /** The XOR mask this action applies. */
  readonly mask: number;
  /** Lowest cell index producing this mask — the canonical cell to highlight. */
  readonly cellIndex: number;
  /**
   * Every cell index producing this mask. Spec §26: any tap in a ROW has the
   * same effect, so a row of ROW cells collapses to one entry here.
   */
  readonly equivalentCells: readonly number[];
}

/**
 * Deduplicate the level's actions by effect.
 *
 * This matters for optimality, not just speed: tapping two different cells that
 * share a mask costs two moves and cancels out, so an optimal solution never
 * does it. Minimum moves is therefore the minimum-weight subset of *distinct*
 * masks — which is exactly what the solver searches (spec §13).
 */
export function distinctActions(
  cellTypes: readonly CellType[],
  size: GridSize,
): DistinctAction[] {
  const byMask = new Map<number, number[]>();
  const n = size * size;

  for (let i = 0; i < n; i++) {
    const mask = actionMask(cellTypes, size, i);
    const cells = byMask.get(mask);
    if (cells) cells.push(i);
    else byMask.set(mask, [i]);
  }

  return [...byMask.entries()]
    .map(([mask, equivalentCells]) => ({
      mask,
      cellIndex: equivalentCells[0],
      equivalentCells,
    }))
    .sort((a, b) => a.cellIndex - b.cellIndex);
}

/** Board mask with every cell ON — the target state (spec §3). */
export function solvedMask(size: GridSize): number {
  return fullMask(size * size);
}
