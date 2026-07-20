// hooks/useFloat.ts
// Idle float: the slow rise and fall that makes an object look suspended
// rather than stuck to the background.
//
// PHASE IS THE POINT. A tray where every piece bobs in lockstep reads as one
// animated panel. Give each its own phase and the same motion reads as five
// separate things floating independently — which is what invites a child to
// reach for one of them.
//
// The phase is derived from the item's id, so it is stable across renders and
// identical every session. A random phase would make the tray reshuffle its
// rhythm on every remount.

import { useEffect } from 'react';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { FLOAT } from '../constants/depth';

/** Stable 0..1 phase offset from a string. */
export function phaseFor(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export type Float = {
  /** −1..1, the raw oscillation. */
  wave: SharedValue<number>;
  /** Vertical offset in points, ready for a transform. */
  offsetY: SharedValue<number>;
  /** Tilt in degrees, ready for a transform. */
  tilt: SharedValue<number>;
};

/**
 * @param id       anything stable and unique — the phase is derived from it
 * @param enabled  floating stops when the object is grabbed or placed
 */
export function useFloat(id: string, enabled = true): Float {
  const t = useSharedValue(phaseFor(id));

  useEffect(() => {
    if (!enabled) {
      // Settle gently rather than snapping to rest.
      t.value = withTiming(Math.round(t.value), { duration: 320 });
      return;
    }
    // A linear ramp 0→1 drives a sine below, so the loop has no seam: at
    // t = 1 the sine is exactly where it was at t = 0.
    t.value = withRepeat(
      withTiming(t.value + 1, { duration: FLOAT.period, easing: Easing.linear }),
      -1,
      false,
    );
  }, [enabled, t]);

  const wave = useDerivedValue(() => Math.sin(t.value * Math.PI * 2));
  const offsetY = useDerivedValue(() => wave.value * FLOAT.amplitude);
  const tilt = useDerivedValue(() => wave.value * FLOAT.tilt);

  return { wave, offsetY, tilt };
}
