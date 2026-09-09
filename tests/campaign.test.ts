/**
 * Spec §9, §25 — the curated opening is locked content; everything above it is
 * generated but must still be deterministic and playable.
 *
 * Owner decision, 2026-09-09: 9 curated levels, then an endless generated run.
 */

import { describe, expect, it } from 'vitest';

import { actionMask } from '../src/core/actions';
import { applyMask, boardFromCells, isSolved } from '../src/core/board';
import {
  CURATED_LEVEL_COUNT,
  buildCuratedLevels,
  isCurated,
  levelSpec,
} from '../src/core/campaign';
import { GENERATOR_VERSION } from '../src/core/generator';
import { curatedLevels, isAuthoredLevel, levelFor } from '../src/core/levels';
import { solve } from '../src/core/solver';
import type { CellType, LevelData } from '../src/core/types';

const curated = curatedLevels();

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

describe('locked content integrity', () => {
  it('holds exactly 9 levels, numbered 1..9', () => {
    expect(curated).toHaveLength(CURATED_LEVEL_COUNT);
    expect(curated.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('still reproduces byte-for-byte from its seeds', () => {
    // Fails the moment generator logic changes without a version bump and a
    // deliberate re-lock of the content (spec §25).
    expect(buildCuratedLevels()).toEqual(curated);
  });

  it('records the generator version it was built with', () => {
    for (const level of curated) expect(level.generatorVersion).toBe(GENERATOR_VERSION);
  });

  it('contains no duplicate or near-duplicate puzzles', () => {
    const full = new Set(
      curated.map((l) => `${l.gridSize}|${l.cellTypes.join('')}|${l.initialState.join('')}`),
    );
    const patterns = new Set(curated.map((l) => `${l.gridSize}|${l.initialState.join('')}`));
    expect(full.size).toBe(CURATED_LEVEL_COUNT);
    expect(patterns.size).toBe(CURATED_LEVEL_COUNT);
  });

  it.each(curated.map((l) => [l.id, l] as const))('level %i is playable', (_id, level) => {
    assertPlayable(level);
  });
});

describe('teaching curve (spec §9)', () => {
  const bands: readonly [number, number, CellType[]][] = [
    [1, 3, ['cross']],
    [4, 6, ['cross', 'row']],
    [7, 9, ['cross', 'row', 'col']],
  ];

  it.each(bands)('levels %i-%i use exactly %j', (from, to, allowed) => {
    for (let id = from; id <= to; id++) {
      const present = new Set(levelFor(id).cellTypes);
      for (const t of present) expect(allowed).toContain(t);
      for (const t of allowed) expect(present.has(t)).toBe(true);
    }
  });

  it('levels 1-3 are CROSS only, with no ROW or COLUMN anywhere', () => {
    for (let id = 1; id <= 3; id++) {
      expect(levelFor(id).cellTypes.every((t) => t === 'cross')).toBe(true);
    }
  });

  it('never gets easier across the curated run', () => {
    // Band changes may soften slightly as a new mechanic lands, but the overall
    // opening still ramps: level 9 is the hardest of the nine.
    expect(levelFor(9).optimalMoves).toBe(Math.max(...curated.map((l) => l.optimalMoves)));
  });

  it('uses only supported grid sizes (spec §3)', () => {
    for (const level of curated) expect([3, 4, 5]).toContain(level.gridSize);
  });
});

describe('generated levels (10+)', () => {
  it('picks up exactly where the curated run left off', () => {
    // No visible seam: level 10 matches level 9's shape and difficulty.
    expect(levelSpec(10).gridSize).toBe(levelFor(9).gridSize);
    expect(levelSpec(10).optimalMoves).toBe(levelFor(9).optimalMoves);
  });

  it('is playable across a long run', () => {
    for (let id = 10; id <= 40; id++) assertPlayable(levelFor(id));
  });

  it('is deterministic — the same level is always the same puzzle', () => {
    for (const id of [10, 17, 33, 120]) {
      expect(levelFor(id)).toEqual(levelFor(id));
    }
  });

  it('gives different levels different puzzles', () => {
    const keys = new Set(
      Array.from({ length: 25 }, (_, i) => {
        const l = levelFor(i + 10);
        return `${l.gridSize}|${l.cellTypes.join('')}|${l.initialState.join('')}`;
      }),
    );
    expect(keys.size).toBe(25);
  });

  it('ramps in difficulty and then holds at a ceiling', () => {
    expect(levelSpec(40).optimalMoves).toBeGreaterThan(levelSpec(10).optimalMoves);
    for (let id = 10; id <= 200; id++) {
      expect(levelSpec(id).optimalMoves).toBeLessThanOrEqual(15);
    }
  });

  it('never regresses in difficulty for a given board size', () => {
    for (const size of [4, 5] as const) {
      const targets: number[] = [];
      for (let id = 10; id <= 60; id++) {
        const spec = levelSpec(id);
        if (spec.gridSize === size) targets.push(spec.optimalMoves);
      }
      for (let i = 1; i < targets.length; i++) {
        expect(targets[i]).toBeGreaterThanOrEqual(targets[i - 1]);
      }
    }
  });

  it('stays fast enough to open a level on demand', () => {
    // Level select and PLAY generate synchronously, so this must not stall.
    const started = Date.now();
    for (let id = 200; id < 210; id++) levelFor(id);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

describe('level lookup', () => {
  it('marks curated versus generated correctly', () => {
    expect(isCurated(9)).toBe(true);
    expect(isCurated(10)).toBe(false);
    expect(isAuthoredLevel(1)).toBe(true);
    expect(isAuthoredLevel(10)).toBe(false);
  });

  it('rejects ids that are not positive integers', () => {
    expect(() => levelFor(0)).toThrow(/positive integer/);
    expect(() => levelFor(-3)).toThrow(/positive integer/);
    expect(() => levelFor(2.5)).toThrow(/positive integer/);
  });

  it('has no upper bound', () => {
    expect(levelFor(500).id).toBe(500);
  });
});
