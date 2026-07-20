// components/puzzle/PuzzlePiece.tsx
// A crop of the picture, with weight, that a child drags onto the board.
//
// Shares the whole feel of the Shape Fit piece — lift, layered shadows, idle
// float, snap home — because that is the interaction a 2-year-old already
// preferred. What differs is what the piece SHOWS: a fragment of the country's
// landmark rather than an emoji, so assembling it builds a picture.

/* eslint-disable react-hooks/immutability --
 * This component drives an object with a finger, which in Reanimated means
 * writing shared values from gesture callbacks — `dx.value = e.translationX`
 * is the entire API. The rule models hook return values as immutable data,
 * which is right nearly everywhere and wrong for a drag.
 *
 * The same exemption applies to components/shapefit/DraggablePiece.tsx, and
 * nowhere else.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import PuzzleFigure from './PuzzleFigure';
import Solid from '../ui/Solid';
import { useFloat } from '../../hooks/useFloat';
import { COLORS, RADII } from '../../constants/nino';
import type { CountryData } from '../../constants/countries';
import type { PuzzleCell } from '../../hooks/usePuzzle';

const RETURN_SPRING = { damping: 22, stiffness: 420, overshootClamping: true } as const;
const SEAT_SPRING = { damping: 16, stiffness: 340 } as const;

export type PlaceResult = {
  placed: boolean;
  offset: { x: number; y: number } | null;
};

type Props = {
  country: CountryData;
  cell: PuzzleCell;
  rows: number;
  cols: number;
  /** Rendered size of this piece on screen. */
  size: number;
  placed: boolean;
  resolvePlacedOffset?: () => { x: number; y: number } | null;
  /** Bumped on reset so the piece JUMPS home instead of flying across. */
  round?: number;
  onGrab: () => void;
  onDragMove?: (point: { x: number; y: number }) => void;
  onDrop: (point: { x: number; y: number }) => PlaceResult;
  accessibilityLabel: string;
  testID?: string;
};

export function PuzzlePiece({
  country,
  cell,
  rows,
  cols,
  size,
  placed,
  resolvePlacedOffset,
  round = 0,
  onGrab,
  onDragMove,
  onDrop,
  accessibilityLabel,
  testID,
}: Props) {
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const restX = useSharedValue(0);
  const restY = useSharedValue(0);
  const elevation = useSharedValue(0);
  const held = useSharedValue(false);

  const float = useFloat(cell.id, !placed);

  const settle = (target: { x: number; y: number } | null, instant = false) => {
    'worklet';
    restX.value = target?.x ?? 0;
    restY.value = target?.y ?? 0;
    if (instant) {
      dx.value = restX.value;
      dy.value = restY.value;
      elevation.value = 0;
      return;
    }
    const spring = target ? SEAT_SPRING : RETURN_SPRING;
    dx.value = withSpring(restX.value, spring);
    dy.value = withSpring(restY.value, spring);
    elevation.value = withTiming(0, { duration: 180 });
  };

  const lastRound = useRef(round);

  useEffect(() => {
    const offset = placed ? (resolvePlacedOffset?.() ?? null) : null;
    const isNewRound = round !== lastRound.current;
    lastRound.current = round;
    settle(offset, isNewRound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, round]);

  function resolve(point: { x: number; y: number }) {
    const result = onDrop(point);
    settle(result.placed ? result.offset : null);
  }

  const pan = Gesture.Pan()
    .minDistance(2)
    .onStart(() => {
      'worklet';
      held.value = true;
      elevation.value = withSpring(1, { damping: 14, stiffness: 260 });
      runOnJS(onGrab)();
    })
    .onUpdate((e) => {
      'worklet';
      dx.value = restX.value + e.translationX;
      dy.value = restY.value + e.translationY;
      if (onDragMove) runOnJS(onDragMove)({ x: e.absoluteX, y: e.absoluteY });
    })
    .onEnd((e) => {
      'worklet';
      held.value = false;
      runOnJS(resolve)({ x: e.absoluteX, y: e.absoluteY });
    });

  const carryStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { translateY: dy.value }],
    zIndex: held.value ? 50 : placed ? 2 : 1,
    // A placed piece is drawn by the board; hiding this one avoids a double
    // image sitting a pixel off.
    opacity: placed && !held.value ? 0 : 1,
  }));

  // The crop is taken from a figure scaled to this piece's size, so the
  // fragment fills the piece rather than sitting small inside it.
  const cropFigureSize = size * cols;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.wrap, { width: size, height: size }, carryStyle]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        <Solid
          width={size}
          height={size}
          radius={RADII.sm}
          backgroundColor={country.palette.skyThere[1]}
          borderColor={COLORS.paper}
          borderWidth={4}
          elevation={elevation}
          offsetY={float.offsetY}
          tilt={float.tilt}
        >
          <View style={styles.crop}>
            <PuzzleFigure
              country={country}
              size={cropFigureSize}
              crop={{ row: cell.row, col: cell.col, rows, cols }}
            />
          </View>
        </Solid>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  crop: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

export default PuzzlePiece;
