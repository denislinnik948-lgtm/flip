/**
 * Shared primitives. Spec §21 — button treatment and screen hierarchy follow
 * the prototype: flat surfaces, hairline insets, wide uppercase tracking.
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, layout, radius, type } from '../theme';
import { ChevronLeft } from './icons';

export function Label({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <Text style={[styles.label, style as never]}>{children}</Text>;
}

export function Meta({ children }: { children: ReactNode }) {
  return <Text style={styles.meta}>{children}</Text>;
}

/** Solid dark button — one per screen at most (PLAY, NEXT LEVEL, WATCH AD). */
export function PrimaryButton({
  label,
  onPress,
  height = 62,
  trailing,
}: {
  label: string;
  onPress: () => void;
  height?: number;
  trailing?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primary,
        { height, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

/** Light surface with a hairline inset. */
export function SurfaceButton({
  onPress,
  children,
  style,
}: {
  onPress: () => void;
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.surface,
        style as never,
        pressed ? { backgroundColor: '#F2F2EF' } : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Text-only action, used for RESTART / HINT / HOME. */
export function TextButton({
  label,
  onPress,
  leading,
  trailing,
}: {
  label: string;
  onPress: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.textButton}>
      {leading}
      <Text style={styles.textButtonLabel}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

/** 44pt back target, optically aligned past the page padding like the prototype. */
export function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return (
    <View style={styles.backRow}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.back}>
        <ChevronLeft />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...type.label, color: colors.text },
  meta: { ...type.meta, color: colors.muted },
  primary: {
    width: '100%',
    borderRadius: radius.button,
    backgroundColor: colors.on,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryLabel: { ...type.button, color: colors.textOnDark },
  surface: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  textButton: {
    height: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textButtonLabel: { ...type.label, fontWeight: '400', color: colors.muted },
  backRow: { height: layout.touchTarget, justifyContent: 'center' },
  back: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    marginLeft: -13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
