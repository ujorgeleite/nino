// constants/depth.ts
// The depth system: how an object sits above the surface.
//
// WHY THIS REPLACES THE FLAT SHADOW
//
// The old `SHADOWS.chunk` was a single hard offset with zero blur. It reads as
// a sticker: flat art with a flat drop behind it. Nothing about it says the
// object could be picked up.
//
// A thing that looks liftable needs three separate cues, and they have to move
// independently as it rises:
//
//   1. CONTACT — a small, dark, tight shadow directly under it. This is what
//      says "touching the ground". It shrinks and fades as the object lifts,
//      and its disappearance is most of the sensation of lifting.
//   2. CAST — a larger, softer, offset shadow. It grows and moves further as
//      the object rises, because the light source stays put.
//   3. FORM — a highlight along the top edge and a subtle darkening at the
//      bottom of the object itself, so the face reads as curved rather than
//      as a flat fill.
//
// Toddlers do not analyse any of this. They just reach for the thing that
// looks reachable.
//
// Every value is expressed as a function of ELEVATION (0 = resting, 1 = fully
// lifted) so a drag can interpolate all of it from one shared value.

import { Platform } from 'react-native';

/** How high a lifted object appears to float, in points. */
export const LIFT_HEIGHT = 14;

/** How much bigger a lifted object appears. Subtle — 1.12 already looks huge. */
export const LIFT_SCALE = 0.1;

/**
 * Clamps elevation to 0..1.
 *
 * NOT a worklet, deliberately. These builders run during render, on the JS
 * thread — shadow props cannot be animated on the UI thread anyway, which is
 * why Solid.tsx cross-fades two pre-built shadows instead of interpolating.
 *
 * It also must be defined ABOVE its callers: a `'worklet'` directive on a
 * hoisted function declaration breaks that hoisting, and the module then
 * throws "clamp is not a function" at evaluation time.
 */
function clamp(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export type ShadowStyle = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};

/**
 * The tight shadow directly beneath an object.
 *
 * @param elevation 0 resting, 1 fully lifted
 */
export function contactShadow(elevation = 0): ShadowStyle {
  const e = clamp(elevation);
  return {
    shadowColor: '#2A1C12',
    // Fades as it lifts — this is the strongest single lift cue.
    shadowOpacity: 0.34 * (1 - e * 0.75),
    shadowRadius: 3 + e * 2,
    shadowOffset: { width: 0, height: 2 + e },
    elevation: 2,
  };
}

/**
 * The larger shadow the object throws onto the ground.
 *
 * Grows and drifts as the object rises, because the light does not move.
 */
export function castShadow(elevation = 0): ShadowStyle {
  const e = clamp(elevation);
  return {
    shadowColor: '#1F4F8C',
    shadowOpacity: 0.16 + e * 0.12,
    shadowRadius: 10 + e * 18,
    shadowOffset: { width: e * 6, height: 8 + e * 16 },
    elevation: Math.round(6 + e * 12),
  };
}

/**
 * Resting depth for something that is not draggable — a tile, a board, a HUD
 * button. Still layered, just never animated.
 */
export const RESTING = {
  low: castShadow(0),
  lifted: castShadow(0.5),
  high: castShadow(1),
} as const;

/** Top-edge highlight and bottom shading that make a face read as curved. */
export const FORM = {
  /** Overlaid at the top of a surface. */
  highlight: 'rgba(255, 255, 255, 0.42)',
  /** Overlaid at the bottom. */
  shade: 'rgba(60, 36, 18, 0.16)',
  /** Height of each band, as a fraction of the object. */
  band: 0.22,
} as const;

/**
 * A soft glow used to preview a valid drop target.
 *
 * This is the "it will fit here" promise — the single biggest usability win
 * for a 2-year-old, who otherwise has to guess whether they are close enough.
 */
export const HALO = {
  color: '#FFD95C',
  restingOpacity: 0,
  activeOpacity: 0.85,
  scale: 1.18,
} as const;

/**
 * Idle float. Each object gets its own phase so a tray of pieces breathes
 * like a group of separate things, never in lockstep.
 */
export const FLOAT = {
  /** Vertical travel, in points. */
  amplitude: 5,
  /** One full up-and-down, in ms. Slow — this is ambient, not attention. */
  period: 3600,
  /** Extra tilt at the extremes, in degrees. */
  tilt: 1.6,
} as const;

/**
 * Android composites shadows very differently and cannot layer two of them on
 * one view. Where a layered look matters, the caller renders an explicit
 * shadow view instead — this flag is how components choose.
 */
export const SUPPORTS_LAYERED_SHADOWS = Platform.OS === 'ios';
