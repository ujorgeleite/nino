// components/puzzle/PuzzleBoard.tsx
// The target: the figure's outline with a grid of empty cells to fill.
//
// The outline is the whole reason this game works for a 2-year-old. It shows
// what the picture WILL be, so dragging has a visible purpose — unlike a blank
// frame, which asks a child to hold the goal in their head.
//
// Filled cells show the real artwork. As pieces go in, the picture appears.

import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import PuzzleFigure from './PuzzleFigure';
import { HALO } from '../../constants/depth';
import { COLORS, RADII } from '../../constants/nino';
import type { CountryData } from '../../constants/countries';
import type { PuzzleCell } from '../../hooks/usePuzzle';

type Props = {
  country: CountryData;
  cells: readonly PuzzleCell[];
  rows: number;
  cols: number;
  placed: Set<string>;
  /** The cell a carried piece would land in, if any. */
  highlighted: string | null;
  size: number;
  /** Reports a cell's centre in WINDOW coordinates. */
  onCellMeasured: (id: string, centre: { x: number; y: number }) => void;
};

export function PuzzleBoard({
  country,
  cells,
  rows,
  cols,
  placed,
  highlighted,
  size,
  onCellMeasured,
}: Props) {
  const cellW = size / cols;
  const cellH = size / rows;

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      {/* The ghost: the whole figure, very faint. The promise of the picture. */}
      <View pointerEvents="none" style={styles.ghost}>
        <PuzzleFigure country={country} size={size} />
      </View>

      {cells.map((cell) => (
        <Cell
          key={cell.id}
          cell={cell}
          country={country}
          rows={rows}
          cols={cols}
          size={size}
          width={cellW}
          height={cellH}
          filled={placed.has(cell.id)}
          glowing={highlighted === cell.id}
          onMeasured={onCellMeasured}
        />
      ))}
    </View>
  );
}

function Cell({
  cell,
  country,
  rows,
  cols,
  size,
  width,
  height,
  filled,
  glowing,
  onMeasured,
}: {
  cell: PuzzleCell;
  country: CountryData;
  rows: number;
  cols: number;
  size: number;
  width: number;
  height: number;
  filled: boolean;
  glowing: boolean;
  onMeasured: (id: string, centre: { x: number; y: number }) => void;
}) {
  const ref = useRef<View | null>(null);
  const glow = useSharedValue(0);

  React.useEffect(() => {
    glow.value = withTiming(glowing ? 1 : 0, { duration: 150 });
  }, [glowing, glow]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: glow.value * HALO.activeOpacity,
    transform: [{ scale: 1 + glow.value * 0.06 }],
  }));

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, w, h) => {
      onMeasured(cell.id, { x: x + w / 2, y: y + h / 2 });
    });
  }, [cell.id, onMeasured]);

  return (
    <View
      ref={ref}
      onLayout={measure}
      testID={`cell-${cell.id}`}
      style={[
        styles.cell,
        { width, height, left: cell.col * width, top: cell.row * height },
      ]}
    >
      <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
      {filled ? (
        <PuzzleFigure
          country={country}
          size={size}
          crop={{ row: cell.row, col: cell.col, rows, cols }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: RADII.lg,
    borderWidth: 5,
    borderColor: COLORS.ninoInk,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  // Faint enough to guide, strong enough to read at arm's length.
  ghost: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16 },
  cell: {
    position: 'absolute',
    // Hairlines between cells: a child needs to see WHERE a piece goes, not
    // just roughly that it goes on the board.
    borderWidth: 1,
    borderColor: 'rgba(51, 36, 28, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: HALO.color,
  },
});

export default PuzzleBoard;
