/**
 * Daily FLIP. Spec §11, §25, §27.
 *
 * One puzzle per calendar date. The same date, generator version and
 * configuration must always yield the same puzzle — so the seed derives from
 * nothing but those three things, and the difficulty band is a constant rather
 * than something that drifts with player progress.
 */

import { DAILY_CONSTRAINTS } from './config';
import { GENERATOR_VERSION, generatePuzzle } from './generator';
import { hashString } from './rng';
import fallback from '../content/daily-fallback.v1.json' with { type: 'json' };
import type { CellState, CellType, GridSize, LevelData } from './types';

export { DAILY_CONSTRAINTS };

/** ISO calendar date, YYYY-MM-DD. */
export type DateKey = string;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar date — Daily rolls over at the player's midnight, not UTC. */
export function dateKeyOf(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Spec §11: hash("FLIP_DAILY:" + YYYY-MM-DD + generatorVersion). */
export function dailySeed(date: DateKey): number {
  return hashString(`FLIP_DAILY:${date}:${GENERATOR_VERSION}`);
}

/**
 * The Daily puzzle for a date.
 *
 * Spec §27: if generation ever fails, fall back to the versioned puzzle in
 * src/content rather than leaving the player with no Daily. The fallback is
 * committed content precisely so this path is deterministic too.
 */
export function generateDaily(date: DateKey): LevelData {
  if (!DATE_KEY.test(date)) throw new Error(`Daily date must be YYYY-MM-DD, got "${date}"`);

  const cellCount = DAILY_CONSTRAINTS.gridSize * DAILY_CONSTRAINTS.gridSize;
  const puzzle = generatePuzzle(dailySeed(date), DAILY_CONSTRAINTS);

  if (!puzzle) {
    return {
      ...(fallback.puzzle as {
        gridSize: GridSize;
        cellTypes: CellType[];
        initialState: CellState[];
        optimalMoves: number;
        difficulty: LevelData['difficulty'];
        optimalSolution: number[];
      }),
      id: 0,
      seed: dailySeed(date),
      targetState: new Array<CellState>(cellCount).fill(1),
      generatorVersion: fallback.generatorVersion,
      contentVersion: fallback.contentVersion,
    };
  }

  return {
    id: 0,
    seed: puzzle.seed,
    gridSize: puzzle.gridSize,
    cellTypes: puzzle.cellTypes,
    initialState: puzzle.initialState,
    targetState: new Array<CellState>(cellCount).fill(1),
    optimalMoves: puzzle.optimalMoves,
    difficulty: puzzle.difficulty,
    optimalSolution: puzzle.optimalSolution,
    generatorVersion: puzzle.generatorVersion,
    contentVersion: 0,
  };
}
