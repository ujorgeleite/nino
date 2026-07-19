// constants/sounds.ts
// Central registry of sound asset references. Never hardcode require() in components.
//
// Sound files are not yet committed (see assets/sounds/README.md for the shopping
// list + sourcing). Until the MP3s land, SOUNDS entries are `null` and the audio
// layer is a no-op so the app still runs on device with zero setup.
//
// When a file is added, swap the `null` for `require('../assets/sounds/<file>.mp3')`.

export type SoundKey =
  | 'woodTap'
  | 'woodMatch'
  | 'woodNoMatch'
  | 'winFanfare'
  | 'bgMusic';

export const SOUNDS: Record<SoundKey, number | null> = {
  woodTap:     null, // require('../assets/sounds/wood-tap.mp3')
  woodMatch:   null, // require('../assets/sounds/wood-match.mp3')
  woodNoMatch: null, // require('../assets/sounds/wood-no-match.mp3')
  winFanfare:  null, // require('../assets/sounds/win-fanfare.mp3')
  bgMusic:     null, // require('../assets/sounds/bg-music.mp3')
};
