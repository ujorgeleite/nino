// components/scene/TouchableScenery.tsx
// Wraps one piece of scenery so it answers back when touched.
//
// The hit area sits ON TOP of the scene SVG, which stays a single flat draw —
// the scenery itself is never made interactive, only a transparent pad over
// it. That keeps the skyline memoized and cheap while still letting a child
// poke the windmill.
//
// The reaction is deliberately small. An easter egg that fills the screen
// competes with the game; one that makes the mountain shimmer for half a
// second rewards curiosity and gets out of the way.

import React, { useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  EGG_COOLDOWN_MS,
  EGG_DURATION_MS,
  type EasterEgg,
} from '../../constants/easterEggs';
import { useSound } from '../../hooks/useSound';
import { useFeedback } from '../../hooks/useFeedback';

type Props = {
  egg: EasterEgg;
  /** Hit area, in window-relative layout coordinates. */
  left: number;
  top: number;
  width: number;
  height: number;
  children?: React.ReactNode;
  testID?: string;
};

export function TouchableScenery({
  egg,
  left,
  top,
  width,
  height,
  children,
  testID,
}: Props) {
  const t = useSharedValue(0);
  const lastFired = useRef(0);
  const { playItem } = useSound();
  const feedback = useFeedback();

  // A plain function, not useCallback. Listing `t` as a dependency is what
  // makes writing to it read as mutating a hook argument
  // (react-hooks/immutability), and a press handler gains nothing from memo.
  const poke = () => {
    // A toddler will hammer the same windmill twenty times. Without a floor
    // the sounds pile into noise and the scenery out-shouts the game.
    const now = Date.now();
    if (now - lastFired.current < EGG_COOLDOWN_MS) return;
    lastFired.current = now;

    feedback('tap');
    playItem(eggSoundItemId(egg));

    t.value = 0;
    t.value = withTiming(1, {
      duration: EGG_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  };

  const style = useAnimatedStyle(() => {
    const p = t.value;
    // Each reaction is one gesture, not a loop — it plays and it is done.
    switch (egg.reaction) {
      case 'spin':
        return { transform: [{ rotate: `${p * 360}deg` }] };
      case 'swing':
        return {
          transform: [{ rotate: `${Math.sin(p * Math.PI * 3) * (1 - p) * 12}deg` }],
        };
      case 'bounce':
        return {
          transform: [
            { translateY: -Math.sin(p * Math.PI) * 10 },
            { scaleX: 1 + Math.sin(p * Math.PI) * 0.06 },
            { scaleY: 1 - Math.sin(p * Math.PI) * 0.06 },
          ],
        };
      case 'wobble':
        return {
          transform: [{ rotate: `${Math.sin(p * Math.PI * 4) * (1 - p) * 5}deg` }],
        };
      case 'shimmer':
      default:
        return { opacity: 1 - Math.sin(p * Math.PI) * 0.35 };
    }
  });

  return (
    <Animated.View
      style={[styles.zone, { left, top, width, height }, style]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={poke}
        // Parent-facing. The child is not told these exist — finding them is
        // the point.
        accessibilityRole="button"
        accessibilityLabel={egg.label}
        style={StyleSheet.absoluteFill}
        testID={testID}
      />
      {children}
    </Animated.View>
  );
}

/**
 * Maps an egg to an item id the sound layer understands.
 *
 * `playItem` takes item ids rather than sound keys, so eggs borrow the item
 * that owns the voice they want. Reusing that layer means eggs cost no new
 * audio and stay under the same mute switch.
 */
function eggSoundItemId(egg: EasterEgg): string {
  const BY_SOUND: Record<string, string> = {
    moo: 'cow',
    meow: 'cat',
    splash: 'fish',
    wind: 'snow',
    bicycleBell: 'bicycle',
    boatHorn: 'boat',
    carHorn: 'car',
    watchTick: 'watch',
    crunch: 'apple',
    skiSwish: 'ski',
    deerCall: 'deer',
  };
  return BY_SOUND[egg.sound] ?? 'cow';
}

const styles = StyleSheet.create({
  zone: { position: 'absolute' },
});

export default TouchableScenery;
