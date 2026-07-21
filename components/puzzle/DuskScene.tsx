// components/puzzle/DuskScene.tsx
// Late evening, behind the block puzzle.
//
// THIS GAME IS ALWAYS DUSK, and that is a deliberate exception.
//
// Everywhere else in the app the scene follows the two modes — There is bright
// and scattered, Back is dim and aligned (docs/DESIGN_SYSTEM.md). The block
// puzzle is a Back game by nature: slow, tidy, three big pieces, no hurry. So
// it wears the evening whatever the toggle says, rather than being cheerful in
// the morning and calm at night. If the mode toggle should still reach it, that
// is a product decision to make deliberately, not by leaving this ambiguous.
//
// The grey it replaces was harsh rather than cosy — a neutral backdrop chosen
// to make coloured pieces pop, which worked and looked like a warehouse.
//
// THE MOON ANSWERS A POKE, and that is not decoration.
//
// Every scene in this app rewards curiosity — a child who touches something
// should get something back — and the first version of this screen quietly
// dropped that when it replaced the shared CountryScene. A calm game does not
// mean an inert one; it means the reward is a swell of light rather than a
// bounce and a squeak.
//
// PERFORMANCE: one Svg for everything static, and two drifting clouds sharing a
// single animation clock. CountryScene budgets three ambient loops on screen;
// this spends one.

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useFeedback } from '../../hooks/useFeedback';
import Svg, { Circle, Defs, Rect, RadialGradient, Stop } from 'react-native-svg';

const SKY = ['#4A5B82', '#37476B'] as const;
const GROUND = ['#2C3A5A', '#25324F'] as const;
const HORIZON = 0.48;
const SKYLINE = '#1B2540';
const CLOUD = '#5A6B90';

/** One full pass of the clouds across the sky. Slow: this is the calm game. */
const DRIFT_MS = 46_000;

/**
 * A city on the horizon, as one path of rooftops.
 *
 * Deliberately vague and very faint — it says "a town at night" and must never
 * pull attention off the board. Drawn once, never animated.
 */
const ROOFS = [
  [0.02, 0.42],
  [0.08, 0.62],
  [0.14, 0.36],
  [0.2, 0.7],
  [0.27, 0.48],
  [0.34, 0.8],
  [0.41, 0.44],
  [0.48, 0.66],
  [0.55, 0.38],
  [0.62, 0.74],
  [0.69, 0.5],
  [0.76, 0.84],
  [0.83, 0.46],
  [0.9, 0.64],
  [0.97, 0.4],
] as const;

export function DuskScene({ children }: { children?: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const feedback = useFeedback();
  const drift = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [drift]);

  const cloudsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -drift.value * width }],
  }));

  const moonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + glow.value * 0.09 }],
    opacity: 0.85 + glow.value * 0.15,
  }));

  const pokeMoon = () => {
    feedback('tap');
    glow.value = withSequence(
      withTiming(1, { duration: 180 }),
      withTiming(0, { duration: 620 }),
    );
  };

  const horizon = height * HORIZON;
  const moon = Math.min(width, height) * 0.11;
  const skylineHeight = height * 0.16;

  return (
    <View style={styles.root}>
      <LinearGradient colors={[SKY[0], SKY[1]]} style={{ height: horizon }} />
      <LinearGradient
        colors={[GROUND[0], GROUND[1]]}
        style={[styles.ground, { top: horizon }]}
      />

      {/* THE MOON, and only the DISC answers a touch.
          The glow is three times the moon's width, and a Pressable that size
          reached across the top of the tray — it would have quietly swallowed
          the drag on whichever block was dealt first. The glow is drawn
          underneath and takes no touches; the button is the disc alone. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.moonGlow,
          { right: width * 0.08, top: height * 0.04, width: moon * 3, height: moon * 3 },
          moonStyle,
        ]}
      >
        <Svg width={moon * 3} height={moon * 3}>
          <Defs>
            <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFF4D6" stopOpacity={0.34} />
              <Stop offset="100%" stopColor="#FFF4D6" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="moonBody" cx="38%" cy="34%" r="72%">
              <Stop offset="0%" stopColor="#FFF4D6" />
              <Stop offset="100%" stopColor="#F3E3A8" />
            </RadialGradient>
          </Defs>
          <Circle cx={moon * 1.5} cy={moon * 1.5} r={moon * 1.5} fill="url(#moonGlow)" />
          <Circle cx={moon * 1.5} cy={moon * 1.5} r={moon * 0.62} fill="url(#moonBody)" />
        </Svg>
      </Animated.View>

      <Pressable
        onPress={pokeMoon}
        accessibilityRole="button"
        accessibilityLabel="The moon"
        testID="egg-moon"
        style={{
          position: 'absolute',
          right: width * 0.08 + moon * 0.88,
          top: height * 0.04 + moon * 0.88,
          width: moon * 1.24,
          height: moon * 1.24,
          borderRadius: moon * 0.62,
        }}
      />

      {/* Two cloud pills, drifting. Doubled so the loop has no seam. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.clouds, { width: width * 2, height: horizon }, cloudsStyle]}
      >
        {[0, 1].map((copy) => (
          <View key={copy} style={{ width, height: horizon }}>
            <View
              style={[
                styles.cloud,
                { left: width * 0.18, top: horizon * 0.3, width: width * 0.16 },
              ]}
            />
            <View
              style={[
                styles.cloud,
                { left: width * 0.62, top: horizon * 0.52, width: width * 0.12 },
              ]}
            />
          </View>
        ))}
      </Animated.View>

      {/* The town, at the horizon. */}
      <Svg
        width={width}
        height={skylineHeight}
        style={{ position: 'absolute', top: horizon - skylineHeight, left: 0 }}
        pointerEvents="none"
        opacity={0.22}
      >
        {ROOFS.map(([x, h], i) => (
          <Rect
            key={i}
            x={x * width}
            y={skylineHeight * (1 - h)}
            width={width * 0.07}
            height={skylineHeight * h}
            fill={SKYLINE}
          />
        ))}
      </Svg>

      <View style={StyleSheet.absoluteFill}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GROUND[1] },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  clouds: { position: 'absolute', top: 0, left: 0, flexDirection: 'row' },
  moonGlow: { position: 'absolute' },
  cloud: {
    position: 'absolute',
    height: 18,
    borderRadius: 9,
    backgroundColor: CLOUD,
    opacity: 0.28,
  },
});

export default DuskScene;
