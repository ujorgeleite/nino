// constants/music.ts
// Ambient loops: one per country PER GAME.
//
// Generated, never licensed: `node scripts/generate-music.js` (or `make music`)
// composes each from the country's key, mode, instrument and tempo. No
// copyrighted audio ships in this app.
//
// TWO ARRANGEMENTS OF THE SAME PLACE:
//   memory   — sparse and suspended. The child is remembering, and music that
//              moves is music that interrupts.
//   shapefit — gently pulsed. The child is doing something with their hands,
//              and a soft heartbeat supports action without driving it.
// Both share a seed, so they are the same place heard two ways rather than two
// unrelated tunes.
//
// The require() map is static because Metro needs literal paths. Only the
// ACTIVE track is ever handed to a player (hooks/useMusic.ts), so this costs
// nothing at runtime beyond the asset references.

export type MusicGame = 'memory' | 'shapefit';

export const MUSIC: Record<string, number> = {
  'nl-memory': require('../assets/music/nl-memory.wav'),
  'nl-shapefit': require('../assets/music/nl-shapefit.wav'),
  'be-memory': require('../assets/music/be-memory.wav'),
  'be-shapefit': require('../assets/music/be-shapefit.wav'),
  'de-memory': require('../assets/music/de-memory.wav'),
  'de-shapefit': require('../assets/music/de-shapefit.wav'),
  'fr-memory': require('../assets/music/fr-memory.wav'),
  'fr-shapefit': require('../assets/music/fr-shapefit.wav'),
  'gb-memory': require('../assets/music/gb-memory.wav'),
  'gb-shapefit': require('../assets/music/gb-shapefit.wav'),
  'dk-memory': require('../assets/music/dk-memory.wav'),
  'dk-shapefit': require('../assets/music/dk-shapefit.wav'),
  'se-memory': require('../assets/music/se-memory.wav'),
  'se-shapefit': require('../assets/music/se-shapefit.wav'),
  'no-memory': require('../assets/music/no-memory.wav'),
  'no-shapefit': require('../assets/music/no-shapefit.wav'),
  'ch-memory': require('../assets/music/ch-memory.wav'),
  'ch-shapefit': require('../assets/music/ch-shapefit.wav'),
  'at-memory': require('../assets/music/at-memory.wav'),
  'at-shapefit': require('../assets/music/at-shapefit.wav'),
  'it-memory': require('../assets/music/it-memory.wav'),
  'it-shapefit': require('../assets/music/it-shapefit.wav'),
};

/** The track for a country and game, or undefined if there is none. */
export function musicFor(
  countryCode: string | undefined,
  game: MusicGame | undefined,
): number | undefined {
  if (!countryCode || !game) return undefined;
  return MUSIC[`${countryCode}-${game}`];
}

/** Volume for the two modes. Back is quieter — it is the wind-down. */
export const MUSIC_VOLUME = { there: 0.5, back: 0.32 } as const;
