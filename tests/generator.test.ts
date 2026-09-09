/** Spec §26 — Generator: solvability, constraints, deterministic output, duplicate prevention. */

import { describe, expect, it } from 'vitest';

import { boardFromCells, isSolved } from '../src/core/board';
import {
  classifyDifficulty,
  generatePuzzle,
  patternKey,
  puzzleKey,
  type GeneratedPuzzle,
  type GeneratorConstraints,
} from '../src/core/generator';
import { solve } from '../src/core/solver';
import type { CellType } from '../src/core/types';

const CONFIGS: readonly GeneratorConstraints[] = [
  { gridSize: 3, allowedTypes: ['cross'], minOptimalMoves: 2, maxOptimalMoves: 4 },
  { gridSize: 3, allowedTypes: ['cross', 'row'], minOptimalMoves: 3, maxOptimalMoves: 5 },
  { gridSize: 4, allowedTypes: ['cross', 'col'], minOptimalMoves: 5, maxOptimalMoves: 7 },
  { gridSize: 4, allowedTypes: ['cross', 'row', 'col'], minOptimalMoves: 6, maxOptimalMoves: 9 },
  { gridSize: 5, allowedTypes: ['cross', 'row', 'col'], minOptimalMoves: 10, maxOptimalMoves: 14 },
];

function generateMany(constraints: GeneratorConstraints, count: number): GeneratedPuzzle[] {
  const out: GeneratedPuzzle[] = [];
  for (let seed = 1; seed <= count; seed++) {
    const puzzle = generatePuzzle(seed * 7919, constraints);
    expect(puzzle).not.toBeNull();
    out.push(puzzle!);
  }
  return out;
}

describe('every generated puzzle is solvable (spec §14)', () => {
  it.each(CONFIGS)('for $gridSize×$gridSize / $allowedTypes', (constraints) => {
    for (const puzzle of generateMany(constraints, 20)) {
      const board = boardFromCells(puzzle.gridSize, puzzle.initialState);
      const result = solve(board, puzzle.cellTypes);
      expect(result.solvable).toBe(true);
      expect(result.optimalMoves).toBe(puzzle.optimalMoves);
    }
  });
});

describe('constraints are respected', () => {
  it.each(CONFIGS)('for $gridSize×$gridSize / $allowedTypes', (constraints) => {
    for (const puzzle of generateMany(constraints, 20)) {
      expect(puzzle.gridSize).toBe(constraints.gridSize);
      expect(puzzle.initialState).toHaveLength(constraints.gridSize ** 2);
      expect(puzzle.cellTypes).toHaveLength(constraints.gridSize ** 2);
      expect(puzzle.optimalMoves).toBeGreaterThanOrEqual(constraints.minOptimalMoves);
      expect(puzzle.optimalMoves).toBeLessThanOrEqual(constraints.maxOptimalMoves);

      // Only allowed mechanics appear, and each allowed one actually appears.
      const present = new Set<CellType>(puzzle.cellTypes);
      for (const type of present) expect(constraints.allowedTypes).toContain(type);
      for (const type of constraints.allowedTypes) expect(present.has(type)).toBe(true);
    }
  });
});

describe('quality and triviality filters (spec §14)', () => {
  it('never returns an already-solved board', () => {
    for (const constraints of CONFIGS) {
      for (const puzzle of generateMany(constraints, 20)) {
        expect(isSolved(boardFromCells(puzzle.gridSize, puzzle.initialState))).toBe(false);
      }
    }
  });

  it('leaves at least two cells OFF, so the board never reads as an accident', () => {
    for (const constraints of CONFIGS) {
      for (const puzzle of generateMany(constraints, 20)) {
        expect(puzzle.initialState.filter((c) => c === 0).length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('records an optimal solution that is genuinely optimal length', () => {
    for (const constraints of CONFIGS) {
      for (const puzzle of generateMany(constraints, 10)) {
        expect(puzzle.optimalSolution).toHaveLength(puzzle.optimalMoves);
        expect(new Set(puzzle.optimalSolution).size).toBe(puzzle.optimalMoves);
      }
    }
  });
});

describe('determinism (spec §25)', () => {
  it('same seed and constraints produce an identical puzzle', () => {
    for (const constraints of CONFIGS) {
      const a = generatePuzzle(555, constraints);
      const b = generatePuzzle(555, constraints);
      expect(a).toEqual(b);
    }
  });

  it('different seeds produce different puzzles', () => {
    const constraints = CONFIGS[3];
    const keys = new Set(generateMany(constraints, 25).map(puzzleKey));
    expect(keys.size).toBe(25);
  });

  it('rejections are deterministic too — a duplicate filter yields a stable result', () => {
    const constraints = CONFIGS[2];
    const first = generatePuzzle(31337, constraints)!;
    const reject = (p: GeneratedPuzzle) => puzzleKey(p) === puzzleKey(first);

    const a = generatePuzzle(31337, constraints, reject);
    const b = generatePuzzle(31337, constraints, reject);
    expect(a).not.toBeNull();
    expect(puzzleKey(a!)).not.toBe(puzzleKey(first));
    expect(a).toEqual(b);
  });
});

describe('duplicate prevention (spec §14 step 9)', () => {
  it('honours the caller-supplied duplicate check', () => {
    const constraints = CONFIGS[3];
    const seenPuzzles = new Set<string>();
    const seenPatterns = new Set<string>();

    for (let seed = 1; seed <= 30; seed++) {
      const puzzle = generatePuzzle(
        seed * 104729,
        constraints,
        (p) => seenPuzzles.has(puzzleKey(p)) || seenPatterns.has(patternKey(p)),
      );
      expect(puzzle).not.toBeNull();
      expect(seenPuzzles.has(puzzleKey(puzzle!))).toBe(false);
      expect(seenPatterns.has(patternKey(puzzle!))).toBe(false);
      seenPuzzles.add(puzzleKey(puzzle!));
      seenPatterns.add(patternKey(puzzle!));
    }

    expect(seenPuzzles.size).toBe(30);
  });

  it('patternKey ignores mechanics so near-duplicates collide', () => {
    const a = { gridSize: 4 as const, cellTypes: ['cross'] as CellType[], initialState: [1, 0] as (0 | 1)[] };
    const b = { gridSize: 4 as const, cellTypes: ['row'] as CellType[], initialState: [1, 0] as (0 | 1)[] };
    expect(patternKey(a)).toBe(patternKey(b));
    expect(puzzleKey(a)).not.toBe(puzzleKey(b));
  });
});

describe('difficulty classification (spec §15)', () => {
  it('maps move counts to the documented bands', () => {
    expect([2, 3, 4].map(classifyDifficulty)).toEqual(['easy', 'easy', 'easy']);
    expect([5, 6, 7].map(classifyDifficulty)).toEqual(['normal', 'normal', 'normal']);
    expect([8, 9, 10].map(classifyDifficulty)).toEqual(['hard', 'hard', 'hard']);
    expect([11, 12, 13].map(classifyDifficulty)).toEqual(['expert', 'expert', 'expert']);
    expect([14, 15, 40].map(classifyDifficulty)).toEqual(['master', 'master', 'master']);
  });
});

describe('impossible constraints', () => {
  it('returns null rather than an invalid puzzle', () => {
    // A 3×3 cannot need 20 optimal moves — there are only 9 distinct actions.
    expect(
      generatePuzzle(1, {
        gridSize: 3,
        allowedTypes: ['cross'],
        minOptimalMoves: 20,
        maxOptimalMoves: 20,
      }),
    ).toBeNull();
  });
});
