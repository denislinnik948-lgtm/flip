/**
 * Identity marks. Spec §21 — four letter tiles with the "I" flipped, echoing
 * the board itself.
 *
 * The mark inverts on a dark surface, exactly as the prototype does. This is
 * not decoration: the flipped tile is filled with the ON colour, which *is* the
 * splash background, so reusing the light-surface version there makes the "I"
 * vanish into the backdrop.
 */

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, type } from '../theme';

const LETTERS = ['F', 'L', 'I', 'P'] as const;
/** The "I" is the flipped tile. */
const FLIPPED_INDEX = 2;

export function Wordmark({
  size = 56,
  dark = false,
  full = true,
}: {
  size?: number;
  dark?: boolean;
  /** Show "FIELD" beneath, making the mark read as the app's full name. */
  full?: boolean;
}) {
  return (
    <View style={styles.lockup} accessibilityRole="header" accessibilityLabel="Flip Field">
      <View style={styles.row}>
      {LETTERS.map((ch, i) => {
        const flipped = i === FLIPPED_INDEX;

        // On dark the roles swap: the three plain tiles carry the light fill and
        // the flipped one becomes an outline, so it still reads as "turned over"
        // without disappearing.
        const fill = dark
          ? flipped
            ? 'transparent'
            : colors.textOnDark
          : flipped
            ? colors.on
            : colors.off;
        const border = dark
          ? flipped
            ? 'rgba(247,247,245,.4)'
            : 'transparent'
          : flipped
            ? 'transparent'
            : colors.offEdge;
        const ink = dark
          ? flipped
            ? colors.textOnDark
            : colors.text
          : flipped
            ? colors.textOnDark
            : colors.text;

        return (
          <View
            key={ch}
            style={[
              styles.tile,
              {
                width: size,
                height: size,
                borderRadius: size * 0.232,
                backgroundColor: fill,
                borderColor: border,
                borderWidth: dark && flipped ? 1.5 : 1,
              },
            ]}
          >
            <Text style={[styles.letter, { fontSize: size * 0.375, color: ink }]}>{ch}</Text>
          </View>
        );
      })}
      </View>

      {/* The store name is "Flip Field"; the mark is four tiles spelling FLIP.
          A tracked second line reconciles the two without turning the logo
          into ten tiles. */}
      {full ? (
        <Text
          style={[
            styles.second,
            {
              // Floored: the About screen renders the mark at 34, where a
              // purely proportional 6.7pt line would be unreadable.
              fontSize: Math.max(size * 0.196, 9),
              letterSpacing: size * 0.13,
              color: dark ? 'rgba(247,247,245,.55)' : colors.muted,
              marginTop: size * 0.2,
              // Letter-spacing also trails the final glyph, so a centred text
              // box sits half a tracking unit left of true centre. Nudge back.
              marginLeft: size * 0.065,
            },
          ]}
        >
          FIELD
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The "Li" monogram, transcribed from the prototype's geometry.
 *
 * Both letters carry a diagonal cut — the L's foot tapers to its right, the i's
 * stem is sheared at the bottom left. Those cuts are `clip-path` in the
 * prototype, which React Native has no equivalent for, so the mark is drawn as
 * SVG at the prototype's exact coordinates (a 26×22 box) rather than
 * approximated with rectangles.
 */
function LiGlyph({ height = 17, color }: { height?: number; color: string }) {
  const width = (height * 26) / 22;

  return (
    <Svg width={width} height={height} viewBox="0 0 26 22">
      {/* L — upright, then the tapered foot. */}
      <Path d="M0 0 H5 V22 H0 Z" fill={color} />
      <Path d="M0 17 H12.92 L17 22 H0 Z" fill={color} />
      {/* i — dot, then the sheared stem. */}
      <Path d="M21 0 H26 V5 H21 Z" fill={color} />
      <Path d="M21 8 H26 V22 L21 18.92 Z" fill={color} />
    </Svg>
  );
}

/** LI STUDIO footer mark. */
export function StudioMark({ dark = false }: { dark?: boolean }) {
  const ink = dark ? colors.textOnDark : colors.text;
  const label = dark ? 'rgba(247,247,245,.5)' : '#A9A9A3';

  return (
    <View style={styles.studio}>
      <View style={{ opacity: dark ? 1 : 0.42 }}>
        <LiGlyph height={dark ? 22 : 17} color={ink} />
      </View>
      <Text style={[styles.studioLabel, { color: label }]}>LI STUDIO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { alignItems: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  second: { fontWeight: '500' },
  tile: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  letter: { fontWeight: '500', letterSpacing: 0.21 },
  studio: { alignItems: 'center', gap: 9, paddingTop: 30, paddingBottom: 16 },
  studioLabel: { fontSize: 8, letterSpacing: 2.4 },
});
