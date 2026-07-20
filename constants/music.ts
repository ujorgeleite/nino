// constants/music.ts
// Ambient loop per country. Generated, never licensed:
// `node scripts/generate-music.js` (or `make music`) composes each one from the
// country's key/mode/timbre/tempo. No copyrighted audio ships in this app.
//
// The require() map is static on purpose — Metro needs literal paths to bundle
// assets. Only the ACTIVE track is ever handed to a player (hooks/useMusic.ts),
// so this map costs nothing at runtime beyond the asset references.

export const MUSIC: Record<string, number> = {
  nl: require('../assets/music/nl.wav'),
  be: require('../assets/music/be.wav'),
  de: require('../assets/music/de.wav'),
  fr: require('../assets/music/fr.wav'),
  gb: require('../assets/music/gb.wav'),
  dk: require('../assets/music/dk.wav'),
  se: require('../assets/music/se.wav'),
  no: require('../assets/music/no.wav'),
  ch: require('../assets/music/ch.wav'),
  at: require('../assets/music/at.wav'),
  it: require('../assets/music/it.wav'),
};

/** Volume for the two modes. Back is quieter — it is the wind-down. */
export const MUSIC_VOLUME = { there: 0.5, back: 0.32 } as const;
