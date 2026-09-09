/**
 * One board cell. Spec §21 — square, subtle radius, symbol, 3D flip.
 *
 * The cell is two stacked faces (OFF light, ON dark) on a rotating parent with
 * backface culling, so ON/OFF is a physical half-turn rather than a colour
 * swap. Preview is drawn without touching board state: spec §6 requires the
 * board to stay put until the pointer is released.
 */

import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { CELL_SYMBOL } from '../../core/types';
import type { CellType } from '../../core/types';
import { colors, motion, preview, radius, symbolColors, type } from '../theme';

interface CellProps {
  readonly on: boolean;
  readonly cellType: CellType;
  readonly showSymbol: boolean;
  /** Cell is in the previewed action, but is not the pressed cell. */
  readonly previewed: boolean;
  readonly pressed: boolean;
  /** Manhattan distance from the tapped cell, for the flip stagger. */
  readonly staggerSteps: number;
  readonly size: number;
}

function CellView({
  on,
  cellType,
  showSymbol,
  previewed,
  pressed,
  staggerSteps,
  size,
}: CellProps) {
  const flip = useRef(new Animated.Value(on ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  // Flip on state change, staggered outward from the tapped cell.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      flip.setValue(on ? 1 : 0);
      return;
    }
    Animated.timing(flip, {
      toValue: on ? 1 : 0,
      duration: motion.flipDuration,
      delay: staggerSteps * motion.flipStagger,
      easing: Easing.bezier(0.2, 0.8, 0.25, 1),
      useNativeDriver: true,
    }).start();
  }, [flip, on, staggerSteps]);

  useEffect(() => {
    Animated.timing(scale, {
      toValue: pressed ? preview.scalePressed : previewed ? preview.scaleAffected : 1,
      duration: motion.fast,
      easing: Easing.bezier(0.2, 0.8, 0.25, 1),
      useNativeDriver: true,
    }).start();
  }, [previewed, pressed, scale]);

  const rotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const rotateBack = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const inAction = previewed || pressed;
  const symbol = showSymbol ? CELL_SYMBOL[cellType] : '';

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[styles.cell, { transform: [{ scale }] }]}>
        <Animated.View
          style={[styles.face, { backgroundColor: colors.off, transform: [{ perspective: 640 }, { rotateY: rotate }] }]}
        >
          <Text style={[styles.symbol, { color: inAction ? symbolColors.previewOff : symbolColors.idleOff }]}>
            {symbol}
          </Text>
          {inAction ? <View style={[styles.ring, { borderColor: preview.ringOff }]} /> : null}
          <View style={styles.edge} />
        </Animated.View>

        <Animated.View
          style={[styles.face, { backgroundColor: colors.on, transform: [{ perspective: 640 }, { rotateY: rotateBack }] }]}
        >
          <Text style={[styles.symbol, { color: inAction ? symbolColors.previewOn : symbolColors.idleOn }]}>
            {symbol}
          </Text>
          {inAction ? <View style={[styles.ring, { borderColor: preview.ringOn }]} /> : null}
        </Animated.View>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1 },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.cell,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  edge: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.cell,
    borderWidth: 1,
    borderColor: colors.offEdge,
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.cell,
    borderWidth: preview.ringWidth,
  },
  symbol: { ...type.cellSymbol, includeFontPadding: false },
});

export const Cell = memo(CellView);
