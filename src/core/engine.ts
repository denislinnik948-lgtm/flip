/**
 * GameEngine — one puzzle in progress. Spec §6, §7, §24.
 *
 * Holds no persistence, no ads and no rendering. Progress and Best live in
 * progress.ts.
 */

import { affectedIndices } from './actions';
import { boardFromCells, isSolved } from './board';
import { moveLimitFor } from './config';
import { solve } from './solver';
import type { Board, CellState, LevelData } from './types';

export class GameEngine {
  readonly level: LevelData;

  private cells: CellState[];
  private moveCount = 0;

  constructor(level: LevelData) {
    this.level = level;
    this.cells = [...level.initialState];
  }

  get board(): Board {
    return boardFromCells(this.level.gridSize, this.cells);
  }

  /** Spec §6: starts at 0, +1 per executed action. */
  get moves(): number {
    return this.moveCount;
  }

  /** Spec §3: every cell ON. */
  get solved(): boolean {
    return isSolved(this.board);
  }

  /**
   * Most moves allowed before the level is lost. Owner decision, 2026-09-09 —
   * the game's only fail state.
   */
  get moveLimit(): number {
    return moveLimitFor(this.level.optimalMoves);
  }

  get movesRemaining(): number {
    return Math.max(0, this.moveLimit - this.moveCount);
  }

  /**
   * Out of moves without having solved it. Solving on the very last move is a
   * win, not a loss — the check is deliberately ordered that way.
   */
  get failed(): boolean {
    return !this.solved && this.moveCount >= this.moveLimit;
  }

  /** The puzzle is over, either way. */
  get finished(): boolean {
    return this.solved || this.failed;
  }

  /**
   * Cells a tap on `index` would toggle. Spec §6: shown on press/hold.
   * Pure — the board never changes until release.
   */
  preview(index: number): number[] {
    return affectedIndices(this.level.cellTypes, this.level.gridSize, index);
  }

  /**
   * Execute the action at `index`. Spec §6: called on release, not on press.
   *
   * Returns false when the tap was ignored (out of range, or the puzzle is
   * already over) so the caller knows not to animate or count a move.
   */
  tap(index: number): boolean {
    if (this.finished) return false;
    if (!Number.isInteger(index) || index < 0 || index >= this.cells.length) return false;

    for (const i of this.preview(index)) {
      this.cells[i] = this.cells[i] === 1 ? 0 : 1;
    }
    this.moveCount++;
    return true;
  }

  /**
   * Spec §6: restore the original level board and reset the move count.
   * Best is owned by progress.ts and is deliberately untouched here.
   */
  restart(): void {
    this.cells = [...this.level.initialState];
    this.moveCount = 0;
  }

  /**
   * One optimal next move from the current position, without changing the
   * board. v1 has no HINT button (owner decision, 2026-09-08); this stays as
   * engine API because it is what v2's hint will highlight, and because the
   * tests use it to assert every position stays optimally solvable.
   */
  optimalNextMove(): number | null {
    if (this.solved) return null;
    const { solution } = solve(this.board, this.level.cellTypes);
    return solution.length > 0 ? solution[0] : null;
  }

  /** Fewest moves still needed from the current position. */
  remainingOptimalMoves(): number {
    return solve(this.board, this.level.cellTypes).optimalMoves;
  }
}
