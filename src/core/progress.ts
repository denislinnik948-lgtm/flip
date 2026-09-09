/**
 * Campaign progress, Best and stars. Spec §7, §8, §10, §23.
 *
 * Pure data transforms — the storage layer is a service (spec §24) and simply
 * persists whatever CampaignProgress it is handed.
 */

export interface CampaignProgress {
  /** levelId -> fewest moves ever used. Presence means "completed". */
  readonly bests: Readonly<Record<number, number>>;
  /** levelId -> 1..3 stars, best achieved. */
  readonly stars: Readonly<Record<number, number>>;
}

export const EMPTY_PROGRESS: CampaignProgress = { bests: {}, stars: {} };

/**
 * Star thresholds.
 *
 * Not defined in the spec — §7 only requires stars to be shown and §29 that
 * they persist. This reproduces the supplied prototype's rule (3 at or under
 * par, 2 within two moves of par, otherwise 1), with par = the level's optimal
 * move count. Confirm with the product owner before release.
 */
export function starsFor(moves: number, optimalMoves: number): number {
  if (moves <= optimalMoves) return 3;
  if (moves <= optimalMoves + 2) return 2;
  return 1;
}

export function isCompleted(progress: CampaignProgress, levelId: number): boolean {
  return progress.bests[levelId] != null;
}

/**
 * Spec §10: completing level N unlocks N+1; level 1 is always open.
 *
 * There is no upper bound — the progression is endless (owner decision,
 * 2026-09-09), so any level is reachable given enough play.
 */
export function isUnlocked(progress: CampaignProgress, levelId: number): boolean {
  if (!Number.isInteger(levelId) || levelId < 1) return false;
  return levelId === 1 || isCompleted(progress, levelId - 1);
}

/**
 * Spec §10: PLAY opens the next uncompleted level. Always exists, because the
 * progression never ends.
 *
 * Scans from 1 rather than tracking a high-water mark so that a player who
 * replays and abandons an early level is still sent to the right place.
 */
export function nextUncompletedLevel(progress: CampaignProgress): number {
  let id = 1;
  while (isCompleted(progress, id)) id++;
  return id;
}

export interface CompletionResult {
  readonly progress: CampaignProgress;
  /** Whether an existing Best was beaten — drives the "NEW BEST" line (spec §7). */
  readonly isNewBest: boolean;
  readonly best: number;
  readonly stars: number;
}

/**
 * Record a completion. Spec §8: Best only ever decreases, and replaying a
 * completed level with a worse score changes nothing.
 */
export function recordCompletion(
  progress: CampaignProgress,
  levelId: number,
  moves: number,
  optimalMoves: number,
): CompletionResult {
  const previousBest = progress.bests[levelId];
  const previousStars = progress.stars[levelId] ?? 0;

  const isNewBest = previousBest != null && moves < previousBest;
  const best = previousBest == null ? moves : Math.min(previousBest, moves);
  const stars = Math.max(previousStars, starsFor(moves, optimalMoves));

  return {
    progress: {
      bests: { ...progress.bests, [levelId]: best },
      stars: { ...progress.stars, [levelId]: stars },
    },
    isNewBest,
    best,
    stars,
  };
}

/** Spec §11: Daily is tracked separately and never touches campaign progression. */
export interface DailyResult {
  readonly date: string;
  readonly moves: number;
  readonly best: number;
}

export function recordDaily(
  previous: DailyResult | null,
  date: string,
  moves: number,
): DailyResult {
  if (!previous || previous.date !== date) return { date, moves, best: moves };
  return { date, moves, best: Math.min(previous.best, moves) };
}
