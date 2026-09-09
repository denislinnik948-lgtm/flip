/** Spec §11, §12, §25 — Daily determinism and Infinite generation. */

import { describe, expect, it } from 'vitest';

import { actionMask } from '../src/core/actions';
import { applyMask, boardFromCells, isSolved } from '../src/core/board';
import { DAILY_CONSTRAINTS, dateKeyOf, dailySeed, generateDaily } from '../src/core/daily';
import { solve } from '../src/core/solver';
import type { LevelData } from '../src/core/types';

function assertPlayable(level: LevelData): void {
  const board = boardFromCells(level.gridSize, level.initialState);
  expect(isSolved(board)).toBe(false);

  const result = solve(board, level.cellTypes);
  expect(result.solvable).toBe(true);
  expect(result.optimalMoves).toBe(level.optimalMoves);

  const played = level.optimalSolution.reduce(
    (b, i) => applyMask(b, actionMask(level.cellTypes, level.gridSize, i)),
    board,
  );
  expect(isSolved(played)).toBe(true);
}

const DATES = ['2026-01-01', '2026-02-28', '2026-09-08', '2026-12-31', '2027-06-15'];

describe('Daily determinism (spec §11)', () => {
  it('the same date always yields the same puzzle', () => {
    for (const date of DATES) {
      expect(generateDaily(date)).toEqual(generateDaily(date));
    }
  });

  it('different dates yield different puzzles', () => {
    const keys = new Set(DATES.map((d) => generateDaily(d).initialState.join('')));
    expect(keys.size).toBe(DATES.length);
  });

  it('the seed depends only on the date and generator version', () => {
    expect(dailySeed('2026-09-08')).toBe(dailySeed('2026-09-08'));
    expect(dailySeed('2026-09-08')).not.toBe(dailySeed('2026-09-09'));
  });

  it('rejects a malformed date rather than silently seeding off junk', () => {
    expect(() => generateDaily('08-09-2026')).toThrow(/YYYY-MM-DD/);
    expect(() => generateDaily('')).toThrow(/YYYY-MM-DD/);
  });

  it('uses the local calendar date, so Daily rolls over at the player\'s midnight', () => {
    expect(dateKeyOf(new Date(2026, 8, 8, 0, 0, 0))).toBe('2026-09-08');
    expect(dateKeyOf(new Date(2026, 8, 8, 23, 59, 59))).toBe('2026-09-08');
    expect(dateKeyOf(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

describe('Daily puzzles are playable', () => {
  it('across a full year of dates', () => {
    const start = new Date(2026, 0, 1);
    for (let day = 0; day < 365; day += 7) {
      const date = new Date(start.getTime());
      date.setDate(start.getDate() + day);
      const level = generateDaily(dateKeyOf(date));

      assertPlayable(level);
      expect(level.gridSize).toBe(DAILY_CONSTRAINTS.gridSize);
      expect(level.optimalMoves).toBeGreaterThanOrEqual(DAILY_CONSTRAINTS.minOptimalMoves);
      expect(level.optimalMoves).toBeLessThanOrEqual(DAILY_CONSTRAINTS.maxOptimalMoves);
    }
  });

  it('does not affect campaign progression (spec §11)', () => {
    // Daily levels carry id 0 and contentVersion 0 so they can never be
    // mistaken for a campaign level by the progress layer.
    const level = generateDaily('2026-09-08');
    expect(level.id).toBe(0);
  });
});

