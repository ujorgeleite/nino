#!/usr/bin/env node
// scripts/generate-music.js
// One ambient loop per country PER GAME.
//
// WHAT CHANGED AND WHY
//
// Before, eleven countries shared five generic timbres — a music box, a
// marimba, a harp, a flute, some bells — cycled arbitrarily. Two countries
// with the same timbre were indistinguishable, and switching between Memory
// and Shape Fit in one country played the identical loop.
//
// Now:
//
//   1. Each country has its OWN instrument, chosen because it belongs there:
//      a musette accordion for France, an alphorn and cowbells for
//      Switzerland, a nyckelharpa-ish bowed drone for Sweden, a mandolin for
//      Italy, a carillon for the Low Countries. Instrumentation carries far
//      more of "where am I" than key or mode ever could.
//   2. Each GAME gets its own arrangement of that instrument:
//      - MEMORY is sparse and suspended. The child is remembering; the music
//        should leave room to think, so notes are fewer and longer.
//      - SHAPE FIT is gently pulsed. The child is doing; a soft repeating
//        figure supports action without ever driving it.
//
// Nothing is transcribed or sampled. Melodies are derived deterministically
// from the country code over plain diatonic harmony, so there is no copyright
// exposure — the same approach as every other sound in this app.
//
// Run: node scripts/generate-music.js   (or `make music`)

const fs = require('fs');
const path = require('path');
const {
  adsr,
  biquad,
  modal,
  normalize,
  pluckedString,
  removeDC,
  room,
  shape,
  softClip,
  toWav,
  whiteNoise,
} = require('./lib/dsp');

const SR = 16000; // ample for soft tonal material; a third of the bytes
const OUT_DIR = path.join(__dirname, '..', 'assets', 'music');
const BARS = 4;
const BEATS_PER_BAR = 4;

/** The two arrangements. */
const GAMES = ['memory', 'shapefit'];

// ---------------------------------------------------------------------------
// Theory
// ---------------------------------------------------------------------------

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11], // raised 4th — dreamy, weightless
  dorian: [0, 2, 3, 5, 7, 9, 10], // minor with a bright 6th — wistful, not sad
  mixolydian: [0, 2, 4, 5, 7, 9, 10], // major with a flat 7th — folky
};

const PROGRESSIONS = [
  [0, 4, 5, 3], // I  V  vi IV
  [0, 5, 3, 4], // I  vi IV V
  [0, 3, 4, 0], // I  IV V  I
  [5, 3, 0, 4], // vi IV I  V
];

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function degreeToMidi(key, mode, degree, octave) {
  const scale = MODES[mode];
  const wrapped = ((degree % scale.length) + scale.length) % scale.length;
  const octaveShift = Math.floor(degree / scale.length);
  return 12 * (octave + 1 + octaveShift) + NOTE_INDEX[key] + scale[wrapped];
}

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Instruments — one per country, chosen to belong there
// ---------------------------------------------------------------------------
//
// Each returns a Float32Array for one note. These are impressions, not
// emulations: what matters is that a child hears "somewhere else", and that
// no two countries sound alike.

/** Carillon — the bell towers of the Low Countries. Long, shimmering decay. */
function carillon(hz, ms) {
  const out = modal({
    length: Math.round((ms / 1000) * SR),
    sampleRate: SR,
    freq: hz,
    modes: [
      { ratio: 0.5, gain: 0.35, decay: 1.4 }, // the hum tone under a real bell
      { ratio: 1, gain: 1, decay: 1.8 },
      { ratio: 1.19, gain: 0.4, decay: 2.6 }, // the minor-third bell partial
      { ratio: 2.0, gain: 0.3, decay: 3.4 },
      { ratio: 2.5, gain: 0.16, decay: 5 },
    ],
    seed: Math.round(hz),
  });
  room(out, SR, { amount: 0.3, size: 0.8 });
  return out;
}

/** Musette accordion — France. Two reeds detuned against each other. */
function accordion(hz, ms) {
  const length = Math.round((ms / 1000) * SR);
  const out = new Float32Array(length);
  // The musette wobble comes from detuning, not vibrato.
  for (const [ratio, gain] of [
    [1, 1],
    [1.006, 0.9],
    [0.995, 0.8],
  ]) {
    for (let i = 0; i < length; i++) {
      const s = i / SR;
      const p = hz * ratio * s;
      // Reedy: a sawtooth-ish stack, which is what a free reed produces.
      out[i] +=
        (Math.sin(2 * Math.PI * p) +
          0.45 * Math.sin(4 * Math.PI * p) +
          0.26 * Math.sin(6 * Math.PI * p) +
          0.14 * Math.sin(8 * Math.PI * p)) *
        gain;
    }
  }
  biquad(out, SR, 'lowpass', 2600, 0.9);
  adsr(out, SR, { attack: 0.05, decay: 0.1, sustain: 0.75, release: 0.35 });
  room(out, SR, { amount: 0.16, size: 0.45 });
  return out;
}

/** Alphorn — Switzerland. A long natural horn: pure, slow, distant. */
function alphorn(hz, ms) {
  const length = Math.round((ms / 1000) * SR);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const s = i / SR;
    out[i] =
      Math.sin(2 * Math.PI * hz * s) +
      0.4 * Math.sin(4 * Math.PI * hz * s) +
      0.16 * Math.sin(6 * Math.PI * hz * s) +
      0.06 * Math.sin(8 * Math.PI * hz * s);
  }
  biquad(out, SR, 'lowpass', 1800, 0.8);
  adsr(out, SR, { attack: 0.14, decay: 0.12, sustain: 0.85, release: 0.4 });
  room(out, SR, { amount: 0.38, size: 0.95 }); // a valley
  return out;
}

/** Mandolin — Italy. Plucked, bright, with the tremolo of paired strings. */
function mandolin(hz, ms) {
  const length = Math.round((ms / 1000) * SR);
  const a = pluckedString({ length, sampleRate: SR, freq: hz, damping: 0.35, brightness: 1, seed: Math.round(hz) });
  // Paired courses, very slightly apart: the shimmer of a mandolin.
  const b = pluckedString({ length, sampleRate: SR, freq: hz * 1.004, damping: 0.35, brightness: 0.9, seed: Math.round(hz) + 7 });
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = a[i] * 0.6 + b[i] * 0.5;
  biquad(out, SR, 'peaking', 2200, 1.2, 4);
  shape(out, (t) => Math.exp(-t * 2.6));
  room(out, SR, { amount: 0.2, size: 0.5 });
  return out;
}

/** Nyckelharpa-ish bowed drone — Sweden and Norway. Sympathetic resonance. */
function bowedFolk(hz, ms) {
  const length = Math.round((ms / 1000) * SR);
  const out = pluckedString({ length, sampleRate: SR, freq: hz, damping: 0.2, brightness: 0.7, seed: Math.round(hz) });
  // Bow it: keep feeding energy in so it sustains instead of decaying.
  for (let i = 0; i < length; i++) {
    const s = i / SR;
    const vib = 1 + Math.sin(2 * Math.PI * 4.6 * s) * 0.005;
    out[i] += Math.sin(2 * Math.PI * hz * vib * s) * 0.3 * Math.min(1, s * 3);
  }
  // Sympathetic strings an octave and a fifth up — the nyckelharpa's halo.
  for (const r of [2, 3]) {
    for (let i = 0; i < length; i++) {
      const s = i / SR;
      out[i] += Math.sin(2 * Math.PI * hz * r * s) * 0.06 * Math.min(1, s * 2);
    }
  }
  biquad(out, SR, 'lowpass', 3200, 0.9);
  adsr(out, SR, { attack: 0.16, decay: 0.14, sustain: 0.8, release: 0.4 });
  room(out, SR, { amount: 0.28, size: 0.7 });
  return out;
}

/** Zither — Austria. Plucked, dry, close, with a wooden body. */
function zither(hz, ms) {
  const length = Math.round((ms / 1000) * SR);
  const out = pluckedString({ length, sampleRate: SR, freq: hz, damping: 0.45, brightness: 0.85, seed: Math.round(hz) });
  biquad(out, SR, 'peaking', 900, 1.4, 5); // the box
  shape(out, (t) => Math.exp(-t * 3.2));
  room(out, SR, { amount: 0.14, size: 0.35 }); // a parlour, not a hall
  return out;
}

/** Glockenspiel — Germany. Bright struck metal, clean and orderly. */
function glockenspiel(hz, ms) {
  const out = modal({
    length: Math.round((ms / 1000) * SR),
    sampleRate: SR,
    freq: hz,
    modes: [
      { ratio: 1, gain: 1, decay: 2.6 },
      { ratio: 2.76, gain: 0.42, decay: 4.4 },
      { ratio: 5.4, gain: 0.18, decay: 7 },
    ],
    seed: Math.round(hz),
  });
  room(out, SR, { amount: 0.2, size: 0.5 });
  return out;
}

/** Pennywhistle — the British Isles. Breathy, simple, a little wild. */
function whistle(hz, ms) {
  const length = Math.round((ms / 1000) * SR);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const s = i / SR;
    const vib = 1 + Math.sin(2 * Math.PI * 5 * s) * 0.008;
    out[i] = Math.sin(2 * Math.PI * hz * vib * s) + 0.12 * Math.sin(6 * Math.PI * hz * s);
  }
  const air = whiteNoise(length, Math.round(hz));
  biquad(air, SR, 'bandpass', hz * 2.2, 0.8);
  for (let i = 0; i < length; i++) out[i] = out[i] * 0.86 + air[i] * 0.2;
  adsr(out, SR, { attack: 0.04, decay: 0.08, sustain: 0.82, release: 0.25 });
  room(out, SR, { amount: 0.24, size: 0.6 });
  return out;
}

/** Music box — Denmark. Tiny plucked comb teeth, fragile and nostalgic. */
function musicBox(hz, ms) {
  const out = modal({
    length: Math.round((ms / 1000) * SR),
    sampleRate: SR,
    freq: hz,
    modes: [
      { ratio: 1, gain: 1, decay: 4.5 },
      { ratio: 3.01, gain: 0.38, decay: 9 },
      { ratio: 5.4, gain: 0.16, decay: 14 },
      { ratio: 7.2, gain: 0.07, decay: 22 },
    ],
    seed: Math.round(hz),
  });
  room(out, SR, { amount: 0.22, size: 0.45 });
  return out;
}

/** Marimba — Belgium. Warm wood over a resonator tube. */
function marimba(hz, ms) {
  const out = modal({
    length: Math.round((ms / 1000) * SR),
    sampleRate: SR,
    freq: hz,
    modes: [
      { ratio: 1, gain: 1, decay: 3.4 },
      { ratio: 4.0, gain: 0.3, decay: 8 },
      { ratio: 10.0, gain: 0.08, decay: 16 },
    ],
    seed: Math.round(hz),
  });
  biquad(out, SR, 'peaking', hz, 2.2, 4); // the tube under the bar
  room(out, SR, { amount: 0.18, size: 0.45 });
  return out;
}

const INSTRUMENTS = {
  carillon,
  accordion,
  alphorn,
  mandolin,
  bowedFolk,
  zither,
  glockenspiel,
  whistle,
  musicBox,
  marimba,
};

// ---------------------------------------------------------------------------
// Arrangement — one per game
// ---------------------------------------------------------------------------

/**
 * MEMORY: sparse and suspended.
 *
 * The child is trying to remember where something was. Music that moves is
 * music that interrupts, so this is mostly held chords with occasional single
 * notes floating over them.
 */
const MEMORY_STYLE = {
  chordGain: 0.13,
  chordSustain: 0.98,
  melodyNotesPerBar: [1, 2], // min, max
  melodyGain: 0.17,
  melodyLength: 2.4, // in beats — long, overlapping
  pulse: null,
};

/**
 * SHAPE FIT: gently pulsed.
 *
 * The child is doing something with their hands. A soft repeating figure
 * supports the action. It must never drive — no accents, no syncopation, just
 * a steady heartbeat under the harmony.
 */
const SHAPEFIT_STYLE = {
  chordGain: 0.1,
  chordSustain: 0.9,
  melodyNotesPerBar: [2, 4],
  melodyGain: 0.16,
  melodyLength: 1.1,
  pulse: { everyBeats: 2, gain: 0.08, octave: 3 },
};

const STYLES = { memory: MEMORY_STYLE, shapefit: SHAPEFIT_STYLE };

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

function compose({ code, key, mode, instrument, tempo }, game) {
  // The same seed for both games, so the two arrangements share a melody and
  // read as the same PLACE heard two ways rather than as two different tunes.
  const rnd = seeded(code);
  const style = STYLES[game];
  const voice = INSTRUMENTS[instrument];

  const beatSec = 60 / tempo;
  const barSec = beatSec * BEATS_PER_BAR;
  const n = Math.round(barSec * BARS * SR);
  const out = new Float32Array(n);

  const progression = PROGRESSIONS[Math.floor(rnd() * PROGRESSIONS.length)];

  const addNote = (startSec, durSec, midi, gain) => {
    const start = Math.round(startSec * SR);
    const note = voice(midiToHz(midi), durSec * 1000);
    for (let i = 0; i < note.length; i++) {
      const j = start + i;
      if (j >= n) break; // nothing spills past the loop point
      out[j] += note[i] * gain;
    }
  };

  for (let bar = 0; bar < BARS; bar++) {
    const root = progression[bar % progression.length];
    const barStart = bar * barSec;

    // Chord bed: root, third, fifth. Low and quiet, under everything.
    [root, root + 2, root + 4].forEach((deg, k) => {
      addNote(
        barStart,
        barSec * style.chordSustain,
        degreeToMidi(key, mode, deg, 3),
        style.chordGain - k * 0.02,
      );
    });

    // The pulse, Shape Fit only.
    if (style.pulse) {
      for (let b = 0; b < BEATS_PER_BAR; b += style.pulse.everyBeats) {
        addNote(
          barStart + b * beatSec,
          beatSec * 0.8,
          degreeToMidi(key, mode, root, style.pulse.octave),
          style.pulse.gain,
        );
      }
    }

    // Melody: always chord tones, so nothing can clash across dozens of loops.
    const [min, max] = style.melodyNotesPerBar;
    const count = min + Math.floor(rnd() * (max - min + 1));
    for (let i = 0; i < count; i++) {
      const beat = Math.floor(rnd() * BEATS_PER_BAR);
      const tone = [root, root + 2, root + 4][Math.floor(rnd() * 3)];
      const octave = rnd() > 0.75 ? 6 : 5;
      addNote(
        barStart + beat * beatSec,
        beatSec * style.melodyLength,
        degreeToMidi(key, mode, tone, octave),
        style.melodyGain,
      );
    }
  }

  // Seamless loop: cross-fade the tail into the head, then trim the head we
  // mixed in. Without this the join clicks every fifteen seconds, which is
  // unbearable across a whole session.
  const fade = Math.round(0.4 * SR);
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    out[n - fade + i] = out[n - fade + i] * (1 - w) + out[i] * w;
  }
  const trimmed = out.slice(0, n - fade);

  removeDC(trimmed, SR);
  softClip(trimmed, 1.05);
  // Music sits UNDER the effects. This ceiling is what keeps it there.
  return normalize(trimmed, 0.4);
}

// ---------------------------------------------------------------------------
// Country data
// ---------------------------------------------------------------------------

/** Minimal parse of the country files; avoids needing a TS toolchain here. */
function readCountries() {
  const dir = path.join(__dirname, '..', 'constants', 'countries');
  const out = [];
  for (const file of fs.readdirSync(dir)) {
    if (!/^[a-z]{2}\.ts$/.test(file)) continue;
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    const code = src.match(/code:\s*'([a-z]{2})'/)?.[1];
    const music = src.match(/music:\s*\{([^}]+)\}/)?.[1];
    if (!code || !music) continue;
    out.push({
      code,
      key: music.match(/key:\s*'([^']+)'/)?.[1],
      mode: music.match(/mode:\s*'([^']+)'/)?.[1],
      instrument: music.match(/instrument:\s*'([^']+)'/)?.[1],
      tempo: Number(music.match(/tempo:\s*(\d+)/)?.[1]),
    });
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

const countries = readCountries();
if (countries.length === 0) {
  console.error('No countries found — did constants/countries move?');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let totalBytes = 0;
for (const c of countries) {
  if (!MODES[c.mode]) throw new Error(`${c.code}: unknown mode "${c.mode}"`);
  if (!INSTRUMENTS[c.instrument]) {
    throw new Error(`${c.code}: unknown instrument "${c.instrument}"`);
  }

  for (const game of GAMES) {
    const wav = toWav(compose(c, game), SR);
    fs.writeFileSync(path.join(OUT_DIR, `${c.code}-${game}.wav`), wav);
    totalBytes += wav.length;
    const secs = ((wav.length - 44) / 2 / SR).toFixed(1);
    console.log(
      `  ${c.code}-${game}.wav`.padEnd(22) +
        `${secs}s  ${(wav.length / 1024).toFixed(0)}KB  ` +
        `${c.key} ${c.mode} ${c.instrument} @${c.tempo}`,
    );
  }
}

console.log(
  `\n${countries.length} countries × ${GAMES.length} games = ` +
    `${countries.length * GAMES.length} loops, ` +
    `${(totalBytes / 1024 / 1024).toFixed(2)} MB total`,
);
