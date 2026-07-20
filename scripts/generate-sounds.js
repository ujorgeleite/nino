#!/usr/bin/env node
// scripts/generate-sounds.js
// The interface cues: flip, snap, match, win.
//
// VOICE: bright and toy-like, but PHYSICAL. These used to be sine stacks
// through one-pole filters, which is why they read as beeps. Now:
//
//   - struck things (wood block, xylophone bar, bell) use MODAL synthesis,
//     where each partial decays at its own rate. High partials dying first is
//     what separates a struck object from a tone.
//   - every impact carries a short noise TRANSIENT — the sound of the striker
//     itself. Real percussion always has one, and its absence is most of what
//     reads as "computer".
//   - everything sits in a small ROOM. A dry cue exists in a vacuum; a hint
//     of early reflection puts it on a table in front of you.
//
// Still no sampled or licensed audio anywhere.
//
// Rule 2 holds: the "wrong" cue is a soft comic slide, never a buzzer.
//
// Run: node scripts/generate-sounds.js   (or `make sounds`)

const fs = require('fs');
const path = require('path');
const {
  adsr,
  biquad,
  buffer,
  mixAt,
  modal,
  normalize,
  removeDC,
  room,
  shape,
  softClip,
  toWav,
  whiteNoise,
} = require('./lib/dsp');

const SAMPLE_RATE = 22050;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

const buf = (ms) => buffer(ms, SAMPLE_RATE);
const at = (atMs, samples, gain = 1) => ({ at: atMs, buffer: samples, gain });

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------

/**
 * A xylophone bar. Modal, with the classic bar ratios.
 *
 * A real bar's partials sit at roughly 1 : 3.0 : 5.6 of the fundamental and
 * decay progressively faster. That inharmonicity is why a xylophone reads as
 * wood rather than as a flute.
 */
function xylo({ durationMs = 260, hz = 523, gain = 0.5, decay = 9 }) {
  const out = modal({
    length: Math.round((durationMs / 1000) * SAMPLE_RATE),
    sampleRate: SAMPLE_RATE,
    freq: hz,
    modes: [
      { ratio: 1, gain: 1, decay },
      { ratio: 3.0, gain: 0.34, decay: decay * 2.6 },
      { ratio: 5.6, gain: 0.15, decay: decay * 4.2 },
      { ratio: 8.9, gain: 0.06, decay: decay * 6 },
    ],
    seed: Math.round(hz),
  });
  room(out, SAMPLE_RATE, { amount: 0.12, size: 0.3 });
  for (let i = 0; i < out.length; i++) out[i] *= gain;
  return out;
}

/**
 * A wood block: a small, dense, heavily damped resonator.
 *
 * Almost all transient. The pitch is barely perceptible — what you hear is
 * the strike and a very short ring.
 */
function woodBlock({ durationMs = 110, hz = 900, gain = 0.5 }) {
  const out = modal({
    length: Math.round((durationMs / 1000) * SAMPLE_RATE),
    sampleRate: SAMPLE_RATE,
    freq: hz,
    modes: [
      { ratio: 1, gain: 1, decay: 34 },
      { ratio: 2.7, gain: 0.45, decay: 55 },
      { ratio: 4.3, gain: 0.2, decay: 80 },
    ],
    seed: Math.round(hz / 3),
  });
  biquad(out, SAMPLE_RATE, 'peaking', hz * 1.4, 1.1, 3);
  room(out, SAMPLE_RATE, { amount: 0.1, size: 0.25 });
  for (let i = 0; i < out.length; i++) out[i] *= gain;
  return out;
}

/**
 * Slide whistle. A breathy near-sine with a glide and real air behind it.
 *
 * The breath noise is what makes it a whistle rather than an oscillator sweep.
 */
function slideWhistle({ durationMs = 420, startHz = 500, endHz = 1400, gain = 0.42 }) {
  const length = Math.round((durationMs / 1000) * SAMPLE_RATE);
  const out = new Float32Array(length);
  let phase = 0;

  for (let i = 0; i < length; i++) {
    const t = i / length;
    // Eased glide: a whistle swoops, it does not ramp.
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const vib = 1 + Math.sin(2 * Math.PI * 5.5 * (i / SAMPLE_RATE)) * 0.01;
    phase += ((startHz + (endHz - startHz) * eased) * vib) / SAMPLE_RATE;
    out[i] = Math.sin(2 * Math.PI * phase) + 0.1 * Math.sin(4 * Math.PI * phase);
  }

  // Air. A slide whistle is a wet, leaky instrument.
  const air = whiteNoise(length, Math.round(startHz));
  biquad(air, SAMPLE_RATE, 'bandpass', (startHz + endHz) / 2, 0.9);
  for (let i = 0; i < length; i++) out[i] = out[i] * 0.88 + air[i] * 0.16;

  adsr(out, SAMPLE_RATE, { attack: 0.02, decay: 0.05, sustain: 0.9, release: 0.12 });
  room(out, SAMPLE_RATE, { amount: 0.14, size: 0.35 });
  for (let i = 0; i < length; i++) out[i] *= gain;
  return out;
}

/** A spring: pitch wobbling around a centre with decaying depth. */
function boing({ durationMs = 340, hz = 260, gain = 0.4, wobbleHz = 15 }) {
  const length = Math.round((durationMs / 1000) * SAMPLE_RATE);
  const out = new Float32Array(length);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const s = i / SAMPLE_RATE;
    const depth = 0.5 * Math.exp(-s * 8);
    phase += (hz * (1 + Math.sin(2 * Math.PI * wobbleHz * s) * depth)) / SAMPLE_RATE;
    // Triangle body: comic, not synthetic.
    out[i] = 4 * Math.abs(phase - Math.floor(phase + 0.5)) - 1;
  }
  biquad(out, SAMPLE_RATE, 'lowpass', 2200, 1.1);
  shape(out, (t) => Math.exp(-t * 5));
  room(out, SAMPLE_RATE, { amount: 0.16, size: 0.4 });
  for (let i = 0; i < length; i++) out[i] *= gain;
  return out;
}

/** A cork pop: a burst of air with a short pitched thump under it. */
function pop({ durationMs = 130, startHz = 420, endHz = 980, gain = 0.42 }) {
  const length = Math.round((durationMs / 1000) * SAMPLE_RATE);
  const air = whiteNoise(length, Math.round(startHz));
  biquad(air, SAMPLE_RATE, 'bandpass', 1500, 0.8);
  shape(air, (t) => Math.exp(-t * 24));

  const body = new Float32Array(length);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / length;
    phase += (startHz + (endHz - startHz) * t * t) / SAMPLE_RATE;
    body[i] = Math.sin(2 * Math.PI * phase) * Math.exp(-t * 10);
  }

  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = body[i] * 0.75 + air[i] * 0.45;
  room(out, SAMPLE_RATE, { amount: 0.12, size: 0.3 });
  for (let i = 0; i < length; i++) out[i] *= gain;
  return out;
}

// ---------------------------------------------------------------------------
// Mixing
// ---------------------------------------------------------------------------

/** Places rendered voices on a timeline at given offsets (ms). */
function mix(events) {
  return mixAt(
    events.map((e) => at(e.atMs, e.samples)),
    SAMPLE_RATE,
  );
}

/** Timeline helper used by the cue definitions below. */
const ev = (atMs, samples) => ({ atMs, samples });

/** Peak level per cue. Ordering here is the rule-10 guarantee. */
const LEVEL = {
  click: 0.5, //   frequent, must not fatigue
  flip: 0.55, //   frequent
  lift: 0.42, //   very frequent — quietest of all
  snapIn: 0.8, //  the payoff moment of the whole game
  snapOut: 0.5, // undoing is neutral, never a scolding
  softDrop: 0.4,
  noMatch: 0.5, // QUIETER than match — a miss is never the loud moment
  match: 0.75,
  ihuu: 0.75,
  win: 0.95, //    the loudest sound in the app
};

// ---------------------------------------------------------------------------
// The cues
// ---------------------------------------------------------------------------

// Note frequencies used across the cues.
const C5 = 523, D5 = 587, E5 = 659, F5 = 698, G5 = 784, A5 = 880, B5 = 988;
const C6 = 1047, E6 = 1319, G6 = 1568;

const CUES = {
  // Lifting a piece: a soft upward whoosh. Says "this came free of the tray".
  lift: () => mix([
    ev(0, slideWhistle({ durationMs: 180, startHz: 300, endHz: 620, gain: 0.16 })),
    ev(0, woodBlock({ durationMs: 50, hz: 700, gain: 0.18 })),
  ]),

  // Seating a piece: a short suction, then a woody thunk as it lands home.
  // The suction is what makes it feel like the board TOOK the piece.
  snapIn: () => mix([
    ev(0, slideWhistle({ durationMs: 130, startHz: 900, endHz: 380, gain: 0.22 })),
    ev(90, woodBlock({ durationMs: 110, hz: 420, gain: 0.55 })),
    ev(95, xylo({ hz: G5, durationMs: 220, gain: 0.34 })),
  ]),

  // Pulling a seated piece back out: a cork-like pop, lighter than snapping in.
  // Undoing must never sound like a mistake — this is play, not an error.
  snapOut: () => mix([
    ev(0, pop({ durationMs: 120, startHz: 380, endHz: 760, gain: 0.34 })),
    ev(20, woodBlock({ durationMs: 60, hz: 900, gain: 0.2 })),
  ]),

  // A piece set down without seating: a dull, soft landing. No verdict.
  softDrop: () => mix([
    ev(0, woodBlock({ durationMs: 90, hz: 260, gain: 0.3 })),
  ]),

  // Card lift: a light wood tap with a bright pop on top. Quick, not chirpy.
  flip: () => mix([
    ev(0, woodBlock({ durationMs: 80, hz: 1100, gain: 0.34 })),
    ev(10, pop({ durationMs: 130, startHz: 620, endHz: 1150, gain: 0.3 })),
  ]),

  // Pair found: a fast rising xylophone run. The classic "got it!" tinkle.
  match: () => mix([
    ev(0, xylo({ hz: C5, durationMs: 200 })),
    ev(70, xylo({ hz: E5, durationMs: 200 })),
    ev(140, xylo({ hz: G5, durationMs: 220 })),
    ev(210, xylo({ hz: C6, durationMs: 300, gain: 0.55 })),
  ]),

  // Miss: a comic slide DOWN plus a soft boing. Playful, never a buzzer —
  // a wrong move must feel like a joke, not a penalty (rule 2).
  noMatch: () => mix([
    ev(0, slideWhistle({ durationMs: 380, startHz: 780, endHz: 300, gain: 0.3 })),
    ev(300, boing({ durationMs: 260, hz: 190, gain: 0.26, wobbleHz: 14 })),
  ]),

  // Piece pickup / drop: a dry wood block. Percussive, no pitch.
  click: () => mix([ev(0, woodBlock({ durationMs: 85, hz: 820, gain: 0.45 }))]),

  // Piece seated ("ihuu"): a slide UP capped by a bright xylophone ping.
  ihuu: () => mix([
    ev(0, slideWhistle({ durationMs: 300, startHz: 520, endHz: 1250, gain: 0.32 })),
    ev(250, xylo({ hz: E6, durationMs: 260, gain: 0.5 })),
    ev(250, xylo({ hz: G6, durationMs: 260, gain: 0.3 })),
  ]),

  // Win: a full cartoon fanfare — xylophone run up the scale, a whistle swoop,
  // then a ringing chord. Long and loud on purpose (rule 10: the celebration
  // always outweighs any failure).
  win: () => mix([
    ev(0, xylo({ hz: C5, durationMs: 180 })),
    ev(90, xylo({ hz: D5, durationMs: 180 })),
    ev(180, xylo({ hz: E5, durationMs: 180 })),
    ev(270, xylo({ hz: F5, durationMs: 180 })),
    ev(360, xylo({ hz: G5, durationMs: 200 })),
    ev(450, xylo({ hz: A5, durationMs: 200 })),
    ev(540, xylo({ hz: B5, durationMs: 200 })),
    ev(630, slideWhistle({ durationMs: 320, startHz: 900, endHz: 1500, gain: 0.26 })),
    // Final chord, held.
    ev(860, xylo({ hz: C6, durationMs: 900, gain: 0.55, decay: 3.4 })),
    ev(860, xylo({ hz: E6, durationMs: 900, gain: 0.34, decay: 3.4 })),
    ev(860, xylo({ hz: G6, durationMs: 900, gain: 0.24, decay: 3.4 })),
  ]),
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const FILENAME = {
  flip: 'flip',
  match: 'match',
  noMatch: 'no-match',
  click: 'click',
  ihuu: 'ihuu',
  win: 'win',
  lift: 'lift',
  snapIn: 'snap-in',
  snapOut: 'snap-out',
  softDrop: 'soft-drop',
};

for (const [key, render] of Object.entries(CUES)) {
  const samples = normalize(softClip(removeDC(render(), SAMPLE_RATE), 1.1), LEVEL[key]);
  const wav = toWav(samples, SAMPLE_RATE);
  fs.writeFileSync(path.join(OUT_DIR, `${FILENAME[key]}.wav`), wav);
  const ms = Math.round((samples.length / SAMPLE_RATE) * 1000);
  console.log(`  ${FILENAME[key]}.wav`.padEnd(18) + `${String(ms).padStart(5)}ms  ${(wav.length / 1024).toFixed(1)}KB`);
}

console.log(`\n${Object.keys(CUES).length} cartoon cues written to assets/sounds/`);
