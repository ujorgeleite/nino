// components/shapefit/DraggablePiece.tsx
// A tray piece the child drags onto the board — prompts/starting.md §7.
//
// COORDINATE MAPPING: the spec describes `getBoundingClientRect` ratios, which
// is a DOM API with no React Native equivalent. The RN answer is the gesture's
// absoluteX/absoluteY, reported in window space — and the sockets are measured
// in window space too (WoodBoard), so the two compare directly with no offset
// arithmetic. Reconstructing the point from a chain of parent offsets is what
// broke this game the first time.
//
// While dragging the piece rises to the front (elevated zIndex) and follows the
// finger with no transition, per §7.

import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, MOTION, RADII, SHADOWS } from '../../constants/nino';

/** Return-to-tray spring. Tuned for a fast retry, not for bounce. */
const RETURN_SPRING = { damping: 22, stiffness: 420, overshootClamping: true } as const;

type Props = {
  emoji: string;
  tint: string;
  size: number;
  /** Disabled once the piece is seated on the board. */
  seated: boolean;
  onLift: () => void;
  /** Drop point in WINDOW coordinates. Returns true if the piece seated. */
  onDrop: (point: { x: number; y: number }) => boolean;
  accessibilityLabel: string;
  testID?: string;
};

export function DraggablePiece({
  emoji,
  tint,
  size,
  seated,
  onLift,
  onDrop,
  accessibilityLabel,
  testID,
}: Props) {
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const lifted = useSharedValue(0);
  const wiggle = useSharedValue(0);

  // Idle wiggle invites the tap. It stops the moment the piece is seated.
  useEffect(() => {
    if (seated) {
      wiggle.value = withTiming(0, { duration: MOTION.press });
      return;
    }
    wiggle.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [seated, wiggle]);

  const settle = (didSeat: boolean) => {
    'worklet';
    if (didSeat) {
      // Seated pieces are re-rendered inside the socket; hide this one.
      lifted.value = withTiming(0, { duration: 120 });
      dx.value = 0;
      dy.value = 0;
      return;
    }
    // Rejected: spring home. Physical, not mechanical (ANIMATION_GUIDELINES).
    //
    // Snappy on purpose. An earlier damping 14 / stiffness 180 took 2.7s to
    // come to rest (measured in e2e) — far too slow for a 2-year-old, who
    // misses constantly and wants to try again immediately. A piece still
    // drifting home is also a moving target for the retry.
    lifted.value = withTiming(0, { duration: 140 });
    dx.value = withSpring(0, RETURN_SPRING);
    dy.value = withSpring(0, RETURN_SPRING);
  };

  const pan = Gesture.Pan()
    .enabled(!seated)
    // Toddlers press hard and drift; start dragging almost immediately.
    .minDistance(2)
    .onStart(() => {
      'worklet';
      lifted.value = withTiming(1, { duration: 120 });
      runOnJS(onLift)();
    })
    .onUpdate((e) => {
      'worklet';
      // No transition while dragging — the piece tracks the finger exactly.
      dx.value = e.translationX;
      dy.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      // Already window space — same as the measured sockets.
      // Hit-testing is JS-side state, so cross the thread boundary explicitly.
      runOnJS(resolve)({ x: e.absoluteX, y: e.absoluteY });
    });

  function resolve(point: { x: number; y: number }) {
    const didSeat = onDrop(point);
    settle(didSeat);
  }

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx.value },
      { translateY: dy.value },
      { rotate: `${wiggle.value}deg` },
      { scale: 1 + lifted.value * 0.12 },
    ],
    zIndex: lifted.value > 0 ? 20 : 1,
    opacity: seated ? 0 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.piece,
          { width: size, height: size, backgroundColor: tint },
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: seated }}
        testID={testID}
      >
        <Text style={{ fontSize: size * 0.52 }} allowFontScaling={false}>
          {emoji}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  piece: {
    borderRadius: RADII.md,
    borderWidth: 4,
    borderColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.chunkSm,
  },
});

export default DraggablePiece;
