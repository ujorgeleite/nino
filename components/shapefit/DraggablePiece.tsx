// components/shapefit/DraggablePiece.tsx
// A piece the child picks up, carries, and drops into the board.
//
// THIS IS THE MOMENT THE WHOLE APP IS BUILT AROUND. A 2-year-old preferred
// this game over Memory, and the reason is agency: here the object comes
// under their control. Everything below exists to make that feel physical.
//
// WHAT HAPPENS WHEN A FINGER LANDS:
//
//   1. The piece LIFTS — it scales up, rises, and its contact shadow shrinks
//      and fades while its cast shadow grows and drifts. Three cues moving
//      together is what reads as "off the ground" rather than "bigger".
//   2. It stops idling. A floating piece that keeps bobbing while held feels
//      unattached to the finger.
//   3. Over a valid socket, that socket glows. The child does not have to
//      guess whether they are close enough — the board tells them.
//   4. On release it either snaps home with a suction-and-thunk, or settles
//      back with a soft, verdict-free landing.
//
// Undoing is deliberately easy: a seated piece can be dragged back out. There
// is no wrong move to protect against, so there is nothing to lock.

/* eslint-disable react-hooks/immutability --
 * This component drives an object with a finger, which in Reanimated means
 * writing shared values from gesture callbacks — `dx.value = e.translationX`
 * is the entire API. react-hooks/immutability models hook return values as
 * immutable data, which is right nearly everywhere and wrong for a drag.
 *
 * The rule stays ON everywhere else. Only files that push pixels from a
 * gesture get this exemption, and there are two of them.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Solid from '../ui/Solid';
import { useFloat } from '../../hooks/useFloat';
import { COLORS, RADII } from '../../constants/nino';

/** Return-to-tray spring. Snappy — a child who misses wants to try again now. */
const RETURN_SPRING = { damping: 22, stiffness: 420, overshootClamping: true } as const;

/** Settle-into-socket spring. Slightly looser, so seating has a tiny bounce. */
const SEAT_SPRING = { damping: 16, stiffness: 340 } as const;

export type DropResult = {
  /** Did the piece seat? */
  seated: boolean;
  /** Where it should end up, relative to its own origin. Null means home. */
  offset: { x: number; y: number } | null;
};

type Props = {
  emoji: string;
  tint: string;
  size: number;
  /** True once the piece is in its socket. It can still be dragged back out. */
  seated: boolean;
  /**
   * Where the piece sits when seated, relative to its tray home.
   *
   * A function, not a value: the offset comes from measurements the parent
   * holds in refs, and reading a ref during the parent's render is both
   * fragile and flagged by react-hooks/refs.
   */
  resolveSeatedOffset?: () => { x: number; y: number } | null;
  onGrab: () => void;
  /** Called continuously while dragging, in window coordinates. */
  onDragMove?: (point: { x: number; y: number }) => void;
  onDrop: (point: { x: number; y: number }) => DropResult;
  accessibilityLabel: string;
  testID?: string;
};

export function DraggablePiece({
  emoji,
  tint,
  size,
  seated,
  resolveSeatedOffset,
  onGrab,
  onDragMove,
  onDrop,
  accessibilityLabel,
  testID,
}: Props) {
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const elevation = useSharedValue(0);
  const held = useSharedValue(false);
  // Where the piece rests between drags — tray home, or its socket.
  const restX = useSharedValue(0);
  const restY = useSharedValue(0);

  // Idle float stops while held and while seated: a seated piece is part of
  // the board now, and a held one belongs to the finger.
  const float = useFloat(testID ?? emoji, !seated);

  /**
   * Moves the piece to wherever the drop decided it belongs.
   *
   * A worklet, because it is called back from the gesture's UI-thread work and
   * writes shared values. Marking it as one is also what stops
   * react-hooks/immutability reading these as render-time mutations.
   */
  const settle = (target: { x: number; y: number } | null) => {
    'worklet';
    const spring = target ? SEAT_SPRING : RETURN_SPRING;
    restX.value = target?.x ?? 0;
    restY.value = target?.y ?? 0;
    dx.value = withSpring(restX.value, spring);
    dy.value = withSpring(restY.value, spring);
    elevation.value = withTiming(0, { duration: 180 });
  };

  // Follow the seated position when the game state changes from outside —
  // a restart, or the piece being placed by something other than this drag.
  useEffect(() => {
    // Read inside the effect, after layout has committed — never during render.
    const offset = seated ? (resolveSeatedOffset?.() ?? null) : null;
    settle(offset);
    // `settle` writes shared values, which are stable identities; including it
    // here would re-run the effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seated]);

  function resolve(point: { x: number; y: number }) {
    const result = onDrop(point);
    settle(result.seated ? result.offset : null);
  }

  const pan = Gesture.Pan()
    // Toddlers press hard and drift; start almost immediately.
    .minDistance(2)
    .onStart(() => {
      'worklet';
      held.value = true;
      // The lift is a spring, not a ramp — it should feel like the piece
      // jumps into the hand.
      elevation.value = withSpring(1, { damping: 14, stiffness: 260 });
      runOnJS(onGrab)();
    })
    .onUpdate((e) => {
      'worklet';
      // No easing while dragging: the piece tracks the finger exactly.
      // Carry from wherever the piece currently rests.
      dx.value = restX.value + e.translationX;
      dy.value = restY.value + e.translationY;
      if (onDragMove) runOnJS(onDragMove)({ x: e.absoluteX, y: e.absoluteY });
    })
    .onEnd((e) => {
      'worklet';
      held.value = false;
      // Sockets are measured in window space, so no conversion is needed.
      runOnJS(resolve)({ x: e.absoluteX, y: e.absoluteY });
    });

  const carryStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { translateY: dy.value }],
    // A held piece must render above every other piece and above the board.
    zIndex: held.value ? 50 : seated ? 2 : 1,
  }));

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
          radius={RADII.md}
          backgroundColor={tint}
          borderColor={COLORS.paper}
          borderWidth={5}
          elevation={elevation}
          offsetY={float.offsetY}
          tilt={float.tilt}
        >
          <Text style={{ fontSize: size * 0.5 }} allowFontScaling={false}>
            {emoji}
          </Text>
        </Solid>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});

export default DraggablePiece;
