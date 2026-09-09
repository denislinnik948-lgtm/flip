/**
 * Shared core types. Spec §3, §4, §16.
 *
 * Nothing in src/core may import a UI, DOM or Node API — the core must be
 * testable headless and runnable inside React Native (spec §24).
 */

/** Spec §3: 0 = OFF, 1 = ON. */
export type CellState = 0 | 1;

/** Spec §3: the only supported board sizes. */
export type GridSize = 3 | 4 | 5;

/** Spec §4: each cell has one fixed type for the whole level. There is no SINGLE (spec §2). */
export type CellType = 'cross' | 'row' | 'col';

/** Spec §21: the symbol drawn on each cell face. */
export const CELL_SYMBOL: Record<CellType, string> = {
  cross: '+',
  row: '—',
  col: '│',
};

/** Spec §15. Internal only — never surfaced during normal gameplay. */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert' | 'master';

/**
 * A board is a flat row-major array of cells plus its size.
 * Index i maps to row Math.floor(i / size), column i % size.
 */
export interface Board {
  readonly size: GridSize;
  readonly cells: readonly CellState[];
}

/** Spec §16. */
export interface LevelData {
  readonly id: number;
  readonly seed: number;
  readonly gridSize: GridSize;
  readonly cellTypes: readonly CellType[];
  readonly initialState: readonly CellState[];
  readonly targetState: readonly CellState[];
  readonly optimalMoves: number;
  readonly difficulty: Difficulty;
  /** Spec §16 (optional): one optimal tap sequence. Order is irrelevant — actions commute. */
  readonly optimalSolution: readonly number[];
  readonly generatorVersion: number;
  readonly contentVersion: number;
}
