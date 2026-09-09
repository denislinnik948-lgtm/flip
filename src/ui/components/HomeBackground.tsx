/**
 * Home background. Spec §21 — the prototype's "subtle grid".
 *
 * A 62px hairline grid that fades out by 62% of the screen height. On top of
 * it, one tile at a time: it fades in somewhere on the grid, flips exactly the
 * way a board cell flips, then fades out again. Nothing slides across the
 * screen — the motion is the game's own gesture, repeated quietly.
 *
 * React Native has no repeating background-image or mask-image, so the grid is
 * built as horizontal bands, each carrying its own hairlines at its own
 * opacity — the whole grid fades together rather than the horizontals fading
 * while the verticals stay put.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

import { createRng } from '../../core/rng';

const CELL = 62;
const LINE = 'rgba(42,42,41,.045)';
/** The two faces of the ambient tile, echoing the board's OFF and ON. */
const FACE_OFF = 'rgba(42,42,41,.05)';
const FACE_ON = 'rgba(42,42,41,.10)';

/** The prototype masks the grid out by 62% of the height. */
const FADE_END = 0.62;

/**
 * Beat timings. Deliberately slower and softer than the board's own flip: this
 * is ambience behind a menu, not feedback for a tap, so nothing here should
 * snap. The flip starts before the fade-in finishes, so the tile never appears
 * and *then* moves — it arrives already turning.
 *
 * The prototype's 2200ms ticker (motion.homeTicker) belonged to the old
 * hop-across-the-screen animation and no longer applies.
 */
const FADE_IN = 700;
const FLIP_DELAY = 350;
const FLIP = 900;
const HOLD = 700;
const FADE_OUT = 700;
const BEAT = FADE_IN + HOLD + FADE_OUT + 900;

/** The prototype's mask: .85 at the top, .45 at 40% depth, gone by 62%. */
function fadeAt(depth: number): number {
  if (depth >= FADE_END) return 0;
  if (depth <= 0.4) return 0.85 - (depth / 0.4) * 0.4;
  return 0.45 * (1 - (depth - 0.4) / (FADE_END - 0.4));
}

export function HomeBackground() {
  const { width, height } = useWindowDimensions();

  const columns = Math.ceil(width / CELL) + 1;
  const visibleHeight = height * FADE_END;
  const bandCount = Math.max(1, Math.ceil(visibleHeight / CELL));

  const [beat, setBeat] = useState(0);
  const [spot, setSpot] = useState({ left: CELL * 2 + 1, top: CELL + 1, dim: 1 });

  const opacity = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => setBeat((b) => b + 1), BEAT);
    return () => clearInterval(timer);
  }, []);

  // Only the upper part of the grid is bright enough for a tile to register;
  // below that the fade would swallow it and the beat would show nothing.
  const usableBands = Math.max(1, Math.round(bandCount * 0.7));

  const pickSpot = useCallback(
    (seed: number) => {
      const rng = createRng(seed);
      const row = rng.int(usableBands);
      return {
        left: rng.int(Math.max(1, columns - 1)) * CELL + 1,
        top: row * CELL + 1,
        // Sit inside the same fade as the grid beneath it.
        dim: fadeAt((row * CELL) / height) / 0.85,
      };
    },
    [columns, height, usableBands],
  );

  // Each beat: reposition while invisible, fade in, flip, fade out.
  useEffect(() => {
    const next = pickSpot(9001 + beat * 131);
    setSpot(next);
    opacity.setValue(0);
    flip.setValue(0);

    const animation = Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_IN,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(HOLD),
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_OUT,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(FLIP_DELAY),
        Animated.timing(flip, {
          toValue: 1,
          duration: FLIP,
          // Eased at both ends rather than the board's snappier curve.
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();
    return () => animation.stop();
  }, [beat, flip, opacity, pickSpot]);

  const bands = useMemo(
    () =>
      Array.from({ length: bandCount }, (_, r) => ({
        top: r * CELL,
        opacity: fadeAt((r * CELL) / height),
      })),
    [bandCount, height],
  );

  const front = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const back = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bands.map((band) => (
        <View key={band.top} style={[styles.band, { top: band.top, opacity: band.opacity }]}>
          <View style={styles.hLine} />
          {Array.from({ length: columns }, (_, c) => (
            <View key={c} style={[styles.vLine, { left: c * CELL }]} />
          ))}
        </View>
      ))}

      <Animated.View
        style={[styles.tile, { left: spot.left, top: spot.top, opacity: Animated.multiply(opacity, spot.dim) }]}
      >
        <Animated.View
          style={[
            styles.face,
            { backgroundColor: FACE_OFF, transform: [{ perspective: 640 }, { rotateY: front }] },
          ]}
        />
        <Animated.View
          style={[
            styles.face,
            { backgroundColor: FACE_ON, transform: [{ perspective: 640 }, { rotateY: back }] },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 0, right: 0, height: CELL },
  hLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: LINE },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: LINE },
  tile: { position: 'absolute', width: CELL - 1, height: CELL - 1 },
  face: { ...StyleSheet.absoluteFill, backfaceVisibility: 'hidden' },
});
