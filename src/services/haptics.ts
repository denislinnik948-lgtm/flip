/**
 * Haptics. Spec §22 — a single setting the player controls.
 *
 * Every call is fire-and-forget and swallows its errors: haptics are a texture,
 * never a dependency. A device without a taptic engine, a web build, or a
 * permission quirk must degrade to silence rather than interrupt a move.
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

function fire(run: () => Promise<void>, enabled: boolean): void {
  if (!enabled || !SUPPORTED) return;
  void run().catch(() => {
    // Ignored by design — see the note above.
  });
}

/** A move landed. Light, because it fires on every single tap. */
export function tapFeedback(enabled: boolean): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), enabled);
}

/** The board is complete. The one moment worth a heavier signal. */
export function solvedFeedback(enabled: boolean): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), enabled);
}

/** A tap that intentionally did nothing — e.g. a locked level. */
export function rejectedFeedback(enabled: boolean): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning), enabled);
}
