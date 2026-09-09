/**
 * The board. Spec §6, §20 — large responsive grid, press to preview, release to
 * execute, and a swipe must never trigger an action.
 *
 * Input is handled at the board level rather than per cell so a press that
 * slides off its cell still cancels cleanly, matching the prototype.
 */

import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';

import type { GameEngine } from '../../core/engine';
import type { Copy } from '../../i18n';
import { layout, preview as previewTokens } from '../theme';
import { Cell } from './Cell';

/** Movement beyond this reads as a swipe, not a tap (spec §6). */
const SWIPE_CANCEL_PX = 12;

interface BoardProps {
  readonly engine: GameEngine;
  readonly onTap: (index: number) => void;
  readonly copy: Copy;
  readonly showSymbols?: boolean;
}

export function Board({ engine, onTap, copy, showSymbols = true }: BoardProps) {
  const { width } = useWindowDimensions();
  const [pressed, setPressed] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<number | null>(null);
  const [boardWidth, setBoardWidth] = useState(
    Math.min(width * layout.boardWidthRatio, layout.boardMaxWidth),
  );

  const size = engine.level.gridSize;
  const cellSize = (boardWidth - layout.gridGap * (size - 1)) / size;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setBoardWidth(e.nativeEvent.layout.width);
  }, []);

  const previewSet = useMemo(
    () => (pressed === null ? new Set<number>() : new Set(engine.preview(pressed))),
    [engine, pressed],
  );

  const cells = engine.board.cells;

  return (
    <View style={[styles.board, { width: boardWidth }]} onLayout={onLayout}>
      {cells.map((cell, index) => {
        const row = Math.floor(index / size);
        const col = index % size;

        // Stagger radiates from the cell that was actually tapped.
        const steps =
          lastTap === null
            ? 0
            : Math.abs(row - Math.floor(lastTap / size)) + Math.abs(col - (lastTap % size));

        // Bridge the gutter between neighbouring cells of the same action, so a
        // CROSS or a whole ROW reads as one connected shape rather than a set of
        // separate tiles. Only right and down are drawn — the left/up edges are
        // the neighbour's own right/down line.
        const inPreview = previewSet.has(index);
        const linkRight = inPreview && col < size - 1 && previewSet.has(index + 1);
        const linkDown = inPreview && row < size - 1 && previewSet.has(index + size);

        return (
          <View
            key={index}
            accessible
            accessibilityRole="button"
            // Matches the prototype's per-cell label: mechanic, then state.
            accessibilityLabel={`${copy.cellTypes[engine.level.cellTypes[index]]}, ${
              cell === 1 ? copy.cellOn : copy.cellOff
            }`}
            onAccessibilityTap={() => onTap(index)}
            style={{
              marginRight: col === size - 1 ? 0 : layout.gridGap,
              marginBottom: row === size - 1 ? 0 : layout.gridGap,
            }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => false}
            onResponderGrant={() => setPressed(index)}
            onResponderMove={(e) => {
              const { locationX, locationY } = e.nativeEvent;
              const strayed =
                locationX < -SWIPE_CANCEL_PX ||
                locationY < -SWIPE_CANCEL_PX ||
                locationX > cellSize + SWIPE_CANCEL_PX ||
                locationY > cellSize + SWIPE_CANCEL_PX;
              if (strayed) setPressed(null);
            }}
            onResponderRelease={() => {
              // Only fire if the press never turned into a swipe.
              if (pressed === index) {
                setLastTap(index);
                onTap(index);
              }
              setPressed(null);
            }}
            onResponderTerminate={() => setPressed(null)}
          >
            {linkRight ? (
              <View
                pointerEvents="none"
                style={[
                  styles.link,
                  {
                    left: cellSize,
                    top: cellSize / 2 - 0.75,
                    width: layout.gridGap,
                    height: 1.5,
                  },
                ]}
              />
            ) : null}
            {linkDown ? (
              <View
                pointerEvents="none"
                style={[
                  styles.link,
                  {
                    top: cellSize,
                    left: cellSize / 2 - 0.75,
                    height: layout.gridGap,
                    width: 1.5,
                  },
                ]}
              />
            ) : null}

            <Cell
              on={cell === 1}
              cellType={engine.level.cellTypes[index]}
              showSymbol={showSymbols}
              previewed={previewSet.has(index) && pressed !== index}
              pressed={pressed === index}
              staggerSteps={steps}
              size={cellSize}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: layout.boardMaxWidth,
    alignSelf: 'center',
  },
  link: {
    position: 'absolute',
    backgroundColor: previewTokens.lineGap,
    zIndex: 1,
  },
});
