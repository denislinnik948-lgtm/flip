/**
 * Home. Spec §19 — wordmark, then DAILY FLIP, then PLAY low and thumb-friendly,
 * then LEVELS / SETTINGS. Daily sits above PLAY. No bottom navigation.
 */

import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { dateKeyOf } from '../../core/daily';
import { PrimaryButton, SurfaceButton } from '../components/common';
import { HomeBackground } from '../components/HomeBackground';
import { OrbitBorder } from '../components/OrbitBorder';
import { GridIcon, SlidersIcon } from '../components/icons';
import { Wordmark, StudioMark } from '../components/Wordmark';
import { colors, layout, radius, type } from '../theme';
import type { AppState } from '../useAppState';

const DAILY_RADIUS = 16;

export function HomeScreen({ app }: { app: AppState }) {
  const { t } = app;
  const today = dateKeyOf(new Date());
  const daily = app.save.daily;
  const doneToday = daily?.date === today;

  // Measured so the orbiting border can be drawn at the card's real size.
  const [card, setCard] = useState({ width: 0, height: 0 });
  const onCardLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCard((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View style={styles.screen}>
      <HomeBackground />

      <View style={styles.markArea}>
        <Wordmark />
      </View>

      <View onLayout={onCardLayout}>
        <SurfaceButton
          onPress={() => (doneToday ? app.setScreen('dailyDone') : app.startDaily())}
          style={styles.daily}
        >
          <DailyGlyph solved={doneToday} />
          <Text style={styles.dailyTitle}>{t.dailyFlip}</Text>
          <Text style={styles.dailySub}>
            {doneToday
              ? `${t.moves(daily.moves)} · ${t.best} ${daily.best}`
              : t.todaysChallenge}
          </Text>
        </SurfaceButton>

        {/* Only while today's challenge is unplayed — once it is done the card
            is just a result, and nothing should still be asking for attention. */}
        {!doneToday && card.width > 0 ? (
          <OrbitBorder width={card.width} height={card.height} radius={DAILY_RADIUS} />
        ) : null}
      </View>

      <View style={{ flex: 1.35 }} />

      <PrimaryButton label={t.play} onPress={app.play} />

      <View style={styles.row}>
        <SurfaceButton onPress={() => app.setScreen('levels')} style={styles.tile}>
          <GridIcon />
          <Text style={styles.tileLabel} numberOfLines={1}>
            {t.levels}
          </Text>
        </SurfaceButton>
        <SurfaceButton onPress={() => app.setScreen('settings')} style={styles.tile}>
          <SlidersIcon />
          {/* Ukrainian "НАЛАШТУВАННЯ" clears a 375pt screen with ~11pt to
              spare. Below ~364pt, or with large accessibility type, it would
              wrap and break the 48pt button — truncating degrades better. */}
          <Text style={styles.tileLabel} numberOfLines={1}>
            {t.settings}
          </Text>
        </SurfaceButton>
      </View>

      <StudioMark />
    </View>
  );
}

/**
 * Three cells above the label — the board in miniature. Unplayed shows the
 * middle one flipped, the way the wordmark's "I" is; solved lights all three,
 * so the card reads as finished at a glance before you read the numbers.
 */
function DailyGlyph({ solved }: { solved: boolean }) {
  return (
    <View style={styles.glyph}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.glyphCell,
            solved || i === 1
              ? { backgroundColor: colors.on }
              : { backgroundColor: colors.off, borderWidth: 1, borderColor: colors.offEdge },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: layout.pagePadding },
  markArea: {
    flex: 0.82,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 40,
    paddingBottom: 72,
  },
  daily: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    borderRadius: DAILY_RADIUS,
    alignItems: 'center',
    gap: 12,
  },
  glyph: { flexDirection: 'row', gap: 5, marginBottom: 2 },
  glyphCell: { width: 14, height: 14, borderRadius: 4 },
  dailyTitle: { ...type.label, letterSpacing: 2.08, color: colors.text },
  dailySub: { ...type.meta, fontSize: 11, letterSpacing: 1.32, color: colors.muted },
  row: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tile: {
    flex: 1,
    height: 48,
    borderRadius: radius.cell,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  tileLabel: {
    ...type.label,
    fontWeight: '400',
    letterSpacing: 1.54,
    color: colors.mutedStrong,
    flexShrink: 1,
  },
});
