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
  type SharedValue,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import PuzzleFigure, { PartSocket } from './PuzzleFigure';
import { castShadow, HALO } from '../../constants/depth';
import { COLORS, RADII, type NinoMode } from '../../constants/nino';
import type { FigurePart } from '../../constants/figureParts';
import type { CountryData } from '../../constants/countries';

type Props = {
  country: CountryData;
  parts: readonly FigurePart[];
  placed: Set<string>;
  /** The socket a carried piece would land in, if any. */
  highlighted: string | null;
  size: number;
  /** Drives whether the empty recesses breathe in step or out of it. */
  mode?: NinoMode;
  /** Reports a socket's centre in WINDOW coordinates. */
  onCellMeasured: (id: string, centre: { x: number; y: number }) => void;
};

/** The panel's timber, and a few grain lines so it is a surface not a slab. */
/**
 * Pale birch rather than the deep orange of the wood sub-system.
 *
 * The darker timber fought the recesses: a shadowed red or yellow sitting on
 * a strongly orange board is barely a different colour, and colour is the
 * whole instruction. A quieter panel lets every socket keep its hue, and is
 * the more minimal surface besides.
 */
const WOOD = { light: '#EBD4B4', mid: '#D8B98D' } as const;

/** One full breath of the empty recesses, in ms. Slow: an invitation, not a nag. */
const BREATH_MS = 2600;

export function PuzzleBoard({
  country,
  parts,
  placed,
  highlighted,
  size,
  mode = 'there',
  onCellMeasured,
}: Props) {
  // ONE ANIMATION DRIVES EVERY RECESS.
  //
  // An empty socket breathes, so the board is alive and asks to be filled
  // rather than sitting there as a diagram. Giving each socket its own loop
  // would have spent the whole ambient budget (CountryScene allows three:
  // sky drift, sun, windmill), so a single clock runs here and each recess
  // reads its own phase from it.
  const breath = useSharedValue(0);

  React.useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, { duration: BREATH_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [breath]);

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      {/* 1. The panel: plain timber. Grain lines were tried and removed —
             at this size they read as clutter across the recesses, and the
             board's job is to disappear behind the shapes cut into it. */}
      <LinearGradient
        colors={[WOOD.light, WOOD.mid]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 2. The recesses. */}
      {parts.map((part, index) => (
        <Socket
          key={part.id}
          part={part}
          country={country}
          boardSize={size}
          filled={placed.has(part.id)}
          glowing={highlighted === part.id}
          breath={breath}
          // THERE is scattered and playful, BACK is aligned and calm — the
          // project's mode contract, applied to the breathing: by day the
          // recesses pulse out of step with each other, at bedtime together.
          phase={mode === 'back' ? 0 : index / Math.max(parts.length, 1)}
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
  breath,
  phase,
  onMeasured,
}: {
  part: FigurePart;
  country: CountryData;
  boardSize: number;
  filled: boolean;
  glowing: boolean;
  breath: SharedValue<number>;
  phase: number;
  onMeasured: (id: string, centre: { x: number; y: number }) => void;
}) {
  const ref = useRef<View | null>(null);
  const glow = useSharedValue(0);

  React.useEffect(() => {
    glow.value = withTiming(glowing ? 1 : 0, { duration: 150 });
  }, [glowing, glow]);

  // The breath: a slow swell, strongest when nothing is carried, and gone the
  // moment a piece is overhead so it never competes with the drop preview.
  const breathStyle = useAnimatedStyle(() => {
    'worklet';
    if (filled) return { opacity: 0, transform: [{ scale: 1 }] };
    const t = (breath.value + phase) % 1;
    // A sine over the cycle: no seam where it wraps, unlike a triangle.
    const swell = (1 - Math.cos(t * 2 * Math.PI)) / 2;
    const strength = swell * (1 - glow.value);
    return {
      opacity: 0.06 + strength * 0.16,
      transform: [{ scale: 1 + strength * 0.03 }],
    };
  });

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
      {/* The breath, in the recess's own silhouette. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, breathStyle]}>
        <PartSocket part={part} size={boardSize} fill="#FFFFFF" />
      </Animated.View>

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
  socket: { position: 'absolute' },
});

export default PuzzleBoard;
