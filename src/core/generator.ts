/**
 * Puzzle generator. Spec §14, §15, §25.
 *
 * Pipeline: start all-ON, assign fixed cell types, scramble with random valid
 * actions, solve for the true optimal, then filter. Because actions are
 * self-inverse (spec §5) the scramble is itself a solution, so every candidate
 * is solvable by construction — but the scramble length is *not* the
 * difficulty (spec §13), so the optimal count is always measured, never assumed.
 */

import { distinctActions, solvedMask } from './actions';
import { fromMask } from './board';
import { popcount } from './bits';
import { createRng, hashString, type Rng } from './rng';
import { solve } from './solver';
import type { CellState, CellType, Difficulty, GridSize } from './types';

/**
 * Bump when generation logic changes. Spec §25: a bump must not silently
 * rewrite already-released content — locked levels keep their own recorded
 * version, and a Daily for a past date is reproduced with the version it used.
 */
export const GENERATOR_VERSION = 1;

export interface GeneratorConstraints {
  readonly gridSize: GridSize;
  /** Mechanics allowed for this puzzle; each one must actually appear. */
  readonly allowedTypes: readonly CellType[];
  /** Inclusive bounds on the measured optimal move count. */
  readonly minOptimalMoves: number;
  readonly maxOptimalMoves: number;
}

export interface GeneratedPuzzle {
  readonly seed: number;
  readonly gridSize: GridSize;
  readonly cellTypes: readonly CellType[];
  readonly initialState: readonly CellState[];
  readonly optimalMoves: number;
  readonly optimalSolution: readonly number[];
  readonly difficulty: Difficulty;
  readonly generatorVersion: number;
}

/** Spec §15. Provisional thresholds, tunable from real content data. */
export function classifyDifficulty(optimalMoves: number): Difficulty {
  if (optimalMoves <= 4) return 'easy';
  if (optimalMoves <= 7) return 'normal';
  if (optimalMoves <= 10) return 'hard';
  if (optimalMoves <= 13) return 'expert';
  return 'master';
}

/** Spec §14 step 9: canonical identity of a puzzle, for duplicate rejection. */
export function puzzleKey(p: {
  gridSize: GridSize;
  cellTypes: readonly CellType[];
  initialState: readonly CellState[];
}): string {
  return `${p.gridSize}|${p.cellTypes.join('')}|${p.initialState.join('')}`;
}

/**
 * Coarser key: same size and same starting pattern, regardless of mechanics.
 * Rejecting on this too keeps visually near-identical puzzles out of a set.
 */
export function patternKey(p: {
  gridSize: GridSize;
  initialState: readonly CellState[];
}): string {
  return `${p.gridSize}|${p.initialState.join('')}`;
}

const MAX_ATTEMPTS = 40000;

/**
 * Generate one puzzle matching `constraints`.
 *
 * Deterministic: the same seed, constraints and generator version always
 * produce the same puzzle, including the same rejections along the way.
 * Returns null when no candidate survives the filters.
 */
export function generatePuzzle(
  seed: number,
  constraints: GeneratorConstraints,
  isDuplicate: (p: GeneratedPuzzle) => boolean = () => false,
): GeneratedPuzzle | null {
  const { gridSize, allowedTypes, minOptimalMoves, maxOptimalMoves } = constraints;
  const cellCount = gridSize * gridSize;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createRng(hashString(`${seed}:${attempt}:${GENERATOR_VERSION}`));

    const cellTypes = assignCellTypes(rng, cellCount, allowedTypes);
    if (!usesEveryType(cellTypes, allowedTypes)) continue;

    const actions = distinctActions(cellTypes, gridSize);

    // Scramble with *distinct* actions only. Repeating one would cancel it out
    // (spec §5) and inflate the scramble without changing the board — exactly
    // the "repeated cancelling actions" spec §14 says to avoid.
    const scrambleSize = minOptimalMoves + rng.int(maxOptimalMoves - minOptimalMoves + 1);
    if (scrambleSize > actions.length) continue;
    const picked = rng.shuffle(actions).slice(0, scrambleSize);

    let mask = solvedMask(gridSize);
    for (const action of picked) mask ^= action.mask;

    // Spec §14 step 8: a board that is already solved is not a puzzle, and one
    // with a single lit-off cell reads as an accident rather than a challenge.
    const offCount = cellCount - popcount(mask);
    if (offCount < 2) continue;

    const board = fromMask(gridSize, mask);
    const result = solve(board, cellTypes);
    if (!result.solvable) continue;
    if (result.optimalMoves < minOptimalMoves || result.optimalMoves > maxOptimalMoves) continue;

    const puzzle: GeneratedPuzzle = {
      seed,
      gridSize,
      cellTypes,
      initialState: board.cells,
      optimalMoves: result.optimalMoves,
      optimalSolution: result.solution,
      difficulty: classifyDifficulty(result.optimalMoves),
      generatorVersion: GENERATOR_VERSION,
    };

    if (isDuplicate(puzzle)) continue;
    return puzzle;
  }

  return null;
}

/**
 * Assign each cell its fixed type (spec §4). CROSS stays the dominant mechanic
 * so boards keep the local, spatial feel; the other allowed types share the
 * remainder evenly.
 */
function assignCellTypes(
  rng: Rng,
  cellCount: number,
  allowedTypes: readonly CellType[],
): CellType[] {
  if (allowedTypes.length === 1) {
    return new Array<CellType>(cellCount).fill(allowedTypes[0]);
  }

  const others = allowedTypes.filter((t) => t !== 'cross');
  const weights: (readonly [CellType, number])[] = allowedTypes.includes('cross')
    ? [['cross', 0.55], ...others.map((t) => [t, 0.45 / others.length] as const)]
    : allowedTypes.map((t) => [t, 1 / allowedTypes.length] as const);

  const out: CellType[] = [];
  for (let i = 0; i < cellCount; i++) out.push(rng.weighted(weights));
  return out;
}

/** Every mechanic the level advertises must actually be present on the board. */
function usesEveryType(cellTypes: readonly CellType[], allowedTypes: readonly CellType[]): boolean {
  const present = new Set(cellTypes);
  return allowedTypes.every((t) => present.has(t));
}
