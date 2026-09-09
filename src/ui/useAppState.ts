/**
 * App-wide state. Spec §24 — "State: current mode, current level, move count".
 *
 * The GameEngine is mutable and lives in a ref; `version` forces a re-render
 * after each mutation. That keeps a single source of truth for the board rather
 * than mirroring it into React state and risking the two drifting apart.
 *
 * There is no hint state in v1: hints, ads and IAP are deferred to v2 (owner
 * decision, 2026-09-08).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { dateKeyOf, generateDaily } from '../core/daily';
import { GameEngine } from '../core/engine';
import { levelFor } from '../core/levels';
import {
  nextUncompletedLevel,
  recordCompletion,
  recordDaily,
  starsFor,
  type CampaignProgress,
} from '../core/progress';
import type { LevelData } from '../core/types';
import { copyFor } from '../i18n';
import { rejectedFeedback, solvedFeedback, tapFeedback } from '../services/haptics';
import { defaultSave, loadSave, persistSave, type SaveData } from '../services/storage';

export type Screen = 'splash' | 'home' | 'game' | 'levels' | 'settings' | 'about' | 'dailyDone';
export type Mode = 'level' | 'daily';

export interface Completion {
  readonly moves: number;
  readonly best: number;
  readonly stars: number;
  readonly isNewBest: boolean;
}

export function useAppState() {
  const [save, setSave] = useState<SaveData>(defaultSave);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('splash');
  const [mode, setMode] = useState<Mode>('level');
  const [level, setLevel] = useState<LevelData | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, bump] = useState(0);

  const engineRef = useRef<GameEngine | null>(null);
  const engine = engineRef.current;

  const commit = useCallback((next: SaveData) => {
    setSave(next);
    void persistSave(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadSave();
      if (cancelled) return;
      setSave(loaded);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback((data: LevelData, nextMode: Mode) => {
    engineRef.current = new GameEngine(data);
    setLevel(data);
    setMode(nextMode);
    setCompletion(null);
    setFailed(false);
    setScreen('game');
    bump((v) => v + 1);
  }, []);

  const startLevel = useCallback((id: number) => start(levelFor(id), 'level'), [start]);
  const startDaily = useCallback(
    () => start(generateDaily(dateKeyOf(new Date())), 'daily'),
    [start],
  );

  /** Spec §10: PLAY opens the next uncompleted level. Always exists. */
  const play = useCallback(
    () => startLevel(nextUncompletedLevel(save.progress)),
    [save.progress, startLevel],
  );

  const finish = useCallback(
    (moves: number) => {
      if (!level) return;
      solvedFeedback(save.settings.haptics);

      if (mode === 'daily') {
        const daily = recordDaily(save.daily, dateKeyOf(new Date()), moves);
        commit({ ...save, daily });
        setScreen('dailyDone');
        return;
      }

      const result = recordCompletion(save.progress, level.id, moves, level.optimalMoves);
      commit({ ...save, progress: result.progress });
      setCompletion({
        moves,
        best: result.best,
        stars: result.stars,
        isNewBest: result.isNewBest,
      });
    },
    [commit, level, mode, save],
  );

  const tap = useCallback(
    (index: number) => {
      const current = engineRef.current;
      if (!current || !current.tap(index)) return;
      bump((v) => v + 1);

      // Solved fires its own, heavier signal — don't stack the two.
      if (current.solved) finish(current.moves);
      else if (current.failed) {
        rejectedFeedback(save.settings.haptics);
        setFailed(true);
      } else tapFeedback(save.settings.haptics);
    },
    [finish, save.settings.haptics],
  );

  const restart = useCallback(() => {
    engineRef.current?.restart();
    setCompletion(null);
    setFailed(false);
    bump((v) => v + 1);
  }, []);

  const t = copyFor(save.settings.language);

  const setSettings = useCallback(
    (patch: Partial<SaveData['settings']>) =>
      commit({ ...save, settings: { ...save.settings, ...patch } }),
    [commit, save],
  );

  /** The progression is endless, so there is always a next level. */
  const nextPuzzle = useCallback(() => {
    if (level) startLevel(level.id + 1);
  }, [level, startLevel]);

  return {
    ready,
    save,
    t,
    progress: save.progress as CampaignProgress,
    screen,
    setScreen,
    mode,
    level,
    engine,
    version,
    completion,
    failed,
    play,
    startLevel,
    startDaily,
    nextPuzzle,
    tap,
    restart,
    setSettings,
    goHome: () => {
      setCompletion(null);
      setFailed(false);
      setScreen('home');
    },
  };
}

export type AppState = ReturnType<typeof useAppState>;
