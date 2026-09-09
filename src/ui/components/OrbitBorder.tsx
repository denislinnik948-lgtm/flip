/**
 * A single lit segment travelling around a card's border.
 *
 * Used on the DAILY FLIP card while today's puzzle is unplayed — a quiet
 * "there's something here" without a badge or a colour. Spec §21 rules out
 * gradients and noisy celebration, so this is one hairline segment at the same
 * weight as the card's own border, not a glow.
 *
 * Implemented as a dashed rounded rect whose dash offset animates: the dash
 * pattern is one visible segment followed by a gap the length of the whole
 * perimeter, so exactly one segment is ever in flight.
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors } from '../theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const STROKE = 1.5;
/** Length of the lit run, in points along the border. */
const SEGMENT = 84;
const DURATION = 4200;

interface OrbitBorderProps {
  readonly width: number;
  readonly height: number;
  readonly radius: number;
  readonly color?: string;
}

export function OrbitBorder({ width, height, radius, color = colors.muted }: OrbitBorderProps) {
  const progress = useRef(new Animated.Value(0)).current;

  // Inset by half the stroke so the line sits on the card edge rather than
  // straddling it and getting clipped.
  const inset = STROKE / 2;
  const w = Math.max(0, width - STROKE);
  const h = Math.max(0, height - STROKE);
  const r = Math.min(radius, w / 2, h / 2);

  // Rounded-rect perimeter: the four straight runs plus one full circle of corners.
  const perimeter = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;

  useEffect(() => {
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.linear,
        // strokeDashoffset is an SVG prop, not a transform — no native driver.
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, perimeter]);

  if (w <= 0 || h <= 0) return null;

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -perimeter],
  });

  return (
    <Svg
      width={width}
      height={height}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <AnimatedRect
        x={inset}
        y={inset}
        width={w}
        height={h}
        rx={r}
        ry={r}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${SEGMENT} ${perimeter}`}
        strokeDashoffset={dashOffset}
      />
    </Svg>
  );
}
