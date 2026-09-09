/**
 * The authored opening and the endless run after it. Spec §9, §15, §25.
 *
 * Owner decision, 2026-09-09: the campaign is 9 hand-locked levels that teach
 * the three mechanics, and from level 10 onward levels are generated. There is
 * no separate Infinite mode — PLAY simply keeps going.
 *
 * Levels 1-9 are *locked content*: this module can rebuild them
 * deterministically, but the app always reads src/content/campaign.v1.json so
 * that an app update can never quietly hand players different puzzles.
 * Levels 10+ are generated from the level number, so a given level is always
 * the same puzzle and its Best stays meaningful.
 */

import {
  GENERATOR_VERSION,
  generatePuzzle,
  patternKey,
  puzzleKey,
  type GeneratedPuzzle,
  type GeneratorConstraints,
} from './generator';
import { hashString } from './rng';
import type { CellType, GridSize, LevelData } from './types';

/** How many levels are hand-authored. Everything above this is generated. */
export const CURATED_LEVEL_COUNT = 9;

/** Bump when the released level set changes. Spec §9, §16. */
export const CONTENT_VERSION = 2;

const CROSS: readonly CellType[] = ['cross'];
const CROSS_ROW: readonly CellType[] = ['cross', 'row'];
const ALL: readonly CellType[] = ['cross', 'row', 'col'];

interface LevelSpec {
  readonly gridSize: GridSize;
  readonly allowedTypes: readonly CellType[];
  /** Exact optimal move count this level must have. */
  readonly optimalMoves: number;
}

/**
 * The teaching curve. Three levels per mechanic set, so each idea gets
 * introduced, repeated and then combined before the next one arrives.
 */
const CURATED: readonly LevelSpec[] = [
  // 1-3 — CROSS only.
  { gridSize: 3, allowedTypes: CROSS, optimalMoves: 2 },
  { gridSize: 3, allowedTypes: CROSS, optimalMoves: 3 },
  { gridSize: 3, allowedTypes: CROSS, optimalMoves: 4 },
  // 4-6 — CROSS + ROW.
  { gridSize: 3, allowedTypes: CROSS_ROW, optimalMoves: 3 },
  { gridSize: 3, allowedTypes: CROSS_ROW, optimalMoves: 4 },
  { gridSize: 4, allowedTypes: CROSS_ROW, optimalMoves: 5 },
  // 7-9 — CROSS + ROW + COLUMN.
  { gridSize: 4, allowedTypes: ALL, optimalMoves: 5 },
  { gridSize: 4, allowedTypes: ALL, optimalMoves: 6 },
  { gridSize: 4, allowedTypes: ALL, optimalMoves: 7 },
];

export function isCurated(id: number): boolean {
  return id >= 1 && id <= CURATED_LEVEL_COUNT;
}

export function curatedSpec(id: number): LevelSpec {
  const spec = CURATED[id - 1];
  if (!spec) throw new Error(`No curated level ${id} (1-${CURATED_LEVEL_COUNT})`);
  return spec;
}

/**
 * Difficulty for a generated level.
 *
 * Level 10 picks up exactly where level 9 left off (4×4, 7 moves) so the seam
 * is invisible, then climbs every other level. 5×5 becomes the norm past 14,
 * with a 4×4 every fourth level for variety; each size carries its own ceiling
 * because a 4×4 has fewer distinct actions to spend.
 */
export function proceduralSpec(id: number): LevelSpec {
  const step = Math.floor((id - CURATED_LEVEL_COUNT - 1) / 2);
  const gridSize: GridSize = id <= 14 ? 4 : id % 4 === 0 ? 4 : 5;
  const optimalMoves =
    gridSize === 4 ? Math.min(7 + step, 10) : Math.min(8 + step, 15);

  return { gridSize, allowedTypes: ALL, optimalMoves };
}

export function levelSpec(id: number): LevelSpec {
  return isCurated(id) ? curatedSpec(id) : proceduralSpec(id);
}

export function levelConstraints(id: number): GeneratorConstraints {
  const spec = levelSpec(id);
  return {
    gridSize: spec.gridSize,
    allowedTypes: spec.allowedTypes,
    minOptimalMoves: spec.optimalMoves,
    maxOptimalMoves: spec.optimalMoves,
  };
}

/** Spec §25: seed derives from the level id and generator version, nothing else. */
export function seedForLevel(id: number): number {
  return hashString(`FLIP_CAMPAIGN:${id}:${GENERATOR_VERSION}`);
}

function toLevelData(id: number, puzzle: GeneratedPuzzle, contentVersion: number): LevelData {
  return {
    id,
    seed: puzzle.seed,
    gridSize: puzzle.gridSize,
    cellTypes: puzzle.cellTypes,
    initialState: puzzle.initialState,
    targetState: new Array(puzzle.gridSize * puzzle.gridSize).fill(1),
    optimalMoves: puzzle.optimalMoves,
    difficulty: puzzle.difficulty,
    optimalSolution: puzzle.optimalSolution,
    generatorVersion: puzzle.generatorVersion,
    contentVersion,
  };
}

/**
 * Rebuild the curated levels from seeds. Used by scripts/generate-campaign.ts
 * to author the locked content, and by the tests to prove the locked file still
 * matches its seeds (spec §25).
 */
export function buildCuratedLevels(): LevelData[] {
  const seenPuzzles = new Set<string>();
  const seenPatterns = new Set<string>();
  const levels: LevelData[] = [];

  for (let id = 1; id <= CURATED_LEVEL_COUNT; id++) {
    const isDuplicate = (p: GeneratedPuzzle): boolean =>
      seenPuzzles.has(puzzleKey(p)) || seenPatterns.has(patternKey(p));

    const puzzle = generatePuzzle(seedForLevel(id), levelConstraints(id), isDuplicate);
    if (!puzzle) {
      throw new Error(`Curated level ${id} could not be generated within its constraints`);
    }

    seenPuzzles.add(puzzleKey(puzzle));
    seenPatterns.add(patternKey(puzzle));
    levels.push(toLevelData(id, puzzle, CONTENT_VERSION));
  }

  return levels;
}

/**
 * Generate level 10 and beyond.
 *
 * Widens the difficulty window rather than failing: an endless progression must
 * always hand back a playable board (spec §27).
 */
export function buildProceduralLevel(id: number): LevelData {
  if (!Number.isInteger(id) || id <= CURATED_LEVEL_COUNT) {
    throw new Error(`Level ${id} is not procedural (procedural starts at ${CURATED_LEVEL_COUNT + 1})`);
  }

  const constraints = levelConstraints(id);
  const seed = seedForLevel(id);

  for (const slack of [0, 1, 2, 4]) {
    const puzzle = generatePuzzle(seed + slack, {
      ...constraints,
      minOptimalMoves: Math.max(2, constraints.minOptimalMoves - slack),
      maxOptimalMoves: constraints.maxOptimalMoves + slack,
    });
    if (puzzle) return toLevelData(id, puzzle, 0);
  }

  throw new Error(`Level ${id} could not be generated`);
}
