// components/mascot/Mascot.tsx
// Nino. `<Mascot pose="head|full" expression bob />` — prompts/starting.md §2.
//
// Art comes from the provided SVGs; it is never recolored or redrawn.
//
// EXPRESSION LIMITATION: the spec lists happy / curious / sleepy as "variant
// mouths", but only one face was delivered (nino-head.svg has a single smile).
// Redrawing it would violate "do not recolor or redraw him", so expression is
// currently conveyed through MOTION — each mood has its own idle rhythm and
// reaction. When variant-mouth art arrives, swap the source per expression here
// and the call sites need no change.
//
// Motion tokens: constants/nino.ts. Rules: docs/ANIMATION_GUIDELINES.md.

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import NinoHead from '../../assets/mascot/nino-head.svg';
import NinoFull from '../../assets/mascot/nino-full.svg';
import { MOTION } from '../../constants/nino';

export type MascotPose = 'head' | 'full';
export type MascotExpression = 'happy' | 'curious' | 'sleepy';

type Props = {
  pose?: MascotPose;
  expression?: MascotExpression;
  /** Idle vertical float. On by default — a still mascot reads as broken. */
  bob?: boolean;
  size?: number;
  /** Fires a one-shot reaction when it changes. */
  reaction?: 'celebrate' | 'oops' | null;
  /**
   * Bump to replay the same reaction. Two matches in a row leave `reaction`
   * at 'celebrate', so without this the second one would animate nothing.
   */
  reactionSeq?: number;
};

/** Per-expression idle rhythm. Sleepy is slower and shallower; curious tilts. */
const RHYTHM: Record<MascotExpression, { period: number; amplitude: number; tilt: number }> = {
  happy: { period: MOTION.bob, amplitude: 9, tilt: 0 },
  curious: { period: MOTION.bob * 0.9, amplitude: 8, tilt: 4 },
  sleepy: { period: MOTION.bob * 1.6, amplitude: 5, tilt: 0 },
};

export function Mascot({
  pose = 'head',
  expression = 'happy',
  bob = true,
  size = 120,
  reaction = null,
  reactionSeq = 0,
}: Props) {
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const rhythm = RHYTHM[expression];

  // Ambient float — calm, never frantic (spec §1: bob 3200ms, ±8–9px).
  useEffect(() => {
    if (!bob) {
      y.value = withTiming(0, { duration: MOTION.press });
      return;
    }
    y.value = withRepeat(
      withSequence(
        withTiming(-rhythm.amplitude, {
          duration: rhythm.period / 2,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(rhythm.amplitude, {
          duration: rhythm.period / 2,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
  }, [bob, rhythm.amplitude, rhythm.period, y]);

  // Rotation has two drivers — the expression's resting tilt and a one-shot
  // reaction — so they live in ONE effect. Splitting them across two effects
  // makes the second look like it mutates a hook argument
  // (react-hooks/immutability), and would also let them fight over the value.
  //
  // Reactions are body language, never a sad face (CLAUDE.md rule 2).
  useEffect(() => {
    if (reaction === 'celebrate') {
      scale.value = withSequence(
        withTiming(1.25, { duration: 140 }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      );
      rotate.value = withSequence(
        withTiming(-8, { duration: 120 }),
        withTiming(8, { duration: 160 }),
        withSpring(rhythm.tilt, { damping: 6, stiffness: 180 }),
      );
    } else if (reaction === 'oops') {
      scale.value = withSequence(
        withTiming(0.92, { duration: 120 }),
        withSpring(1, { damping: 10, stiffness: 220 }),
      );
      rotate.value = withSequence(
        withTiming(6, { duration: 140 }),
        withSpring(rhythm.tilt, { damping: 9, stiffness: 200 }),
      );
    } else {
      // Rest at the expression's own tilt.
      rotate.value = withSpring(rhythm.tilt, { damping: 12, stiffness: 120 });
    }
  }, [reaction, reactionSeq, rhythm.tilt, rotate, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  // nino-full.svg is taller than wide (viewBox 165x220) — keep its proportion.
  const width = size;
  const height = pose === 'full' ? size * (220 / 165) : size;

  return (
    <Animated.View
      style={[styles.wrap, style]}
      accessibilityRole="image"
      accessibilityLabel="Nino"
    >
      {pose === 'full' ? (
        <NinoFull width={width} height={height} />
      ) : (
        <NinoHead width={width} height={height} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});

export default Mascot;
