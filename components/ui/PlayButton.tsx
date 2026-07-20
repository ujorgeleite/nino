// components/ui/PlayButton.tsx
// The giant round orange Play button — prompts/starting.md §5b.
// Breathes (scale→1.07, 1900ms) and emits an expanding ring on the same cycle.
//
// This is the single primary action on the Menu screen (TODDLER_UX.md).

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Glyph from './Glyph';
import { COLORS, LAYOUT, MOTION, SHADOWS } from '../../constants/nino';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  onPress: () => void;
  /** Diameter in pt. Spec calls for ~190; never below the 90pt floor. */
  size?: number;
  accessibilityLabel?: string;
};

export function PlayButton({ onPress, size = 190, accessibilityLabel = 'Play' }: Props) {
  const diameter = Math.max(LAYOUT.touchMin, size);

  const breathe = useSharedValue(1);
  const ring = useSharedValue(0);
  const press = useSharedValue(1);

  // Breathe + ring share one 1900ms cycle so they read as a single pulse.
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: MOTION.pulse / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: MOTION.pulse / 2, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    ring.value = withRepeat(
      withTiming(1, { duration: MOTION.pulse, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [breathe, ring]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value * press.value }],
  }));

  // The ring grows outward and fades — an emitted pulse, not a border.
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring.value * 0.35 }],
    opacity: (1 - ring.value) * 0.5,
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { width: diameter, height: diameter, borderRadius: diameter / 2 },
          ringStyle,
        ]}
      />
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          press.value = withTiming(0.94, { duration: 90 });
        }}
        onPressOut={() => {
          // Bounce ease, per spec §1: cubic-bezier(.34,1.56,.64,1).
          press.value = withSpring(1, { damping: 9, stiffness: 220 });
        }}
        hitSlop={16}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.button,
          { width: diameter, height: diameter, borderRadius: diameter / 2 },
          buttonStyle,
        ]}
      >
        <Glyph name="play" size={diameter * 0.42} color={COLORS.actionPrimaryInk} weight={4} />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    backgroundColor: COLORS.actionPrimary,
  },
  button: {
    backgroundColor: COLORS.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: COLORS.paper,
    ...SHADOWS.chunkLg,
  },
});

export default PlayButton;
