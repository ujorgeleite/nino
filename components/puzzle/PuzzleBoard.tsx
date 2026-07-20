// components/puzzle/PuzzleBoard.tsx
// The picture being assembled.
//
// THREE LAYERS, and the order is the design:
//   1. the BACKGROUND — fixed, and deliberately NEUTRAL once play starts.
//      The country's own sky is shown first, for a moment, so the child sees
//      where they are; it then fades to a flat dark neutral. A picture made of
//      coloured parts needs the strongest possible separation from what is
//      behind it, and a scenic gradient competes with the very shapes the
//      child is meant to read. So the scene introduces, and the neutral plays.
//   2. the GHOST — the whole drawing, very faint. It shows what the picture
//      will be, which is what makes dragging have a purpose for a child who
//      cannot hold the goal in their head.
//   3. the PARTS — each either an empty socket in its own silhouette, or the
//      real artwork once its piece has been placed.
//
// A socket is drawn from the same path as the piece that fills it, so the two
// can never disagree about what fits where.

import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import PuzzleFigure, { PartSocket } from './PuzzleFigure';
import { HALO } from '../../constants/depth';
import { COLORS, RADII } from '../../constants/nino';
import type { FigurePart } from '../../constants/figureParts';
import type { CountryData } from '../../constants/countries';

type Props = {
  country: CountryData;
  parts: readonly FigurePart[];
  placed: Set<string>;
  /** The socket a carried piece would land in, if any. */
  highlighted: string | null;
  size: number;
  /** True while the opening reveal of the country's scene is still showing. */
  intro: boolean;
  /** Reports a socket's centre in WINDOW coordinates. */
  onCellMeasured: (id: string, centre: { x: number; y: number }) => void;
};

export function PuzzleBoard({
  country,
  parts,
  placed,
  highlighted,
  size,
  intro,
  onCellMeasured,
}: Props) {
  const scenery = useSharedValue(1);

  React.useEffect(() => {
    scenery.value = withTiming(intro ? 1 : 0, { duration: 620 });
  }, [intro, scenery]);

  const sceneryStyle = useAnimatedStyle(() => ({ opacity: scenery.value }));

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      {/* 1a. The neutral the game is actually played against. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.neutral]} />

      {/* 1b. The country's scene, shown at the start and then faded away. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, sceneryStyle]}
      >
        <LinearGradient
          colors={[country.palette.skyThere[0], country.palette.skyThere[1]]}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.ground,
            { height: size * 0.18, backgroundColor: country.palette.ground },
          ]}
        />
      </Animated.View>

      {/* 2. The ghost: what the picture will be. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <PuzzleFigure country={country} size={size} ghost />
      </View>

      {/* 3. The parts. */}
      {parts.map((part) => (
        <Socket
          key={part.id}
          part={part}
          country={country}
          boardSize={size}
          filled={placed.has(part.id)}
          glowing={highlighted === part.id}
          onMeasured={onCellMeasured}
        />
      ))}
    </View>
  );
}

function Socket({
  part,
  country,
  boardSize,
  filled,
  glowing,
  onMeasured,
}: {
  part: FigurePart;
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
    transform: [{ scale: 1 + glow.value * 0.08 }],
  }));

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, w, h) => {
      onMeasured(part.id, { x: x + w / 2, y: y + h / 2 });
    });
  }, [part.id, onMeasured]);

  const [bx, by, bw, bh] = part.box;
  const left = (bx / 100) * boardSize;
  const top = (by / 100) * boardSize;
  const w = (bw / 100) * boardSize;
  const h = (bh / 100) * boardSize;

  return (
    <View
      ref={ref}
      onLayout={measure}
      testID={`cell-${part.id}`}
      style={[styles.socket, { left, top, width: w, height: h }]}
    >
      {/* The glow takes the socket's own silhouette, not a rectangle. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, haloStyle]}>
        <PartSocket part={part} size={boardSize} fill={HALO.color} />
      </Animated.View>

      {filled ? (
        <PuzzleFigure country={country} size={boardSize} part={part} />
      ) : (
        <PartSocket part={part} size={boardSize} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: RADII.lg,
    borderWidth: 5,
    borderColor: COLORS.ninoInk,
    overflow: 'hidden',
  },
  // Dark, flat and colourless: coloured parts separate from it far better than
  // from any scene, and nothing on it competes for the child's attention.
  neutral: { backgroundColor: COLORS.playSurface },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  socket: { position: 'absolute' },
});

export default PuzzleBoard;
