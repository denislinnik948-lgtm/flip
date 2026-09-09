/** Spec §26 — Progress: unlock progression, Best only improves, replay. */

import { describe, expect, it } from 'vitest';

import {
  EMPTY_PROGRESS,
  isCompleted,
  isUnlocked,
  nextUncompletedLevel,
  recordCompletion,
  recordDaily,
  starsFor,
  type CampaignProgress,
} from '../src/core/progress';

function completeThrough(id: number): CampaignProgress {
  let progress = EMPTY_PROGRESS;
  for (let n = 1; n <= id; n++) progress = recordCompletion(progress, n, 10, 8).progress;
  return progress;
}

describe('unlock progression (spec §10)', () => {
  it('level 1 is open from the start, nothing else is', () => {
    expect(isUnlocked(EMPTY_PROGRESS, 1)).toBe(true);
    expect(isUnlocked(EMPTY_PROGRESS, 2)).toBe(false);
    expect(isUnlocked(EMPTY_PROGRESS, 30)).toBe(false);
  });

  it('completing N unlocks N+1 and nothing beyond', () => {
    const progress = completeThrough(3);
    expect(isUnlocked(progress, 4)).toBe(true);
    expect(isUnlocked(progress, 5)).toBe(false);
  });

  it('has no upper bound — the progression is endless', () => {
    const progress = completeThrough(30);
    expect(isUnlocked(progress, 31)).toBe(true);
    expect(isUnlocked(progress, 32)).toBe(false);
  });

  it('rejects ids that are not positive integers', () => {
    expect(isUnlocked(EMPTY_PROGRESS, 0)).toBe(false);
    expect(isUnlocked(EMPTY_PROGRESS, -1)).toBe(false);
    expect(isUnlocked(EMPTY_PROGRESS, 1.5)).toBe(false);
  });

  it('PLAY opens the next uncompleted level', () => {
    expect(nextUncompletedLevel(EMPTY_PROGRESS)).toBe(1);
    expect(nextUncompletedLevel(completeThrough(7))).toBe(8);
  });

  it('always has a next level, however far the player gets', () => {
    expect(nextUncompletedLevel(completeThrough(30))).toBe(31);
    expect(nextUncompletedLevel(completeThrough(150))).toBe(151);
  });
});

describe('Best only improves (spec §8)', () => {
  it('the first completion sets Best and is not a "new record"', () => {
    const result = recordCompletion(EMPTY_PROGRESS, 1, 9, 6);
    expect(result.best).toBe(9);
    expect(result.isNewBest).toBe(false);
  });

  it('a lower move count replaces Best and reports a record', () => {
    const first = recordCompletion(EMPTY_PROGRESS, 1, 9, 6);
    const second = recordCompletion(first.progress, 1, 7, 6);
    expect(second.best).toBe(7);
    expect(second.isNewBest).toBe(true);
  });

  it('an equal or worse replay never changes Best', () => {
    let progress = recordCompletion(EMPTY_PROGRESS, 1, 7, 6).progress;

    const equal = recordCompletion(progress, 1, 7, 6);
    expect(equal.best).toBe(7);
    expect(equal.isNewBest).toBe(false);
    progress = equal.progress;

    const worse = recordCompletion(progress, 1, 15, 6);
    expect(worse.best).toBe(7);
    expect(worse.isNewBest).toBe(false);
    expect(worse.progress.bests[1]).toBe(7);
  });

  it('Best is monotonic across a long run of replays', () => {
    let progress = EMPTY_PROGRESS;
    let best = Infinity;
    for (const moves of [12, 9, 14, 9, 8, 20, 8, 6, 11]) {
      const result = recordCompletion(progress, 4, moves, 6);
      best = Math.min(best, moves);
      expect(result.best).toBe(best);
      progress = result.progress;
    }
    expect(progress.bests[4]).toBe(6);
  });

  it('does not mutate the progress it is given', () => {
    const before = recordCompletion(EMPTY_PROGRESS, 1, 9, 6).progress;
    const snapshot = JSON.stringify(before);
    recordCompletion(before, 1, 4, 6);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('replay (spec §8)', () => {
  it('completed levels stay unlocked and replayable', () => {
    const progress = completeThrough(5);
    for (let id = 1; id <= 5; id++) {
      expect(isCompleted(progress, id)).toBe(true);
      expect(isUnlocked(progress, id)).toBe(true);
    }
  });

  it('replaying an early level does not disturb later progress', () => {
    const progress = completeThrough(6);
    const after = recordCompletion(progress, 2, 99, 8).progress;
    expect(nextUncompletedLevel(after)).toBe(7);
    expect(after.bests[6]).toBe(progress.bests[6]);
  });
});

describe('stars', () => {
  it('awards 3 at or under par, 2 within two of par, else 1', () => {
    expect(starsFor(5, 6)).toBe(3);
    expect(starsFor(6, 6)).toBe(3);
    expect(starsFor(7, 6)).toBe(2);
    expect(starsFor(8, 6)).toBe(2);
    expect(starsFor(9, 6)).toBe(1);
    expect(starsFor(40, 6)).toBe(1);
  });

  it('keeps the best star rating across replays', () => {
    let progress = recordCompletion(EMPTY_PROGRESS, 1, 6, 6).progress;
    expect(progress.stars[1]).toBe(3);
    progress = recordCompletion(progress, 1, 30, 6).progress;
    expect(progress.stars[1]).toBe(3);
  });

  it('does not block progression (spec §7)', () => {
    // One star is still a completion, so the next level unlocks.
    const progress = recordCompletion(EMPTY_PROGRESS, 1, 99, 3).progress;
    expect(progress.stars[1]).toBe(1);
    expect(isUnlocked(progress, 2)).toBe(true);
  });
});

describe('Daily results (spec §11)', () => {
  it('the first play of a date sets both moves and Best', () => {
    expect(recordDaily(null, '2026-09-08', 9)).toEqual({
      date: '2026-09-08',
      moves: 9,
      best: 9,
    });
  });

  it('replaying the same date improves Best but never worsens it', () => {
    const first = recordDaily(null, '2026-09-08', 9);
    expect(recordDaily(first, '2026-09-08', 7).best).toBe(7);
    expect(recordDaily(first, '2026-09-08', 12).best).toBe(9);
  });

  it('a new date starts fresh', () => {
    const yesterday = recordDaily(null, '2026-09-07', 4);
    expect(recordDaily(yesterday, '2026-09-08', 11)).toEqual({
      date: '2026-09-08',
      moves: 11,
      best: 11,
    });
  });
});
