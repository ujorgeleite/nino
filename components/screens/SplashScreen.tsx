// components/screens/SplashScreen.tsx
// Brand-blue gradient, Nino head bobbing, the "nino / THERE & BACK" lockup,
// three pulsing loading dots — prompts/starting.md §5a.
//
// Auto-advances to the Menu. The dots are decorative: fonts are already loaded
// by app/_layout.tsx before anything renders, so this is a brand beat, not a
// real progress indicator. It stays brief for that reason.

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Mascot from '../mascot/Mascot';
import { COLORS, MOTION, SPACING, TYPE } from '../../constants/nino';

/** How long the brand beat holds before advancing. */
export const SPLASH_MS = 1600;

type Props = {
  onDone: () => void;
};

export function SplashScreen({ onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, SPLASH_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <LinearGradient colors={[COLORS.blue, COLORS.blueDark]} style={styles.fill}>
      <View style={styles.center}>
        <Mascot pose="head" size={150} bob />

        <View style={styles.lockup}>
          <Text style={styles.wordmark} allowFontScaling={false}>
            nino
          </Text>
          <Text style={styles.tagline} allowFontScaling={false}>
            THERE &amp; BACK
          </Text>
        </View>

        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <Dot key={i} index={i} />
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

/** One loading dot, phase-offset so the three read as a travelling pulse. */
function Dot({ index }: { index: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      index * 160,
      withRepeat(
        withSequence(
          withTiming(1, { duration: MOTION.pulse / 2, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: MOTION.pulse / 2, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [index, t]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + t.value * 0.65,
    transform: [{ scale: 0.8 + t.value * 0.35 }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.s5 },
  lockup: { alignItems: 'center', gap: SPACING.s1 },
  wordmark: {
    fontFamily: TYPE.fontDisplay,
    fontSize: TYPE.sizes.logo,
    lineHeight: TYPE.sizes.logo * TYPE.lineHeight.tight,
    color: COLORS.paper,
  },
  tagline: {
    fontFamily: TYPE.fontBodyBold,
    fontSize: TYPE.sizes.label,
    letterSpacing: TYPE.trackingLogo,
    color: COLORS.sun,
  },
  dots: { flexDirection: 'row', gap: SPACING.s3, marginTop: SPACING.s4 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.paper,
  },
});

export default SplashScreen;
