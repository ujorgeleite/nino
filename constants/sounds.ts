// constants/sounds.ts
// Central registry of sound asset references. Never hardcode require() in components.
//
// The files are generated, not licensed: `node scripts/generate-sounds.js`
// (or `make sounds`) synthesizes them from the exact frequencies specified in
// prompts/starting.md §4. No copyrighted audio ships in this app.

export type SoundKey =
  // --- Tactile: the feel of moving an object -------------------------------
  | 'lift' //     a piece comes free of the tray — soft upward whoosh
  | 'snapIn' //   a piece is taken by the board — suction, then a woody thunk
  | 'snapOut' //  a seated piece is pulled back out — a light cork pop
  | 'softDrop' // set down without seating — a dull landing, no verdict
  // --- Game events ---------------------------------------------------------
  | 'flip' //     card lift/flip — 90ms triangle, 520→700Hz
  | 'match' //    memory pair found — C5-E5-G5 arpeggio, 90ms apart
  | 'noMatch' //  memory miss — 220ms sine, 300→170Hz (gentle, never harsh)
  | 'click' //    shape-fit pickup / drop — 60ms square, 180→120Hz
  | 'ihuu' //     shape-fit piece seated — 660→780 then 990→1170Hz
  | 'win'; //     game complete — C-D-E-G-C jingle

export const SOUNDS: Record<SoundKey, number> = {
  lift: require('../assets/sounds/lift.wav'),
  snapIn: require('../assets/sounds/snap-in.wav'),
  snapOut: require('../assets/sounds/snap-out.wav'),
  softDrop: require('../assets/sounds/soft-drop.wav'),
  flip: require('../assets/sounds/flip.wav'),
  match: require('../assets/sounds/match.wav'),
  noMatch: require('../assets/sounds/no-match.wav'),
  click: require('../assets/sounds/click.wav'),
  ihuu: require('../assets/sounds/ihuu.wav'),
  win: require('../assets/sounds/win.wav'),
};

export const SOUND_KEYS = Object.keys(SOUNDS) as SoundKey[];
