#!/usr/bin/env node
// scripts/generate-music.js
// Generates one seamless ambient loop per country.
//
// ORIGINALITY: every melody is derived deterministically from the country code
// over plain diatonic harmony. Nothing is transcribed, sampled or quoted from
// any existing work, so there is no copyright exposure — the same approach the
// sound effects already use.
//
// VOICE: calm, slow, music-box-like. TODDLER_UX.md asks for gentle looping
// music; anything driving or busy is wrong for a 3–5 minute wind-down session.
//
// SIZE (performance): mono, 16 kHz, ~16 s per country. Roughly 500 KB each and
// ~5.5 MB across eleven countries — acceptable for a 100% offline app, and
// checked by a test so it cannot creep.
//
// Run: node scripts/generate-music.js   (or `make music`)

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 16000; // ample for soft tonal material, a third of the bytes
const OUT_DIR = path.join(__dirname, '..', 'assets', 'music');
const BARS = 4; // one full pass of the chord progression — longer doubles the bytes
const BEATS_PER_BAR = 4;

// ---------------------------------------------------------------------------
// Music theory, minimally
// ---------------------------------------------------------------------------

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** Scale degrees in semitones. */
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11], // raised 4th — dreamy, weightless
  dorian: [0, 2, 3, 5, 7, 9, 10], // minor with a bright 6th — wistful, not sad
  mixolydian: [0, 2, 4, 5, 7, 9, 10], // major with a flat 7th — folky
};

/** Chord progressions, as scale degrees (0-indexed). All resolve gently. */
const PROGRESSIONS = [
  [0, 4, 5, 3], // I  V  vi IV
  [0, 5, 3, 4], // I  vi IV V
  [0, 3, 4, 0], // I  IV V  I
  [5, 3, 0, 4], // vi IV I  V
];

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Degree → MIDI note in a given key/mode, with octave wrapping. */
function degreeToMidi(key, mode, degree, octave) {
  const scale = MODES[mode];
  const wrapped = ((degree % scale.length) + scale.length) % scale.length;
  const octaveShift = Math.floor(degree / scale.length);
  return 12 * (octave + 1 + octaveShift) + NOTE_INDEX[key] + scale[wrapped];
}

/** Deterministic PRNG seeded from a string, so a country always sounds the same. */
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
// Timbres
// ---------------------------------------------------------------------------

/**
 * Each timbre returns a sample at time t (seconds since the note started),
 * for a note of given frequency. Envelopes are baked in.
 */
const TIMBRES = {
  // Struck metal bar: bright inharmonic partials, quick decay.
  musicBox: (t, hz) => {
    const env = Math.exp(-t * 4.5);
    return (
      (Math.sin(2 * Math.PI * hz * t) +
        0.4 * Math.sin(2 * Math.PI * hz * 3.01 * t) * Math.exp(-t * 9) +
        0.18 * Math.sin(2 * Math.PI * hz * 5.4 * t) * Math.exp(-t * 14)) *
      env
    );
  },
  // Wooden bar: warmer, fewer highs, slightly longer body.
  marimba: (t, hz) => {
    const env = Math.exp(-t * 3.6);
    return (
      (Math.sin(2 * Math.PI * hz * t) +
        0.3 * Math.sin(2 * Math.PI * hz * 4 * t) * Math.exp(-t * 12)) *
      env
    );
  },
  // Plucked string: soft attack, long ring.
  harp: (t, hz) => {
    const env = Math.exp(-t * 2.2) * (1 - Math.exp(-t * 120));
    return (
      (Math.sin(2 * Math.PI * hz * t) +
        0.22 * Math.sin(4 * Math.PI * hz * t) +
        0.1 * Math.sin(6 * Math.PI * hz * t)) *
      env
    );
  },
  // Breathy sustained tone with slow vibrato.
  flute: (t, hz) => {
    const attack = Math.min(1, t / 0.12);
    const release = Math.exp(-t * 1.4);
    const vib = 1 + Math.sin(2 * Math.PI * 4.5 * t) * 0.006;
    return (Math.sin(2 * Math.PI * hz * vib * t) + 0.08 * Math.sin(6 * Math.PI * hz * t)) * attack * release;
  },
  // Bell: slow decay, prominent inharmonic partial.
  bells: (t, hz) => {
    const env = Math.exp(-t * 1.8);
    return (
      (Math.sin(2 * Math.PI * hz * t) +
        0.5 * Math.sin(2 * Math.PI * hz * 2.76 * t) * Math.exp(-t * 3) +
        0.25 * Math.sin(2 * Math.PI * hz * 5.4 * t) * Math.exp(-t * 6)) *
      env
    );
  },
};

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/**
 * Builds a loop: a slow chord bed with a sparse melody over it.
 * Melody notes are chosen from the current chord's tones, so nothing can
 * clash — important when the material must bear dozens of repetitions.
 */
function compose({ code, key, mode, timbre, tempo }) {
  const rnd = seeded(code);
  const beatSec = 60 / tempo;
  const barSec = beatSec * BEATS_PER_BAR;
  const totalSec = barSec * BARS;
  const n = Math.round(totalSec * SAMPLE_RATE);
  const out = new Float32Array(n);
  const voice = TIMBRES[timbre];

  const progression = PROGRESSIONS[Math.floor(rnd() * PROGRESSIONS.length)];

  const addNote = (startSec, durSec, midi, gain) => {
    const start = Math.round(startSec * SAMPLE_RATE);
    const len = Math.round(durSec * SAMPLE_RATE);
    const hz = midiToHz(midi);
    for (let i = 0; i < len; i++) {
      const j = start + i;
      if (j >= n) break; // notes never spill past the loop point
      out[j] += voice(i / SAMPLE_RATE, hz) * gain;
    }
  };

  for (let bar = 0; bar < BARS; bar++) {
    const root = progression[bar % progression.length];
    const barStart = bar * barSec;

    // Chord bed: root + third + fifth, low and quiet, held for the bar.
    for (const [k, deg] of [root, root + 2, root + 4].entries()) {
      addNote(barStart, barSec * 0.98, degreeToMidi(key, mode, deg, 3), 0.11 - k * 0.02);
    }

    // Melody: 2–4 notes per bar, always chord tones, mostly stepwise.
    const noteCount = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < noteCount; i++) {
      const beat = Math.floor(rnd() * BEATS_PER_BAR);
      const chordTone = [root, root + 2, root + 4][Math.floor(rnd() * 3)];
      const octave = rnd() > 0.75 ? 6 : 5;
      addNote(
        barStart + beat * beatSec,
        beatSec * 1.6,
        degreeToMidi(key, mode, chordTone, octave),
        0.2,
      );
    }
  }

  // --- Seamless loop -------------------------------------------------------
  // Cross-fade the tail into the head so the join is inaudible. Without this a
  // loop clicks every 16 seconds, which is unbearable over a whole session.
  const fade = Math.round(0.35 * SAMPLE_RATE);
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    const tail = out[n - fade + i];
    out[n - fade + i] = tail * (1 - w) + out[i] * w;
  }
  // Trim the head we just mixed in, so it is not heard twice.
  const trimmed = out.slice(0, n - fade);

  // Normalize to a soft ceiling — background music must sit under the effects.
  let peak = 0;
  for (const s of trimmed) peak = Math.max(peak, Math.abs(s));
  if (peak > 0) for (let i = 0; i < trimmed.length; i++) trimmed[i] *= 0.42 / peak;

  return trimmed;
}

// ---------------------------------------------------------------------------
// WAV
// ---------------------------------------------------------------------------

function toWav(samples) {
  const dataBytes = samples.length * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) {
    const c = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(c * 32767), 44 + i * 2);
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Main — reads the country registry so the two can never drift apart
// ---------------------------------------------------------------------------

/** Minimal parse of the country data files; avoids needing a TS toolchain here. */
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
      timbre: music.match(/timbre:\s*'([^']+)'/)?.[1],
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
  if (!TIMBRES[c.timbre]) throw new Error(`${c.code}: unknown timbre "${c.timbre}"`);

  const wav = toWav(compose(c));
  fs.writeFileSync(path.join(OUT_DIR, `${c.code}.wav`), wav);
  totalBytes += wav.length;
  const secs = ((wav.length - 44) / 2 / SAMPLE_RATE).toFixed(1);
  console.log(
    `  ${c.code}.wav`.padEnd(12) +
      `${secs}s  ${(wav.length / 1024).toFixed(0)}KB  ` +
      `${c.key} ${c.mode} ${c.timbre} @${c.tempo}bpm`,
  );
}

console.log(
  `\n${countries.length} ambient loops, ${(totalBytes / 1024 / 1024).toFixed(2)} MB total`,
);
