/**
 * Persistence. Spec §23, §24.
 *
 * v1 persists campaign unlocks and completion, Best moves, stars, Daily results
 * and settings. Unfinished puzzle state is deliberately not saved.
 *
 * The Remove Ads entitlement and hint wallet that spec §23 also lists are absent
 * on purpose: ads, IAP and hints are deferred to v2 (owner decision, 2026-09-08),
 * so there is nothing to persist yet. `reconcile` falls back to defaults for any
 * missing field, so reintroducing them in v2 needs no migration.
 *
 * Every read is defensive: a corrupt or partial blob falls back to defaults
 * rather than crashing a player's install.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_PROGRESS, type CampaignProgress, type DailyResult } from '../core/progress';
import { resolveLanguage, type Language } from '../i18n';

const KEY = 'flip.save.v1';

export interface Settings {
  readonly haptics: boolean;
  readonly language: Language;
}

export interface SaveData {
  readonly progress: CampaignProgress;
  readonly daily: DailyResult | null;
  readonly settings: Settings;
}

export function defaultSave(): SaveData {
  return {
    progress: EMPTY_PROGRESS,
    daily: null,
    // No stored language yet means a first run: follow the device.
    settings: { haptics: true, language: resolveLanguage(undefined) },
  };
}

function isRecordOfNumbers(value: unknown): value is Record<number, number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((v) => typeof v === 'number')
  );
}

/** Rebuild a SaveData from unknown JSON, keeping whatever is valid. */
function reconcile(raw: unknown): SaveData {
  const base = defaultSave();
  if (typeof raw !== 'object' || raw === null) return base;
  const data = raw as Record<string, unknown>;

  const progress = data.progress as Record<string, unknown> | undefined;
  const settings = data.settings as Record<string, unknown> | undefined;
  const daily = data.daily as Record<string, unknown> | undefined;

  return {
    progress: {
      bests: isRecordOfNumbers(progress?.bests) ? progress.bests : base.progress.bests,
      stars: isRecordOfNumbers(progress?.stars) ? progress.stars : base.progress.stars,
    },
    daily:
      typeof daily?.date === 'string' &&
      typeof daily.moves === 'number' &&
      typeof daily.best === 'number'
        ? { date: daily.date, moves: daily.moves, best: daily.best }
        : null,
    settings: {
      haptics: typeof settings?.haptics === 'boolean' ? settings.haptics : true,
      language: resolveLanguage(settings?.language),
    },
  };
}

export async function loadSave(): Promise<SaveData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return reconcile(JSON.parse(raw));
  } catch {
    // A failed read must never cost the player their session; defaults are safe.
    return defaultSave();
  }
}

export async function persistSave(data: SaveData): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Best-effort. Losing one write is preferable to interrupting play.
  }
}
