/**
 * Settings and About.
 *
 * Spec §22 lists Sound, Haptics, Remove Ads and About FLIP. v1 ships Haptics
 * and About only: Sound is cut from the product entirely, and Remove Ads moves
 * to v2 with the rest of monetisation (owner decision, 2026-09-08).
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LANGUAGE_NAME, otherLanguage } from '../../i18n';
import { BackButton } from '../components/common';
import { ArrowRight } from '../components/icons';
import { Wordmark } from '../components/Wordmark';
import { colors, layout, type } from '../theme';
import type { AppState } from '../useAppState';

/** Kept in one place so About and the store listing cannot drift apart. */
const APP_VERSION = '1.0.0';

export function SettingsScreen({ app }: { app: AppState }) {
  const { settings } = app.save;
  const { t } = app;

  return (
    <View style={styles.screen}>
      <BackButton onPress={app.goHome} label={t.back} />
      <Text style={styles.title}>{t.settings}</Text>

      <View>
        {/* The value shows the language you are in, and tapping swaps it —
            two languages need a toggle, not a picker. */}
        <Row
          label={t.language}
          value={LANGUAGE_NAME[settings.language]}
          onPress={() => app.setSettings({ language: otherLanguage(settings.language) })}
        />
        <Row
          label={t.haptics}
          value={settings.haptics ? t.on : t.off}
          onPress={() => app.setSettings({ haptics: !settings.haptics })}
        />
        <Row label={t.aboutFlip} chevron onPress={() => app.setScreen('about')} />
      </View>
    </View>
  );
}

export function AboutScreen({ app }: { app: AppState }) {
  const { t } = app;

  return (
    <View style={styles.screen}>
      <BackButton onPress={() => app.setScreen('settings')} label={t.back} />

      <View style={styles.aboutBody}>
        <Wordmark size={34} />
        <Text style={styles.aboutText}>{t.aboutLine}</Text>
        <Text style={styles.version}>{t.version} {APP_VERSION}</Text>
      </View>

      <View style={styles.legal}>
        <Text style={styles.legalLink}>{t.privacyPolicy}</Text>
        <Text style={styles.legalLink}>{t.terms}</Text>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  chevron,
  onPress,
}: {
  label: string;
  value?: string;
  chevron?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {chevron ? <ArrowRight /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: layout.pagePadding,
    paddingBottom: layout.pagePadding,
    paddingTop: 12,
  },
  title: { ...type.label, color: colors.text, paddingTop: 2, paddingBottom: 24 },
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowLabel: { fontSize: 13, color: colors.text },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowValue: { ...type.label, fontWeight: '400', color: colors.mutedStrong },
  aboutBody: { flex: 1, justifyContent: 'center', gap: 22, paddingBottom: 40 },
  aboutText: { ...type.body, color: '#4A4A45', maxWidth: 250 },
  version: { ...type.meta, letterSpacing: 1.2, color: colors.muted },
  legal: { flexDirection: 'row', gap: 20 },
  legalLink: { ...type.label, fontWeight: '400', letterSpacing: 1.1, color: colors.muted },
});
