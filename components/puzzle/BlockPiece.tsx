// components/puzzle/BlockPiece.tsx
// A block the child picks up and carries to the board.
//
// The block WAITS in the tray with a slow wiggle, so the tray looks alive and
// asks to be touched; it stops the moment it is lifted, because a thing being
// carried should be still under the finger. On a good drop it snaps exactly
// into its hole and locks; on a bad one it walks back to the tray and nothing
// is lost — a wrong move is never a penalty here (CLAUDE.md rule 2).

/* eslint-disable react-hooks/immutability --
 * This component drives an object with a finger, which in Reanimated means
 * writing shared values from gesture callbacks — `dx.value = e.translationX`
 * is the entire API. The rule models hook return values as immutable data,
 * which is right nearly everywhere and wrong for a drag.
 *
 * The same exemption applies to components/shapefit/DraggablePiece.tsx.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import BlockShape from './BlockShape';
import type { Block } from '../../constants/landmarks';
import { LAYOUT } from '../../constants/nino';

/** Firm and quick: a block that drifts home slowly feels broken, not gentle. */
const HOME_SPRING = { damping: 22, stiffness: 420, overshootClamping: true } as const;
/** A little bounce as it seats — the reward for getting it right. */
const SEAT_SPRING = { damping: 15, stiffness: 320 } as const;

/** One full wiggle. Slow on purpose: this is the calm game. */
const WIGGLE_MS = 2800;

export type DropResult = {
  placed: boolean;
  /** Where to sit, relative to the tray slot, once placed. */
  offset: { x: number; y: number } | null;
};

type Props = {
  block: Block;
  /** The board's size — the block is drawn at exactly the board's scale. */
  boardSize: number;
  /** How large the block sits in the tray, as a share of its true size. */
  restScale: number;
  placed: boolean;
  resolvePlacedOffset?: () => { x: number; y: number } | null;
  /** Bumped on restart so a block JUMPS home instead of flying across. */
  round?: number;
  onGrab: () => void;
  onDrop: (point: { x: number; y: number }) => DropResult;
  accessibilityLabel: string;
  testID?: string;
};

export function BlockPiece({
  block,
  boardSize,
  restScale,
  placed,
  resolvePlacedOffset,
  round = 0,
  onGrab,
  onDrop,
  accessibilityLabel,
  testID,
}: Props) {
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const restX = useSharedValue(0);
  const restY = useSharedValue(0);
  const held = useSharedValue(false);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    // One loop per block, started once. It is cheap — a single driver value —
    // and it is what makes the tray look like toys rather than a list.
    wiggle.value = withRepeat(
      withTiming(1, { duration: WIGGLE_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [wiggle]);

  const settle = (target: { x: number; y: number } | null, instant = false) => {
    'worklet';
    restX.value = target?.x ?? 0;
    restY.value = target?.y ?? 0;
    if (instant) {
      dx.value = restX.value;
      dy.value = restY.value;
      return;
    }
    const spring = target ? SEAT_SPRING : HOME_SPRING;
    dx.value = withSpring(restX.value, spring);
    dy.value = withSpring(restY.value, spring);
  };

  const lastRound = useRef(round);

  useEffect(() => {
    const offset = placed ? (resolvePlacedOffset?.() ?? null) : null;
    const isNewRound = round !== lastRound.current;
    lastRound.current = round;
    settle(offset, isNewRound);
    // The pop-in lives on the BOARD's hole, not here: a placed block is drawn
    // by the board and this view is hidden, so a pop played on it would be
    // invisible. See BlockPuzzleBoard's Hole.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, round]);

  function resolve(point: { x: number; y: number }) {
    const result = onDrop(point);
    settle(result.placed ? result.offset : null);
  }

  const pan = Gesture.Pan()
    .minDistance(2)
    .enabled(!placed)
    .onStart(() => {
      'worklet';
      held.value = true;
      runOnJS(onGrab)();
    })
    .onUpdate((e) => {
      'worklet';
      // No easing while dragging: the block belongs under the finger exactly.
      dx.value = restX.value + e.translationX;
      dy.value = restY.value + e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      held.value = false;
      runOnJS(resolve)({ x: e.absoluteX, y: e.absoluteY });
    });

  const [, , bw, bh] = block.box;
  const artW = (bw / 100) * boardSize * restScale;
  const artH = (bh / 100) * boardSize * restScale;

  // The touch box floor is ABSOLUTE. A door is a narrow block, and 90pt is a
  // fact about fingers rather than a proportion of anything on screen.
  const touchW = Math.max(artW, LAYOUT.touchMin);
  const touchH = Math.max(artH, LAYOUT.touchMin);

  const carryStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { translateY: dy.value }],
    // Lifted blocks go in front of everything, including the board.
    zIndex: held.value ? 50 : placed ? 2 : 1,
    // A placed block is drawn by the board; hiding this one avoids a double
    // image sitting a pixel off.
    opacity: placed && !held.value ? 0 : 1,
  }));

  const bodyStyle = useAnimatedStyle(() => {
    'worklet';
    // Still while carried, and still once placed. Only waiting blocks wiggle.
    const idle = held.value || placed ? 0 : 1;
    const phase = wiggle.value * 2 * Math.PI;
    // Scaling UP from the resting size, never down from full size: a
    // transform does not change layout, so drawing at full size and shrinking
    // it visually left the view its FULL width and it spilled out of the tray
    // and off the screen — with every bounding-box test still passing.
    const grown = 1 + (held.value ? 1 / restScale - 1 : 0);
    return {
      transform: [
        { translateY: Math.sin(phase) * 3 * idle },
        { rotate: `${Math.sin(phase + 1) * 3 * idle}deg` },
        { scale: grown },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.wrap, { width: touchW, height: touchH }, carryStyle]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {/* testID on the ARTWORK, not the touch box: e2e/puzzle-art.spec.ts
            measures how much of a block stands out from the scene behind it,
            and a narrow block inside a square 90pt target would read as mostly
            empty however well it is drawn. */}
        <Animated.View
          style={[styles.block, bodyStyle]}
          testID={testID ? `art-${testID.replace('piece-', '')}` : undefined}
        >
          <BlockShape block={block} boardSize={boardSize * restScale} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  block: {
    // The flat drop shadow that gives a block its thickness.
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
});

export default BlockPiece;
