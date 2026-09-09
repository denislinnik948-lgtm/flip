/**
 * Level select. Spec §10 — compact grid; completed levels replayable, locked
 * levels cannot be opened.
 *
 * The list is endless (owner decision, 2026-09-09), so it shows everything
 * reached plus the one level ahead — exactly what the prototype does. There is
 * no final level to scroll to.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { isCompleted, nextUncompletedLevel } from '../../core/progress';
import { BackButton } from '../components/common';
import { colors, layout, radius, type } from '../theme';
import type { AppState } from '../useAppState';

export function LevelsScreen({ app }: { app: AppState }) {
  const { progress, t } = app;
  const current = nextUncompletedLevel(progress);

  // One row of headroom past the current level, so the grid never ends on the
  // playable tile and there is always somewhere to look next.
  const shown = Math.max(current + 1, 10);

  return (
    <View style={styles.screen}>
      <BackButton onPress={app.goHome} label={t.back} />

      <View style={styles.header}>
        <Text style={styles.title}>{t.levels}</Text>
        <Text style={styles.meta}>{t.level(current)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {Array.from({ length: shown }, (_, i) => i + 1).map((id) => {
          const done = isCompleted(progress, id);
          const label = String(id).padStart(2, '0');

          if (id > current) {
            return (
              <View
                key={id}
                style={[styles.tile, styles.locked]}
                accessibilityLabel={`${t.level(id)}, ${t.locked}`}
              >
                <Text style={styles.lockedLabel}>{label}</Text>
              </View>
            );
          }

          return (
            <Pressable
              key={id}
              onPress={() => app.startLevel(id)}
              accessibilityRole="button"
              accessibilityLabel={
                done
                  ? `${t.level(id)}, ${t.completed}, ${t.best} ${t.moves(progress.bests[id])}`
                  : t.level(id)
              }
              style={[styles.tile, done ? styles.done : styles.current]}
            >
              <Text style={done ? styles.doneLabel : styles.currentLabel}>{label}</Text>
              {done ? <Text style={styles.best}>{progress.bests[id]}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const GAP = 9;

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
    paddingBottom: 24,
  },
  title: { ...type.label, color: colors.text },
  meta: { ...type.meta, letterSpacing: 1.2, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingBottom: 8 },
  tile: {
    width: `${(100 - 4 * 2.6) / 5}%`,
    aspectRatio: 1,
    borderRadius: radius.cell,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  done: { backgroundColor: colors.on },
  doneLabel: { fontSize: 12, letterSpacing: 0.36, color: colors.textOnDark },
  best: { fontSize: 8, letterSpacing: 0.8, color: 'rgba(247,247,245,.5)' },
  current: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.on },
  currentLabel: { fontSize: 12, letterSpacing: 0.36, fontWeight: '500', color: colors.text },
  locked: { backgroundColor: colors.locked },
  lockedLabel: { fontSize: 12, letterSpacing: 0.36, color: colors.lockedText },
});
