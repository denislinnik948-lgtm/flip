/**
 * Gameplay. Spec §20 — LEVEL N / X MOVES on top, large board centred,
 * RESTART / HINT at the bottom. No timer, no unrelated score.
 */

import { StyleSheet, Text, View } from 'react-native';

import { Board } from '../components/Board';
import { BackButton, TextButton } from '../components/common';
import { RestartIcon } from '../components/icons';
import { colors, layout, type } from '../theme';
import type { AppState } from '../useAppState';

export function GameScreen({ app }: { app: AppState }) {
  const { engine, mode, level, t } = app;
  if (!engine || !level) return null;

  const title = mode === 'daily' ? t.dailyFlip : t.level(level.id);

  // Owner decision, 2026-09-09: moves are capped, so the counter has to show
  // the ceiling. Reads as "used of allowed" rather than a countdown, because
  // Best is measured in moves used.
  const moves = `${engine.moves} / ${engine.moveLimit}`;
  const runningLow = engine.movesRemaining <= 3 && !engine.finished;

  return (
    <View style={styles.screen}>
      <BackButton onPress={app.goHome} label={t.back} />

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.moves, runningLow ? styles.movesLow : null]}>{moves}</Text>
      </View>

      <View style={styles.boardArea}>
        <Board engine={engine} onTap={app.tap} copy={t} />
      </View>

      {/* Spec §20 puts RESTART / HINT here. HINT ships in v2 with ads and IAP
          (owner decision, 2026-09-08), so v1 leaves RESTART alone on the row. */}
      <View style={styles.footer}>
        <TextButton label={t.restart} onPress={app.restart} leading={<RestartIcon />} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: layout.pagePadding,
    paddingBottom: layout.pagePadding,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  title: { ...type.label, color: colors.text },
  moves: { ...type.label, fontWeight: '400', color: colors.mutedStrong },
  movesLow: { color: colors.text, fontWeight: '600' },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.touchTarget,
  },
});
