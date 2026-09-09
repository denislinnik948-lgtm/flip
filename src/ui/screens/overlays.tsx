/**
 * Overlays: completion sheet, out-of-moves sheet, Daily complete.
 *
 * Spec §7 completion copy, §11 Daily copy. The rewarded-ad and login-bonus
 * sheets ship in v2 alongside ads and IAP (owner decision, 2026-09-08).
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { dateKeyOf, generateDaily } from '../../core/daily';
import { PrimaryButton, TextButton } from '../components/common';
import { colors, layout, motion, radius, type } from '../theme';
import type { AppState } from '../useAppState';

/** Sheet that rises 14px and fades, per the prototype's motion tokens. */
function Sheet({ children, centred }: { children: React.ReactNode; centred?: boolean }) {
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: motion.sheet,
      easing: Easing.bezier(0.2, 0.8, 0.25, 1),
      useNativeDriver: true,
    }).start();
  }, [rise]);

  return (
    <Animated.View
      style={[
        styles.sheet,
        centred ? { alignItems: 'center' } : null,
        {
          opacity: rise,
          transform: [
            { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [motion.sheetRise, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Spec §7. COMPLETE / NEW BEST / stars / X MOVES / BEST X / NEXT LEVEL.
 *
 * Centred, and built from the same parts as the out-of-moves sheet: they appear
 * in the same place one after the other, so a different alignment between them
 * read as a mistake rather than a distinction.
 */
export function CompleteSheet({ app }: { app: AppState }) {
  const { completion, level, t } = app;
  if (!completion || !level) return null;

  return (
    <View style={styles.scrim}>
      <Sheet centred>
        <View style={styles.heading}>
          <Text style={styles.sheetTitle}>{t.complete}</Text>
          {completion.isNewBest ? <Text style={styles.newBest}>{t.newBest}</Text> : null}
        </View>

        <Text style={styles.stars}>
          {'★'.repeat(completion.stars)}
          <Text style={{ color: colors.starOff }}>{'★'.repeat(3 - completion.stars)}</Text>
        </Text>

        <View style={styles.meter}>
          <Text style={styles.bigCount}>{completion.moves}</Text>
          <Text style={[styles.resultMeta, styles.centredText]}>
            {t.movesUnit(completion.moves)}
          </Text>
        </View>

        <ScoreLine
          best={completion.best}
          optimal={level.optimalMoves}
          perfect={completion.moves === level.optimalMoves}
          t={t}
        />

        <View style={styles.full}>
          <PrimaryButton label={t.next} onPress={app.nextPuzzle} height={56} />
        </View>
        <TextButton label={t.home} onPress={app.goHome} />
      </Sheet>
    </View>
  );
}

/**
 * Out of moves. Owner decision, 2026-09-09 — the game's only loss state.
 *
 * Centred, and it tells the player how close they actually were: the solver
 * knows the shortest route from where they stopped, so "2 moves from solved"
 * is a real measurement rather than encouragement. That number is the reason
 * to tap TRY AGAIN, so it is the largest thing on the sheet.
 */
export function FailSheet({ app }: { app: AppState }) {
  const { failed, engine, t } = app;
  if (!failed || !engine) return null;

  const remaining = engine.remainingOptimalMoves();

  return (
    <View style={styles.scrim}>
      <Sheet centred>
        <Text style={styles.sheetTitle}>{t.outOfMoves}</Text>

        <View style={styles.meter}>
          <Text style={styles.bigCount}>{remaining}</Text>
          <Text style={[styles.resultMeta, styles.centredText]}>
            {t.movesUnit(remaining)} {t.toSolve}
          </Text>
        </View>

        <Text style={[styles.resultMeta, styles.centredText]}>
          {engine.moveLimit} · {t.moveLimit}
        </Text>

        <View style={styles.full}>
          <PrimaryButton label={t.tryAgain} onPress={app.restart} height={56} />
        </View>
        <TextButton label={t.home} onPress={app.goHome} />
      </Sheet>
    </View>
  );
}

/**
 * Spec §11. DAILY COMPLETE / X MOVES / BEST X / COME BACK TOMORROW / HOME.
 *
 * A full screen rather than a sheet, but it presents the same thing as the two
 * above, so it uses the same centred result block. All three ways of finishing
 * now look like one another.
 */
export function DailyDoneScreen({ app }: { app: AppState }) {
  const { t } = app;
  const daily = app.save.daily;
  if (!daily) return null;

  return (
    <View style={styles.dailyScreen}>
      <View style={styles.dailyBody}>
        <Text style={styles.sheetTitle}>{t.dailyComplete}</Text>

        <View style={styles.meter}>
          <Text style={styles.bigCount}>{daily.moves}</Text>
          <Text style={[styles.resultMeta, styles.centredText]}>{t.movesUnit(daily.moves)}</Text>
        </View>

        <ScoreLine
          best={daily.best}
          optimal={generateDaily(daily.date).optimalMoves}
          perfect={daily.moves === generateDaily(daily.date).optimalMoves}
          t={t}
        />
        <Text style={[styles.resultMeta, styles.centredText]}>{t.comeBackTomorrow}</Text>
      </View>

      <PrimaryButton label={t.home} onPress={app.goHome} height={56} />
    </View>
  );
}

/**
 * Your best against the board's floor.
 *
 * `optimal` is not a high score gathered from other players — it is the
 * shortest solution that exists, proven by the solver before the level ever
 * shipped. Nobody can beat it, which makes it a more meaningful target than a
 * leaderboard would be, and it needs no server to be true.
 */
function ScoreLine({
  best,
  optimal,
  perfect,
  t,
}: {
  best: number;
  optimal: number;
  perfect: boolean;
  t: AppState['t'];
}) {
  if (perfect) {
    return (
      <View style={styles.scoreLine}>
        <Text style={styles.perfect}>{t.perfect}</Text>
        <Text style={[styles.resultMeta, styles.centredText]}>
          {t.bestPossible} {optimal}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.scoreLine}>
      <Text style={[styles.resultMeta, styles.centredText]}>
        {t.yourBest} {best}
      </Text>
      <Text style={[styles.resultMeta, styles.centredText]}>
        {t.bestPossible} {optimal}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(247,247,245,.86)',
    justifyContent: 'flex-end',
    padding: layout.pagePadding,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 24,
    gap: 24,
  },
  sheetTitle: { ...type.labelWide, color: colors.text },
  newBest: { ...type.meta, letterSpacing: 1.6, color: colors.muted },
  stars: { fontSize: 20, letterSpacing: 2.8, color: colors.text },
  result: { ...type.result, color: colors.text },
  resultMeta: { ...type.metaWide, color: colors.muted },
  centredText: { textAlign: 'center' },
  heading: { alignItems: 'center', gap: 8 },
  meter: { alignItems: 'center', gap: 10 },
  bigCount: { fontSize: 56, fontWeight: '500', letterSpacing: -1.1, color: colors.text },
  full: { width: '100%' },
  scoreLine: { alignItems: 'center', gap: 6 },
  perfect: { ...type.labelWide, color: colors.text },
  dailyScreen: { flex: 1, padding: layout.pagePadding },
  dailyBody: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 26 },
});
