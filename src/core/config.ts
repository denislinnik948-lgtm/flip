/**
 * Fixed game configuration that is part of the determinism contract (spec §25).
 *
 * Lives apart from the modules that consume it so that content-authoring
 * scripts can read the configuration without importing the generated content
 * those modules depend on.
 *
 * Changing anything here changes every future generated puzzle — treat it as a
 * generator version bump.
 */

import type { GeneratorConstraints } from './generator';

/** Spec §11. Daily is always the same shape and band, whatever the date. */
export const DAILY_CONSTRAINTS: GeneratorConstraints = {
  gridSize: 4,
  allowedTypes: ['cross', 'row', 'col'],
  minOptimalMoves: 5,
  maxOptimalMoves: 7,
};

/**
 * Move limit = optimal × this. Owner decision, 2026-09-09.
 *
 * Running out of moves is a loss, and the only loss state in the game. Four
 * times optimal is deliberately generous: a player who understands the board
 * will never see it, while aimless tapping runs out. It scales with the puzzle
 * rather than being a flat number, so a 2-move opener and a 15-move 5×5 are
 * equally forgiving in proportion.
 */
export const MOVE_LIMIT_MULTIPLIER = 4;

export function moveLimitFor(optimalMoves: number): number {
  return optimalMoves * MOVE_LIMIT_MULTIPLIER;
}
