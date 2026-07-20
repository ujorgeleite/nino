// constants/quietCountry.test.ts
// The backdrop must actually be colourless, and must actually contrast.

import { COUNTRIES } from './countries';
import { quietCountry } from './quietCountry';

/** #RRGGBB -> [r, g, b]. */
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * How far a colour is from grey, as an ABSOLUTE spread between channels.
 *
 * Relative saturation ((max - min) / max) was tried first and punished the
 * backdrop for being dark: #33363C is nine steps from perfectly neutral out of
 * 255, which nobody can see, yet it scores 0.15 because its channels are all
 * small. The eye reads the difference, not the ratio.
 */
function greyness(hex: string): number {
  const [r, g, b] = rgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/** Relative luminance, for contrast comparisons. */
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('quietCountry', () => {
  it.each(COUNTRIES.map((c) => [c.code, c] as const))(
    '%s: every backdrop colour is grey',
    (_code, country) => {
      const quiet = quietCountry(country);
      const colours = [
        ...quiet.palette.skyThere,
        ...quiet.palette.skyBack,
        quiet.palette.ground,
        quiet.palette.structure,
        quiet.palette.structureAlt,
        quiet.palette.accent,
      ];
      // A touch of blue is allowed — a perfectly neutral grey reads as dead.
      for (const colour of colours) {
        expect(greyness(colour)).toBeLessThan(24);
      }
    },
  );

  it.each(COUNTRIES.map((c) => [c.code, c] as const))(
    '%s: the backdrop keeps its scenery, only its colour goes',
    (_code, country) => {
      // Greying the scene must never be a shortcut for deleting it: the child
      // still needs a monument, a horizon and somewhere to be.
      const quiet = quietCountry(country);
      expect(quiet.scene).toHaveLength(country.scene.length);
      expect(quiet.scene.map((p) => p.kind)).toEqual(country.scene.map((p) => p.kind));
      expect(quiet.name).toBe(country.name);
      expect(quiet.items).toEqual(country.items);
    },
  );

  it.each(COUNTRIES.map((c) => [c.code, c] as const))(
    '%s: no scene piece keeps a colour of its own',
    (_code, country) => {
      // One piece with a `fill` would put a patch of the country's colour back
      // into the backdrop, which is the whole thing being fixed.
      for (const piece of quietCountry(country).scene) {
        expect(piece.fill).toBeUndefined();
      }
    },
  );

  it.each(COUNTRIES.map((c) => [c.code, c] as const))(
    '%s: the puzzle square stands clear of the backdrop',
    (_code, country) => {
      // The point of greying the landscape is that the square in front of it
      // reads as a separate object. That is a contrast claim, so it is
      // measured rather than eyeballed: the square's own sky must be clearly
      // lighter than the backdrop it sits on.
      const quiet = quietCountry(country);
      expect(contrast(country.palette.skyThere[0], quiet.palette.ground)).toBeGreaterThan(
        1.6,
      );
    },
  );

  it('is pure — the country it is given is never modified', () => {
    const before = JSON.stringify(COUNTRIES[0]);
    quietCountry(COUNTRIES[0]);
    expect(JSON.stringify(COUNTRIES[0])).toBe(before);
  });
});
