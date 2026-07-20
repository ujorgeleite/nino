// components/memory/MemoryCardView.tsx
// A memory card with weight.
//
// WHY THIS WAS REBUILT
//
// A 2-year-old preferred Shape Fit to this game, and the difference was not
// the rules — it was that in Shape Fit the object responds to the hand. Here
// the child tapped and watched. The card never felt like a thing.
//
// So the card now behaves like an object:
//   - it floats, with its own phase, so it reads as resting ON the board
//     rather than printed on it
//   - pressing it PUSHES IT DOWN into the board before it flips, the way a
//     real card would give under a finger
//   - the flip lifts it off the surface and sets it back down
//   - a matched pair rises together and holds, so the reward is the pair
//     becoming one object
//
// FLIP GEOMETRY, which has now broken twice:
//   - occlusion is by opacity ALONE, never also backfaceVisibility. Both at
//     once hid the card completely.
//   - the BACK takes the raw rotation and the FRONT is pre-rotated 180, so
//     each faces the viewer at the moment it is shown. Swapping them renders
//     whichever face is turned away.
// Both invariants are asserted in MemoryCardView.test.ts.

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
import Solid from '../ui/Solid';
import { useFloat } from '../../hooks/useFloat';
import { COLORS, MOTION, RADII } from '../../constants/nino';
import type { CardStatus } from '../../hooks/useMemoryNL';

/**
 * Which face is visible at a given flip progress (0 = down, 1 = up).
 *
 * A worklet: called from inside useAnimatedStyle, which runs on the UI
 * thread, where only worklets exist. Without the directive the card renders
 * correctly on web and silently fails on device — which is what shipped.
 */
export function faceOpacity(progress: number): { front: number; back: number } {
  'worklet';
  const showFront = progress >= 0.5;
  return { front: showFront ? 1 : 0, back: showFront ? 0 : 1 };
}

/** The rotation each face carries, in degrees, at a given flip progress. */
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
  const matched = status === 'matched';

  const progress = useSharedValue(faceUp ? 1 : 0);
  const elevation = useSharedValue(0);
  const press = useSharedValue(0);

  // A face-down card floats; a matched one has settled into the board.
  const float = useFloat(testID ?? emoji, !matched);

  // The flip: lift off the surface, turn, set back down.
  useEffect(() => {
    progress.value = withTiming(faceUp ? 1 : 0, {
      duration: faceUp ? MOTION.flipOpen : MOTION.flipClose,
      easing: Easing.out(Easing.cubic),
    });
    // Lift, turn, set down — and a matched card settles HIGHER than the rest,
    // so a found pair visibly sits above the board it came from.
    //
    // One effect owns `elevation`. A second one writing it would both fight
    // this sequence and read as mutating a hook dependency.
    elevation.value = withSequence(
      withTiming(1, { duration: 140 }),
      withTiming(matched ? 0.45 : 0, { duration: 260 }),
    );
  }, [faceUp, matched, progress, elevation]);

  const rotation = useDerivedValue(() => progress.value * 180);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value + 180}deg` }],
    opacity: faceOpacity(progress.value).front,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value}deg` }],
    opacity: faceOpacity(progress.value).back,
  }));

  // Press pushes the card INTO the board — the give a real card would have.
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.05 }, { translateY: press.value * 3 }],
  }));

  const height = size * 1.28;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 12, stiffness: 320 });
      }}
      disabled={status !== 'down'}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: status !== 'down' }}
      hitSlop={10}
      testID={testID}
    >
      <Animated.View style={[{ width: size, height }, pressStyle]}>
        {/* Face down: Nino on brand blue. */}
        <Animated.View
          style={[styles.face, backStyle]}
          testID={testID ? `${testID}-back` : undefined}
        >
          <Solid
            width={size}
            height={height}
            radius={RADII.md}
            backgroundColor={COLORS.blue}
            borderColor={COLORS.paper}
            borderWidth={5}
            elevation={elevation}
            offsetY={float.offsetY}
            tilt={float.tilt}
          >
            <NinoHead width={size * 0.66} height={size * 0.66} />
          </Solid>
        </Animated.View>

        {/* Face up: the item on its tint. */}
        <Animated.View
          style={[styles.face, frontStyle]}
          testID={testID ? `${testID}-front` : undefined}
        >
          <Solid
            width={size}
            height={height}
            radius={RADII.md}
            backgroundColor={tint}
            borderColor={matched ? COLORS.green : COLORS.paper}
            borderWidth={5}
            elevation={elevation}
            offsetY={float.offsetY}
            tilt={float.tilt}
          >
            <Text style={{ fontSize: size * 0.52 }} allowFontScaling={false}>
              {emoji}
            </Text>
            {matched ? (
              <View style={styles.pip}>
                <Text style={styles.pipMark} allowFontScaling={false}>
                  ✓
                </Text>
              </View>
            ) : null}
          </Solid>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { position: 'absolute', top: 0, left: 0, backfaceVisibility: 'visible' },
  pip: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 34,
    height: 34,
    borderRadius: RADII.round,
    backgroundColor: COLORS.green,
    borderWidth: 3,
    borderColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipMark: { color: COLORS.paper, fontSize: 17, fontWeight: '900' },
});

export default MemoryCardView;
