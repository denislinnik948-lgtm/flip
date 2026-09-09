/**
 * Spec §26 — CROSS (center, edge, corner, bounds), ROW, COLUMN, and the
 * self-inverse property (spec §5).
 */

import { describe, expect, it } from 'vitest';

import { actionMask, affectedIndices, distinctActions } from '../src/core/actions';
import { applyMask, solvedBoard, toMask } from '../src/core/board';
import type { CellType, GridSize } from '../src/core/types';

const SIZES: GridSize[] = [3, 4, 5];

function uniform(size: GridSize, type: CellType): CellType[] {
  return new Array<CellType>(size * size).fill(type);
}

describe('CROSS', () => {
  const cross3 = uniform(3, 'cross');

  it('center touches all five cells', () => {
    expect(affectedIndices(cross3, 3, 4)).toEqual([1, 3, 4, 5, 7]);
  });

  it('edge cell drops the out-of-bounds neighbour', () => {
    expect(affectedIndices(cross3, 3, 1)).toEqual([0, 1, 2, 4]); // top edge, no cell above
    expect(affectedIndices(cross3, 3, 3)).toEqual([0, 3, 4, 6]); // left edge, no cell left
  });

  it('corner cells touch exactly three', () => {
    expect(affectedIndices(cross3, 3, 0)).toEqual([0, 1, 3]);
    expect(affectedIndices(cross3, 3, 2)).toEqual([1, 2, 5]);
    expect(affectedIndices(cross3, 3, 6)).toEqual([3, 6, 7]);
    expect(affectedIndices(cross3, 3, 8)).toEqual([5, 7, 8]);
  });

  it('never wraps around a row edge', () => {
    // Cell 3 is the start of row 1; cell 2 is the end of row 0. A naive i-1
    // would wrap them together.
    for (const size of SIZES) {
      const types = uniform(size, 'cross');
      for (let r = 0; r < size; r++) {
        const rowStart = r * size;
        expect(affectedIndices(types, size, rowStart)).not.toContain(rowStart - 1);
        const rowEnd = r * size + size - 1;
        expect(affectedIndices(types, size, rowEnd)).not.toContain(rowEnd + 1);
      }
    }
  });

  it.each(SIZES)('stays in bounds everywhere on %i×%i', (size) => {
    const types = uniform(size, 'cross');
    const n = size * size;
    for (let i = 0; i < n; i++) {
      const affected = affectedIndices(types, size, i);
      expect(affected).toContain(i);
      expect(affected.every((k) => k >= 0 && k < n)).toBe(true);
      expect(new Set(affected).size).toBe(affected.length);
    }
  });
});

describe('ROW', () => {
  it.each(SIZES)('toggles every cell of the row on %i×%i', (size) => {
    const types = uniform(size, 'row');
    for (let r = 0; r < size; r++) {
      const expected = Array.from({ length: size }, (_, c) => r * size + c);
      expect(affectedIndices(types, size, r * size)).toEqual(expected);
    }
  });

  it.each(SIZES)('any tap in a row has the same effect on %i×%i', (size) => {
    const types = uniform(size, 'row');
    for (let r = 0; r < size; r++) {
      const reference = actionMask(types, size, r * size);
      for (let c = 1; c < size; c++) {
        expect(actionMask(types, size, r * size + c)).toBe(reference);
      }
    }
  });
});

describe('COLUMN', () => {
  it.each(SIZES)('toggles every cell of the column on %i×%i', (size) => {
    const types = uniform(size, 'col');
    for (let c = 0; c < size; c++) {
      const expected = Array.from({ length: size }, (_, r) => r * size + c);
      expect(affectedIndices(types, size, c)).toEqual(expected);
    }
  });

  it.each(SIZES)('any tap in a column has the same effect on %i×%i', (size) => {
    const types = uniform(size, 'col');
    for (let c = 0; c < size; c++) {
      const reference = actionMask(types, size, c);
      for (let r = 1; r < size; r++) {
        expect(actionMask(types, size, r * size + c)).toBe(reference);
      }
    }
  });
});

describe('cell type is per-cell, not per-board', () => {
  it('reads the tapped cell type, not its neighbours', () => {
    const types: CellType[] = ['row', 'cross', 'col', 'cross', 'cross', 'cross', 'cross', 'cross', 'cross'];
    expect(affectedIndices(types, 3, 0)).toEqual([0, 1, 2]); // row
    expect(affectedIndices(types, 3, 2)).toEqual([2, 5, 8]); // col
    expect(affectedIndices(types, 3, 1)).toEqual([0, 1, 2, 4]); // cross
  });
});

describe('self-inverse property (spec §5)', () => {
  it.each(SIZES)('applying the same action twice restores the board on %i×%i', (size) => {
    for (const type of ['cross', 'row', 'col'] as CellType[]) {
      const types = uniform(size, type);
      const n = size * size;
      for (let i = 0; i < n; i++) {
        const start = solvedBoard(size);
        const mask = actionMask(types, size, i);
        const once = applyMask(start, mask);
        const twice = applyMask(once, mask);
        expect(toMask(twice)).toBe(toMask(start));
        expect(toMask(once)).not.toBe(toMask(start));
      }
    }
  });

  it('actions commute — order never changes the result', () => {
    const types: CellType[] = ['cross', 'row', 'col', 'cross', 'row', 'col', 'cross', 'row', 'col'];
    const forward = [0, 1, 2, 5, 7].reduce(
      (b, i) => applyMask(b, actionMask(types, 3, i)),
      solvedBoard(3),
    );
    const backward = [7, 5, 2, 1, 0].reduce(
      (b, i) => applyMask(b, actionMask(types, 3, i)),
      solvedBoard(3),
    );
    expect(toMask(forward)).toBe(toMask(backward));
  });
});

describe('distinctActions', () => {
  it('collapses a full ROW board to one action per row', () => {
    const actions = distinctActions(uniform(4, 'row'), 4);
    expect(actions).toHaveLength(4);
    expect(actions.map((a) => a.cellIndex)).toEqual([0, 4, 8, 12]);
    expect(actions[0].equivalentCells).toEqual([0, 1, 2, 3]);
  });

  it('keeps every CROSS action, which are all distinct', () => {
    expect(distinctActions(uniform(5, 'cross'), 5)).toHaveLength(25);
  });

  it('never produces an empty action', () => {
    for (const size of SIZES) {
      for (const type of ['cross', 'row', 'col'] as CellType[]) {
        for (const action of distinctActions(uniform(size, type), size)) {
          expect(action.mask).not.toBe(0);
        }
      }
    }
  });
});
