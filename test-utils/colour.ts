// test-utils/colour.ts
// Colour distance, and colour distance as a colour-blind child sees it.
//
// WHY THIS EXISTS
//
// The puzzle uses COLOUR as its instruction: the child matches a red piece to
// a red hole. That makes "these two colours are clearly different" a load-
// bearing claim about whether the game is playable at all — and for the ~8% of
// boys with a red-green deficiency, a palette that looks obviously distinct to
// the author can be two shades of the same thing.
//
// So the claim is measured rather than eyeballed, and measured through a
// simulation of the commonest deficiencies as well as normal vision.
//
// CIEDE2000 is used because plain RGB or Lab distance badly misjudges how
// different two colours look, especially for saturated hues — which is most of
// this palette.

export type Rgb = readonly [number, number, number];

export function rgbOf(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** sRGB -> linear light. */
const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
};

function toXyz([r, g, b]: Rgb): [number, number, number] {
  const [R, G, B] = [toLinear(r), toLinear(g), toLinear(b)];
  return [
    R * 0.4124564 + G * 0.3575761 + B * 0.1804375,
    R * 0.2126729 + G * 0.7151522 + B * 0.072175,
    R * 0.0193339 + G * 0.119192 + B * 0.9503041,
  ];
}

/** CIE Lab, D65. */
export function toLab(rgb: Rgb): [number, number, number] {
  const [x, y, z] = toXyz(rgb);
  const ref = [0.95047, 1.0, 1.08883];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [fx, fy, fz] = [f(x / ref[0]), f(y / ref[1]), f(z / ref[2])];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * CIEDE2000. Roughly: under 1 is invisible, under ~11 two colours are easily
 * confused, over ~25 nobody mixes them up.
 */
export function deltaE(a: Rgb, b: Rgb): number {
  const [L1, a1, b1] = toLab(a);
  const [L2, a2, b2] = toLab(b);
  const avgL = (L1 + L2) / 2;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const avgC = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(avgC ** 7 / (avgC ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const avgCp = (C1p + C2p) / 2;
  const h = (x: number, y: number) => {
    if (x === 0 && y === 0) return 0;
    const angle = (Math.atan2(y, x) * 180) / Math.PI;
    return angle >= 0 ? angle : angle + 360;
  };
  const h1p = h(a1p, b1);
  const h2p = h(a2p, b2);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);
  let avgHp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) avgHp += h1p + h2p < 360 ? 360 : -360;
    avgHp /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos(((avgHp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * avgHp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * avgHp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * avgHp - 63) * Math.PI) / 180);
  const Sl = 1 + (0.015 * (avgL - 50) ** 2) / Math.sqrt(20 + (avgL - 50) ** 2);
  const Sc = 1 + 0.045 * avgCp;
  const Sh = 1 + 0.015 * avgCp * T;
  const Rt =
    -2 *
    Math.sqrt(avgCp ** 7 / (avgCp ** 7 + 25 ** 7)) *
    Math.sin((60 * Math.exp(-(((avgHp - 275) / 25) ** 2)) * Math.PI) / 180);
  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
  );
}

export type Vision = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

/**
 * Brettel/Viénot-style dichromacy simulation in linear LMS.
 *
 * An approximation — it models the severe (dichromat) case, which is the right
 * one to design against: if a pair survives this, the milder anomalous cases
 * are comfortable.
 */
export function simulate(rgb: Rgb, vision: Vision): Rgb {
  if (vision === 'normal') return rgb;
  const [r, g, b] = [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];

  // Hunt-Pointer-Estevez, normalised to D65.
  const L = 0.31399022 * r + 0.63951294 * g + 0.04649755 * b;
  const M = 0.15537241 * r + 0.75789446 * g + 0.08670142 * b;
  const S = 0.01775239 * r + 0.10944209 * g + 0.87256922 * b;

  let l = L;
  let m = M;
  let s = S;
  if (vision === 'protanopia') l = 1.05118294 * M - 0.05116099 * S;
  else if (vision === 'deuteranopia') m = 0.9513092 * L + 0.04866992 * S;
  else s = -0.86744736 * L + 1.86727089 * M;

  return [
    fromLinear(5.47221206 * l - 4.6419601 * m + 0.16963708 * s),
    fromLinear(-1.1252419 * l + 2.29317094 * m - 0.1678952 * s),
    fromLinear(0.02980165 * l - 0.19318073 * m + 1.16364789 * s),
  ];
}

/** How far apart two colours look to someone with the given vision. */
export function distanceAs(a: string, b: string, vision: Vision): number {
  return deltaE(simulate(rgbOf(a), vision), simulate(rgbOf(b), vision));
}

export const VISIONS: readonly Vision[] = [
  'normal',
  'protanopia',
  'deuteranopia',
  'tritanopia',
];
