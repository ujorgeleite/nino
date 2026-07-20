// constants/sounds.ts
// Central registry of sound asset references. Never hardcode require() in components.
//
// The files are generated, not licensed: `node scripts/generate-sounds.js`
// (or `make sounds`) synthesizes them from the exact frequencies specified in
// prompts/starting.md §4. No copyrighted audio ships in this app.

export type SoundKey =
  | 'flip' //     card lift/flip — 90ms triangle, 520→700Hz
  | 'match' //    memory pair found — C5-E5-G5 arpeggio, 90ms apart
  | 'noMatch' //  memory miss — 220ms sine, 300→170Hz (gentle, never harsh)
  | 'click' //    shape-fit pickup / drop — 60ms square, 180→120Hz
  | 'ihuu' //     shape-fit piece seated — 660→780 then 990→1170Hz
  | 'win'; //     game complete — C-D-E-G-C jingle

export const SOUNDS: Record<SoundKey, number> = {
  flip: require('../assets/sounds/flip.wav'),
  match: require('../assets/sounds/match.wav'),
  noMatch: require('../assets/sounds/no-match.wav'),
  click: require('../assets/sounds/click.wav'),
  ihuu: require('../assets/sounds/ihuu.wav'),
  win: require('../assets/sounds/win.wav'),
};

export const SOUND_KEYS = Object.keys(SOUNDS) as SoundKey[];
