// components/puzzle/PuzzleBoard.tsx
// The picture, with shaped holes punched in it.
//
// This is a chunky wooden toddler puzzle, not a jigsaw: the board IS the
// artwork, mostly complete, with four holes of unmistakably different shapes.
// A circle can only enter the circle. A 2-year-old sees that before they try,
// which is the whole design.
//
// Every hole is drawn from `shapePath` — the same function that cuts the
// piece — so the two can never disagree about what fits where.

import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import PuzzleFigure from './PuzzleFigure';
import { PUZZLE_SHAPES, shapePath, type PuzzleShape } from '../../constants/puzzleShapes';
import { HALO } from '../../constants/depth';
import { COLORS, RADII } from '../../constants/nino';
import type { CountryData } from '../../constants/countries';

type Props = {
  country: CountryData;
  placed: Set<string>;
  /** The hole a carried piece would land in, if any. */
  highlighted: string | null;
  size: number;
  /** Reports a hole's centre in WINDOW coordinates. */
  onCellMeasured: (id: string, centre: { x: number; y: number }) => void;
};

export function PuzzleBoard({
  country,
  placed,
  highlighted,
  size,
  onCellMeasured,
}: Props) {
  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      {/* The picture, complete. The holes are punched on top of it. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <PuzzleFigure country={country} size={size} />
      </View>

      {PUZZLE_SHAPES.map((shape) => (
        <Hole
          key={shape.id}
          shape={shape}
          country={country}
          boardSize={size}
          filled={placed.has(shape.id)}
          glowing={highlighted === shape.id}
          onMeasured={onCellMeasured}
        />
      ))}
    </View>
  );
}

function Hole({
  shape,
  country,
  boardSize,
  filled,
  glowing,
  onMeasured,
}: {
  shape: PuzzleShape;
  country: CountryData;
  boardSize: number;
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
    transform: [{ scale: 1 + glow.value * 0.1 }],
  }));

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, w, h) => {
      onMeasured(shape.id, { x: x + w / 2, y: y + h / 2 });
    });
  }, [shape.id, onMeasured]);

  const s = shape.size * boardSize;
  const left = shape.cx * boardSize - s / 2;
  const top = shape.cy * boardSize - s / 2;
  const d = shapePath(shape.id, s);

  return (
    <View
      ref={ref}
      onLayout={measure}
      testID={`cell-${shape.id}`}
      style={[styles.hole, { width: s, height: s, left, top }]}
    >
      {/* The glow sits behind, in the hole's own silhouette. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, haloStyle]}>
        <Svg width={s} height={s}>
          <Path d={d} fill={HALO.color} />
        </Svg>
      </Animated.View>

      {filled ? (
        <PuzzleFigure country={country} size={boardSize} shape={shape} />
      ) : (
        // The empty socket: recessed, in EXACTLY the shape that fits it.
        <Svg width={s} height={s}>
          <Path
            d={d}
            fill="rgba(38, 25, 15, 0.55)"
            stroke={COLORS.ninoInk}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        </Svg>
      )}
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
  hole: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});

export default PuzzleBoard;
