/**
 * Hint economy.
 *
 * PRODUCT DECISION (owner, 2026-09-08) — supersedes spec §17's "first hint per
 * game is free, every later one is a rewarded ad":
 *
 *   - Everyone gets 1 free hint per 24 hours. It does not stack: use it or lose
 *     it when the window rolls over.
 *   - Remove Ads purchasers additionally get a login bonus of 1-3 hints, once
 *     per 24 hours, claimed on entering the app. Bonus hints DO stack.
 *   - With an empty wallet, free users may watch a rewarded ad for one hint.
 *     Purchasers are never offered one — spec §18: "a Remove Ads purchaser
 *     should not be unexpectedly forced into advertising."
 *
 * Windows are rolling 24h from the last grant, not calendar days — deliberately
 * different from Daily FLIP (spec §11), which is calendar-based.
 *
 * This wallet is app-wide and persisted (spec §23). It is not per level and not
 * per session, so GameEngine deliberately does not own it.
 */

import { createRng, hashString } from './rng';

export const HINT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Inclusive bounds of the Remove Ads login bonus. */
export const BONUS_MIN_HINTS = 1;
export const BONUS_MAX_HINTS = 3;

/** The free hint refreshes to this and never accumulates beyond it. */
export const FREE_HINT_CAP = 1;

export interface HintWallet {
  /** 0 or 1. Refreshes to FREE_HINT_CAP once per window. */
  readonly freeHints: number;
  /** Epoch ms of the last free-hint refresh. */
  readonly freeRefreshedAt: number;
  /** Accumulated login-bonus hints. Remove Ads only; uncapped. */
  readonly bonusHints: number;
  /** Epoch ms of the last claimed bonus, or null if never claimed. */
  readonly bonusClaimedAt: number | null;
}

export function createWallet(now: number): HintWallet {
  return { freeHints: FREE_HINT_CAP, freeRefreshedAt: now, bonusHints: 0, bonusClaimedAt: null };
}

export function totalHints(wallet: HintWallet): number {
  return wallet.freeHints + wallet.bonusHints;
}

/**
 * Roll the free hint forward if its window has elapsed. Idempotent — safe to
 * call on every app resume and every screen entry.
 *
 * A timestamp in the future means the device clock moved backwards (or was
 * tampered with). We re-anchor to now rather than granting anything, so the
 * player can neither farm hints nor get stuck waiting out a bogus window.
 */
export function refreshFreeHint(wallet: HintWallet, now: number): HintWallet {
  if (now < wallet.freeRefreshedAt) {
    return { ...wallet, freeRefreshedAt: now };
  }
  if (now - wallet.freeRefreshedAt < HINT_WINDOW_MS) return wallet;
  return { ...wallet, freeHints: FREE_HINT_CAP, freeRefreshedAt: now };
}

/** Epoch ms when the free hint next becomes available, or null if one is in hand. */
export function nextFreeHintAt(wallet: HintWallet): number | null {
  if (wallet.freeHints >= FREE_HINT_CAP) return null;
  return wallet.freeRefreshedAt + HINT_WINDOW_MS;
}

/** Spec §18: the login bonus belongs to Remove Ads purchasers only. */
export function isBonusAvailable(wallet: HintWallet, hasRemoveAds: boolean, now: number): boolean {
  if (!hasRemoveAds) return false;
  if (wallet.bonusClaimedAt === null) return true;
  if (now < wallet.bonusClaimedAt) return true; // clock moved back; do not lock the player out
  return now - wallet.bonusClaimedAt >= HINT_WINDOW_MS;
}

/** Epoch ms when the next login bonus unlocks, or null if one is claimable now. */
export function nextBonusAt(wallet: HintWallet, hasRemoveAds: boolean, now: number): number | null {
  if (!hasRemoveAds) return null;
  if (isBonusAvailable(wallet, hasRemoveAds, now)) return null;
  return (wallet.bonusClaimedAt ?? now) + HINT_WINDOW_MS;
}

export interface BonusClaim {
  readonly wallet: HintWallet;
  /** Hints granted, 0 when the bonus was not available. */
  readonly granted: number;
}

/**
 * Claim the daily login bonus.
 *
 * The amount is seeded from the 24h bucket `now` falls in, so it is fixed for a
 * given day rather than rerolled: quitting the app before the grant is
 * persisted and reopening cannot fish for a better number.
 */
export function claimDailyBonus(
  wallet: HintWallet,
  hasRemoveAds: boolean,
  now: number,
): BonusClaim {
  if (!isBonusAvailable(wallet, hasRemoveAds, now)) return { wallet, granted: 0 };

  const bucket = Math.floor(now / HINT_WINDOW_MS);
  const rng = createRng(hashString(`FLIP_HINT_BONUS:${bucket}`));
  const granted = BONUS_MIN_HINTS + rng.int(BONUS_MAX_HINTS - BONUS_MIN_HINTS + 1);

  return {
    wallet: { ...wallet, bonusHints: wallet.bonusHints + granted, bonusClaimedAt: now },
    granted,
  };
}

export type HintSource = 'free' | 'bonus' | 'ad';

export interface HintAccess {
  /** A hint can be revealed right now at no cost. */
  readonly canReveal: boolean;
  /** Where the next hint would come from, or null if none is obtainable. */
  readonly source: HintSource | null;
  readonly freeHints: number;
  readonly bonusHints: number;
}

/**
 * What the player can do about a hint right now.
 *
 * With an empty wallet a free user is offered a rewarded ad; a purchaser is
 * offered nothing and simply waits for the next window (spec §18).
 */
export function hintAccess(wallet: HintWallet, hasRemoveAds: boolean): HintAccess {
  const base = { freeHints: wallet.freeHints, bonusHints: wallet.bonusHints };

  if (wallet.freeHints > 0) return { canReveal: true, source: 'free', ...base };
  if (wallet.bonusHints > 0) return { canReveal: true, source: 'bonus', ...base };
  if (!hasRemoveAds) return { canReveal: false, source: 'ad', ...base };
  return { canReveal: false, source: null, ...base };
}

export interface HintSpend {
  readonly wallet: HintWallet;
  /** Which balance paid for it, or null if the wallet was empty. */
  readonly spent: HintSource | null;
}

/**
 * Spend one hint from the wallet.
 *
 * Free is spent before bonus: the free hint expires at the next window whereas
 * bonus hints accumulate, so spending free first never wastes a hint.
 *
 * Call this only after the hint is actually granted to the player. On a failed
 * rewarded ad, do not call it — spec §27: the hint must not be consumed.
 */
export function spendHint(wallet: HintWallet): HintSpend {
  if (wallet.freeHints > 0) {
    return { wallet: { ...wallet, freeHints: wallet.freeHints - 1 }, spent: 'free' };
  }
  if (wallet.bonusHints > 0) {
    return { wallet: { ...wallet, bonusHints: wallet.bonusHints - 1 }, spent: 'bonus' };
  }
  return { wallet, spent: null };
}

/** Credit a hint earned by completing a rewarded ad, then spend it in one step. */
export function grantAdHint(wallet: HintWallet): HintWallet {
  return { ...wallet, bonusHints: wallet.bonusHints + 1 };
}
