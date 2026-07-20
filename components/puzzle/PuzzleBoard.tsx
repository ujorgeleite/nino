// components/puzzle/PuzzleBoard.tsx
// The picture being assembled.
//
// THREE LAYERS, and the order is the design:
//   1. the BOARD — a wooden panel. Not the country's sky: a socket painted
//      onto a landscape read as decoration, a shape drawn ON the board rather
//      than a hole IN it, and it was not obvious that anything was meant to go
//      inside. A wooden tray with recesses cut into it is a thing every
//      toddler has already handled, and it says what to do without a word.
//      It is also the one warm, lit object on the screen: the landscape around
//      it is greyed (constants/quietCountry.ts), so the panel and the coloured
//      pieces own every colour a child sees.
//   2. the RECESSES — each either an empty socket carved in its own
//      silhouette and tinted with its piece's colour, or the piece itself once
//      it has been placed.
//
// A socket is drawn from the same path as the piece that fills it, so the two
// can never disagree about what fits where.
//
// There is no longer a ghost of the finished picture behind them. It existed
// to say what the puzzle would become, and once every recess carried its own
// colour it added nothing but noise over the top of them.

import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import PuzzleFigure, { PartSocket } from './PuzzleFigure';
import { castShadow, HALO } from '../../constants/depth';
import { COLORS, RADII } from '../../constants/nino';
import { COLORS as WOOD_TOKENS } from '../../constants/theme';
import type { FigurePart } from '../../constants/figureParts';
import type { CountryData } from '../../constants/countries';

type Props = {
  country: CountryData;
  parts: readonly FigurePart[];
  placed: Set<string>;
  /** The socket a carried piece would land in, if any. */
  highlighted: string | null;
  size: number;
  /** Reports a socket's centre in WINDOW coordinates. */
  onCellMeasured: (id: string, centre: { x: number; y: number }) => void;
};

/** The panel's timber, and a few grain lines so it is a surface not a slab. */
const WOOD = {
  light: WOOD_TOKENS.woodLight,
  mid: WOOD_TOKENS.woodMid,
  grain: WOOD_TOKENS.woodGrainRgba,
} as const;
const GRAIN = [11, 27, 44, 58, 73, 89] as const;

export function PuzzleBoard({
  country,
  parts,
  placed,
  highlighted,
  size,
  onCellMeasured,
}: Props) {
  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      {/* 1. The panel: wood, with a little grain so it reads as a surface. */}
      <LinearGradient
        colors={[WOOD.light, WOOD.mid]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {GRAIN.map((top) => (
          <View
            key={top}
            style={[styles.grain, { top: `${top}%`, backgroundColor: WOOD.grain }]}
          />
        ))}
      </View>

      {/* 2. The recesses. */}
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
    // The square is the subject of the screen, so it is lit like one: a heavy
    // drop shadow lifts it off the grey landscape behind it.
    ...castShadow(1),
  },
  grain: { position: 'absolute', left: 0, right: 0, height: 2 },
  socket: { position: 'absolute' },
});

export default PuzzleBoard;
