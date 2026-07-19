// hooks/useCardFlip.ts
// Reanimated-driven 3D flip for a wood card. UI-thread only (no JS re-render).
// See docs/ANIMATION_GUIDELINES.md — flip 380ms open / 320ms close, cubic ease.

import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ANIMATION } from '../constants/theme';

export type CardFlip = ReturnType<typeof useCardFlip>;

/**
 * @param faceUp whether the card should currently show its front face
 */
export function useCardFlip(faceUp: boolean) {
  // progress: 0 = face down (back showing), 1 = face up (front showing)
  const progress = useSharedValue(faceUp ? 1 : 0);

  // Drive progress from the boolean prop. This is a side effect on a shared
  // value, so it belongs in useEffect — useMemo may run more than once per
  // commit and must stay pure (react-hooks/immutability).
  useEffect(() => {
    progress.value = withTiming(faceUp ? 1 : 0, {
      duration: faceUp ? ANIMATION.flipOpen : ANIMATION.flipClose,
      easing: Easing.out(Easing.cubic),
    });
  }, [faceUp, progress]);

  const rotation = useDerivedValue(() => progress.value * 180);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${rotation.value}deg` },
    ],
    backfaceVisibility: 'hidden',
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${rotation.value + 180}deg` },
    ],
    backfaceVisibility: 'hidden',
  }));

  return { progress, frontStyle, backStyle };
}
