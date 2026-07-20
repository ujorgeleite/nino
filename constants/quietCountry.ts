// constants/quietCountry.ts
// The same country, drained of colour.
//
// WHY THIS EXISTS
//
// The puzzle screen shows two things at once: the picture being assembled
// inside its square, and the country's landscape around it. Both were fully
// coloured, and they competed — a Dutch sky behind a Dutch windmill puzzle is
// the same palette twice, so the square stopped reading as a separate object
// and the pieces had to be picked out of a busy field.
//
// The fix is not to remove the landscape. A 2-year-old needs to see where they
// are, and the sky, ground, clouds and monument are what make the screen feel
// like somewhere. So the landscape STAYS and gives up its colour: it becomes a
// quiet grey backdrop, and every colour left on screen belongs to the puzzle.
//
// Done by swapping the palette rather than by drawing a second set of scenes,
// because a country is data — one substitution greys the sky, the ground, the
// monument and the scenery at once, and no renderer needs to know.

import type { CountryData } from './countries';

/**
 * A cool grey scale, light at the top of the sky and darkest at the ground.
 *
 * Deliberately DARK, not merely grey. A mid-grey backdrop was tried first and
 * Norway's mountain — which is itself grey — nearly disappeared into it: the
 * artwork test measured only 20% of the piece as distinguishable from what was
 * behind it. Some countries are painted in greys, so being colourless is not
 * enough separation on its own; the backdrop also has to sit well below every
 * palette in VALUE.
 */
const QUIET = {
  skyHigh: '#565C66',
  skyLow: '#6B7280',
  skyHighBack: '#33363C',
  skyLowBack: '#42454C',
  ground: '#41454C',
  structure: '#5E636D',
  structureAlt: '#4C5058',
  accent: '#6E7480',
} as const;

/**
 * The country with a greyscale palette and no per-piece colour overrides.
 *
 * Pure, and returns a new object: callers must memoize it, or a fresh identity
 * every render will re-render the whole skyline (the one thing CountryScene's
 * memoization exists to prevent).
 */
export function quietCountry(country: CountryData): CountryData {
  return {
    ...country,
    palette: {
      ...country.palette,
      skyThere: [QUIET.skyHigh, QUIET.skyLow],
      skyBack: [QUIET.skyHighBack, QUIET.skyLowBack],
      ground: QUIET.ground,
      structure: QUIET.structure,
      structureAlt: QUIET.structureAlt,
      accent: QUIET.accent,
    },
    // A piece's own fill would punch a patch of colour back into the backdrop.
    scene: country.scene.map(({ fill: _fill, ...piece }) => piece),
  };
}

export default quietCountry;
