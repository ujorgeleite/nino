// components/mascot/PedroMascot.tsx
// Pedro floats at the top of every game and reacts to events.
//
// NOTE: Custom Pedro Lottie files are not committed yet (see assets/lottie/README.md).
// Until they land we render a gently-floating placeholder so the app runs with zero
// setup. To upgrade: drop pedro-idle/celebrate/oops.json into assets/lottie and swap
// the placeholder <Text> for <LottieView source={...} /> keyed on `mood`.

import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ANIMATION } from '../../constants/theme';

export type PedroMood = 'idle' | 'celebrate' | 'oops';

type Props = {
  mood?: PedroMood;
  size?: number;
};

const FACE: Record<PedroMood, string> = {
  idle: '🧒',
  celebrate: '🥳',
  oops: '🙃',
};

export function PedroMascot({ mood = 'idle', size = 96 }: Props) {
  const y = useSharedValue(0);
  const scale = useSharedValue(1);

  // Gentle infinite float (idle breathing).
  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(-ANIMATION.floatAmplitude, {
          duration: ANIMATION.floatDuration,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(ANIMATION.floatAmplitude, {
          duration: ANIMATION.floatDuration,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
  }, [y]);

  // React to mood changes with a quick pop.
  useEffect(() => {
    if (mood === 'celebrate') {
      scale.value = withSequence(
        withTiming(1.25, { duration: 140 }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      );
    } else if (mood === 'oops') {
      scale.value = withSequence(
        withTiming(0.9, { duration: 120 }),
        withSpring(1, { damping: 10, stiffness: 220 }),
      );
    }
  }, [mood, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, style]}>
      <Text style={{ fontSize: size }} allowFontScaling={false}>
        {FACE[mood]}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PedroMascot;
