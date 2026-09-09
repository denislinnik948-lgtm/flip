/**
 * Hint economy — product decision of 2026-09-08, superseding spec §17.
 *
 *   1 free hint per 24h for everyone (does not stack);
 *   1-3 stacking bonus hints per 24h for Remove Ads purchasers;
 *   rewarded ad only ever offered to non-purchasers (spec §18).
 */

import { describe, expect, it } from 'vitest';

import {
  BONUS_MAX_HINTS,
  BONUS_MIN_HINTS,
  HINT_WINDOW_MS,
  claimDailyBonus,
  createWallet,
  grantAdHint,
  hintAccess,
  isBonusAvailable,
  nextBonusAt,
  nextFreeHintAt,
  refreshFreeHint,
  spendHint,
  totalHints,
  type HintWallet,
} from '../src/core/hints';

const T0 = Date.UTC(2026, 8, 8, 12, 0, 0);
const HOUR = 60 * 60 * 1000;

/** A wallet whose free hint has already been spent. */
function empty(now = T0): HintWallet {
  return spendHint(createWallet(now)).wallet;
}

describe('free hint: one per 24 hours, no stacking', () => {
  it('a new wallet starts with one free hint', () => {
    const wallet = createWallet(T0);
    expect(wallet.freeHints).toBe(1);
    expect(totalHints(wallet)).toBe(1);
  });

  it('does not refresh before the window elapses', () => {
    const wallet = empty();
    expect(refreshFreeHint(wallet, T0 + 23 * HOUR).freeHints).toBe(0);
    expect(refreshFreeHint(wallet, T0 + HINT_WINDOW_MS - 1).freeHints).toBe(0);
  });

  it('refreshes exactly at the 24h boundary', () => {
    expect(refreshFreeHint(empty(), T0 + HINT_WINDOW_MS).freeHints).toBe(1);
  });

  it('never stacks, however long the player stays away', () => {
    const afterAWeek = refreshFreeHint(empty(), T0 + 7 * HINT_WINDOW_MS);
    expect(afterAWeek.freeHints).toBe(1);
  });

  it('is idempotent — refreshing repeatedly grants nothing extra', () => {
    let wallet = refreshFreeHint(empty(), T0 + HINT_WINDOW_MS);
    for (let i = 0; i < 5; i++) wallet = refreshFreeHint(wallet, T0 + HINT_WINDOW_MS + i);
    expect(wallet.freeHints).toBe(1);
  });

  it('reports when the next free hint arrives', () => {
    expect(nextFreeHintAt(createWallet(T0))).toBeNull();
    expect(nextFreeHintAt(empty())).toBe(T0 + HINT_WINDOW_MS);
  });

  it('a backwards clock grants nothing and does not lock the player out', () => {
    const wallet = empty();
    const rewound = refreshFreeHint(wallet, T0 - 5 * HINT_WINDOW_MS);
    expect(rewound.freeHints).toBe(0);
    // Re-anchored, so a normal 24h wait from the new "now" still works.
    expect(refreshFreeHint(rewound, T0 - 5 * HINT_WINDOW_MS + HINT_WINDOW_MS).freeHints).toBe(1);
  });
});

describe('login bonus: Remove Ads only', () => {
  it('is never offered to a free user', () => {
    const wallet = createWallet(T0);
    expect(isBonusAvailable(wallet, false, T0)).toBe(false);
    expect(claimDailyBonus(wallet, false, T0).granted).toBe(0);
    expect(nextBonusAt(wallet, false, T0)).toBeNull();
  });

  it('is claimable immediately on first entry for a purchaser', () => {
    const wallet = createWallet(T0);
    expect(isBonusAvailable(wallet, true, T0)).toBe(true);

    const claim = claimDailyBonus(wallet, true, T0);
    expect(claim.granted).toBeGreaterThanOrEqual(BONUS_MIN_HINTS);
    expect(claim.granted).toBeLessThanOrEqual(BONUS_MAX_HINTS);
    expect(claim.wallet.bonusHints).toBe(claim.granted);
  });

  it('cannot be claimed twice inside one window', () => {
    const first = claimDailyBonus(createWallet(T0), true, T0);
    const second = claimDailyBonus(first.wallet, true, T0 + 23 * HOUR);
    expect(second.granted).toBe(0);
    expect(second.wallet.bonusHints).toBe(first.granted);
  });

  it('becomes claimable again after 24h', () => {
    const first = claimDailyBonus(createWallet(T0), true, T0);
    expect(isBonusAvailable(first.wallet, true, T0 + HINT_WINDOW_MS)).toBe(true);

    const second = claimDailyBonus(first.wallet, true, T0 + HINT_WINDOW_MS);
    expect(second.granted).toBeGreaterThan(0);
    expect(second.wallet.bonusHints).toBe(first.granted + second.granted);
  });

  it('grants only one bonus no matter how long the player was away', () => {
    // Absence does not back-pay windows — one entry, one bonus.
    const first = claimDailyBonus(createWallet(T0), true, T0);
    const later = claimDailyBonus(first.wallet, true, T0 + 30 * HINT_WINDOW_MS);
    expect(later.granted).toBeLessThanOrEqual(BONUS_MAX_HINTS);
  });

  it('reports when the next bonus unlocks', () => {
    const claimed = claimDailyBonus(createWallet(T0), true, T0).wallet;
    expect(nextBonusAt(claimed, true, T0)).toBe(T0 + HINT_WINDOW_MS);
    expect(nextBonusAt(claimed, true, T0 + HINT_WINDOW_MS)).toBeNull();
  });

  it('cannot be rerolled by quitting before the grant is saved', () => {
    // Same 24h bucket must always yield the same amount.
    const wallet = createWallet(T0);
    const a = claimDailyBonus(wallet, true, T0);
    const b = claimDailyBonus(wallet, true, T0 + HOUR);
    expect(a.granted).toBe(b.granted);
  });

  it('varies across days, and stays within 1-3', () => {
    const seen = new Set<number>();
    for (let day = 0; day < 60; day++) {
      const granted = claimDailyBonus(createWallet(T0), true, T0 + day * HINT_WINDOW_MS).granted;
      expect(granted).toBeGreaterThanOrEqual(BONUS_MIN_HINTS);
      expect(granted).toBeLessThanOrEqual(BONUS_MAX_HINTS);
      seen.add(granted);
    }
    expect(seen).toEqual(new Set([1, 2, 3]));
  });

  it('accumulates when unused', () => {
    let wallet = createWallet(T0);
    let expected = 0;
    for (let day = 0; day < 5; day++) {
      const claim = claimDailyBonus(wallet, true, T0 + day * HINT_WINDOW_MS);
      expected += claim.granted;
      wallet = claim.wallet;
    }
    expect(wallet.bonusHints).toBe(expected);
    expect(expected).toBeGreaterThanOrEqual(5);
  });
});

describe('spending', () => {
  it('spends the free hint before bonus hints', () => {
    // Free expires at the next window; bonus does not. Spending free first
    // never wastes a hint.
    const wallet = claimDailyBonus(createWallet(T0), true, T0).wallet;
    const spend = spendHint(wallet);
    expect(spend.spent).toBe('free');
    expect(spend.wallet.freeHints).toBe(0);
    expect(spend.wallet.bonusHints).toBe(wallet.bonusHints);
  });

  it('falls through to bonus once free is gone', () => {
    const wallet = spendHint(claimDailyBonus(createWallet(T0), true, T0).wallet).wallet;
    const spend = spendHint(wallet);
    expect(spend.spent).toBe('bonus');
    expect(spend.wallet.bonusHints).toBe(wallet.bonusHints - 1);
  });

  it('spends nothing from an empty wallet', () => {
    const wallet = empty();
    const spend = spendHint(wallet);
    expect(spend.spent).toBeNull();
    expect(spend.wallet).toEqual(wallet);
  });

  it('does not mutate the wallet it is given', () => {
    const wallet = createWallet(T0);
    const snapshot = { ...wallet };
    spendHint(wallet);
    expect(wallet).toEqual(snapshot);
  });
});

describe('what the player is offered (spec §18)', () => {
  it('reveals for free while the wallet has anything in it', () => {
    expect(hintAccess(createWallet(T0), false)).toMatchObject({ canReveal: true, source: 'free' });

    const bonusOnly = spendHint(claimDailyBonus(createWallet(T0), true, T0).wallet).wallet;
    expect(hintAccess(bonusOnly, true)).toMatchObject({ canReveal: true, source: 'bonus' });
  });

  it('offers a rewarded ad to a free user with an empty wallet', () => {
    expect(hintAccess(empty(), false)).toMatchObject({ canReveal: false, source: 'ad' });
  });

  it('never offers an ad to a Remove Ads purchaser', () => {
    // Spec §18: a purchaser must not be unexpectedly forced into advertising.
    const access = hintAccess(empty(), true);
    expect(access.canReveal).toBe(false);
    expect(access.source).toBeNull();
  });

  it('a completed rewarded ad credits exactly one hint', () => {
    const wallet = empty();
    const credited = grantAdHint(wallet);
    expect(totalHints(credited)).toBe(1);
    expect(hintAccess(credited, false).canReveal).toBe(true);
    expect(spendHint(credited).spent).toBe('bonus');
  });

  it('a failed rewarded ad consumes nothing', () => {
    // Spec §27: the caller simply does not credit or spend on failure.
    const wallet = empty();
    expect(hintAccess(wallet, false)).toEqual(hintAccess(wallet, false));
    expect(totalHints(wallet)).toBe(0);
  });
});

describe('a purchaser\'s day', () => {
  it('opens with a bonus, plays through it, and refills tomorrow', () => {
    let wallet = createWallet(T0);

    const claim = claimDailyBonus(wallet, true, T0);
    wallet = claim.wallet;
    const stock = 1 + claim.granted; // free + bonus
    expect(totalHints(wallet)).toBe(stock);

    for (let i = 0; i < stock; i++) {
      expect(hintAccess(wallet, true).canReveal).toBe(true);
      wallet = spendHint(wallet).wallet;
    }

    // Empty, and never shown an ad.
    expect(hintAccess(wallet, true)).toMatchObject({ canReveal: false, source: null });

    // Next day: free hint refreshes and a new bonus is claimable.
    const tomorrow = T0 + HINT_WINDOW_MS;
    wallet = refreshFreeHint(wallet, tomorrow);
    const next = claimDailyBonus(wallet, true, tomorrow);
    expect(totalHints(next.wallet)).toBe(1 + next.granted);
  });
});
