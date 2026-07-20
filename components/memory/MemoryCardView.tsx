// components/memory/MemoryCardView.tsx
// One memory card: rotateY flip with an opacity crossfade, bounce ease.
// Card back = Nino's face on blue (§6). Matched cards pop a green ✓ pip.
//
// Purely presentational — every bit of state arrives as props.

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import NinoHead from '../../assets/mascot/nino-head.svg';
import { COLORS, MOTION, RADII, SHADOWS } from '../../constants/nino';
import type { CardStatus } from '../../hooks/useMemoryNL';

/**
 * Which face is visible at a given flip progress (0 = down, 1 = up).
 *
 * Occlusion is done with opacity ALONE — deliberately NOT with
 * backfaceVisibility as well. Using both hides the card entirely: face down,
 * the front is already at opacity 0, and the back (pre-rotated 180°) faces
 * away, so backfaceVisibility hides that too. Two independent hiding
 * mechanisms stacked, and nothing rendered at all.
 *
 * Exported so the invariant "exactly one face is visible, always" can be
 * tested without a render. That invariant is what broke.
 */
export function faceOpacity(progress: number): { front: number; back: number } {
  'worklet';
  // The directive above is load-bearing. This runs inside useAnimatedStyle,
  // which executes on the UI thread, and a worklet can only call other
  // worklets. Without it the card renders correctly on web (single thread, no
  // boundary) and silently fails on a real device — which is what shipped.

  // A hard switch at the midpoint, not a dissolve, so it reads as a flip.
  const showFront = progress >= 0.5;
  return { front: showFront ? 1 : 0, back: showFront ? 0 : 1 };
}

/**
 * The rotation each face carries, in degrees, at a given flip progress.
 *
 * A face is readable only when it points at the viewer — that is, when its
 * rotation is near 0 or 360, not near 180. Exported so that "the visible face
 * is always the one facing forward" can be asserted without a render.
 */
export function faceRotation(progress: number): { front: number; back: number } {
  const rotation = progress * 180;
  return { front: rotation + 180, back: rotation };
}

/** True when a rotation points at the viewer rather than away from it. */
export function facesViewer(degrees: number): boolean {
  const d = ((degrees % 360) + 360) % 360;
  return d < 90 || d > 270;
}

type Props = {
  emoji: string;
  tint: string;
  status: CardStatus;
  size: number;
  onPress: () => void;
  accessibilityLabel: string;
  /** Stable id for tests; the two faces get `-front` / `-back` suffixes. */
  testID?: string;
};

export function MemoryCardView({
  emoji,
  tint,
  status,
  size,
  onPress,
  accessibilityLabel,
  testID,
}: Props) {
  const faceUp = status !== 'down';

  const progress = useSharedValue(faceUp ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(faceUp ? 1 : 0, {
      duration: faceUp ? MOTION.flipOpen : MOTION.flipClose,
      easing: Easing.out(Easing.cubic),
    });
  }, [faceUp, progress]);

  // Matched pop, per §6 and the match-pulse spec in ANIMATION_GUIDELINES.
  useEffect(() => {
    if (status === 'matched') {
      pop.value = withSequence(
        withTiming(1.12, { duration: MOTION.matchPulse }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      );
    }
  }, [status, pop]);

  const rotation = useDerivedValue(() => progress.value * 180);

  // Which face carries the +180 offset matters, and it is easy to get backwards.
  //
  // The BACK (Nino) must face the viewer at rotation 0 — so it takes the raw
  // rotation. The FRONT (the item) must face the viewer at rotation 180 — so it
  // is pre-rotated another 180, landing at 360 when the card is open.
  //
  // Swapping these renders each face at the moment it is turned away, so the
  // card looks mirrored or blank at both ends of the flip. That was the bug.
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value + 180}deg` }],
    opacity: faceOpacity(progress.value).front,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value}deg` }],
    opacity: faceOpacity(progress.value).back,
  }));

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const height = size * 1.28;

  return (
    <Pressable
      onPress={onPress}
      disabled={status !== 'down'}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: status !== 'down' }}
      hitSlop={8}
      testID={testID}
    >
      <Animated.View style={[{ width: size, height }, popStyle]}>
        {/* Face down: Nino's head on brand blue. */}
        <Animated.View
          style={[styles.face, styles.back, backStyle]}
          testID={testID ? `${testID}-back` : undefined}
        >
          <NinoHead width={size * 0.68} height={size * 0.68} />
        </Animated.View>

        {/* Face up: the item on its soft tint. */}
        <Animated.View
          style={[
            styles.face,
            { backgroundColor: tint },
            status === 'matched' && styles.matched,
            frontStyle,
          ]}
          testID={testID ? `${testID}-front` : undefined}
        >
          <Text style={{ fontSize: size * 0.5 }} allowFontScaling={false}>
            {emoji}
          </Text>
          {status === 'matched' ? (
            <View style={styles.pip}>
              <Text style={styles.pipMark} allowFontScaling={false}>
                ✓
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADII.sm,
    borderWidth: 4,
    borderColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.chunkSm,
  },
  back: { backgroundColor: COLORS.blue },
  matched: { borderColor: COLORS.green },
  pip: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 30,
    height: 30,
    borderRadius: RADII.round,
    backgroundColor: COLORS.green,
    borderWidth: 3,
    borderColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipMark: { color: COLORS.paper, fontSize: 15, fontWeight: '900' },
});

export default MemoryCardView;
