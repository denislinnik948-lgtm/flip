/**
 * Level access. Spec §9, §25.
 *
 * One endless progression: levels 1-9 come from the committed content file,
 * everything above is generated from the level number. Either way, asking for
 * level N twice always gives the same puzzle.
 */

import campaign from '../content/campaign.v1.json' with { type: 'json' };
import { CURATED_LEVEL_COUNT, buildProceduralLevel, isCurated } from './campaign';
import type { LevelData } from './types';

const CURATED = campaign.levels as unknown as readonly LevelData[];

if (CURATED.length !== CURATED_LEVEL_COUNT) {
  throw new Error(
    `Locked content has ${CURATED.length} levels, expected ${CURATED_LEVEL_COUNT}`,
  );
}

/**
 * Generated levels are pure functions of their id, but generation costs a few
 * milliseconds, so repeat visits (level select, replays) are memoised.
 */
const generated = new Map<number, LevelData>();

export function curatedLevels(): readonly LevelData[] {
  return CURATED;
}

/** The puzzle for level `id`. Ids are unbounded — the progression never ends. */
export function levelFor(id: number): LevelData {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`Level id must be a positive integer, got ${id}`);
  }
  if (isCurated(id)) return CURATED[id - 1];

  const cached = generated.get(id);
  if (cached) return cached;

  const level = buildProceduralLevel(id);
  generated.set(id, level);
  return level;
}

/** Whether this level is hand-authored content rather than generated. */
export function isAuthoredLevel(id: number): boolean {
  return isCurated(id);
}
