#!/usr/bin/env node
// scripts/generate-sounds.js
// Generates the game's sound cues as 16-bit mono WAVs.
//
// VOICE: classic cartoon — Looney Tunes. Slide whistles, xylophone runs,
// wood blocks, springy boings. Bright, bouncy, comedic. Never harsh: the
// "wrong" cue is a comic slide-down, not a buzzer (CLAUDE.md rule 2 — a wrong
// move is never punished).
//
// React Native has no Web Audio API, so these are synthesized offline here and
// shipped as assets. No copyrighted audio is used.
//
// Run: node scripts/generate-sounds.js   (or `make sounds`)

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

/** Percussive: instant attack, exponential decay. The xylophone/wood shape. */
const struck = (t, decay = 8) => Math.exp(-t * decay);

/** Sustained with soft edges. The whistle shape. */
function breathed(t, attack = 0.06, release = 0.25) {
  if (t < attack) return t / attack;
  if (t > 1 - release) return (1 - t) / release;
  return 1;
}

// ---------------------------------------------------------------------------
// Instruments — each returns Float32 samples
// ---------------------------------------------------------------------------

function buffer(durationMs) {
  return new Float32Array(Math.round((durationMs / 1000) * SAMPLE_RATE));
}

/**
 * Xylophone / marimba. Bright inharmonic partials over a fast decay — the
 * classic cartoon "tinkle" used for runs and stingers.
 */
function xylo({ durationMs = 220, hz = 523, gain = 0.5, decay = 11 }) {
  const out = buffer(durationMs);
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    const s = i / SAMPLE_RATE;
    // Partials at 3.0x and 5.6x are what make a bar sound struck, not blown.
    const body =
      Math.sin(2 * Math.PI * hz * s) * 1.0 +
      Math.sin(2 * Math.PI * hz * 3.0 * s) * 0.34 * Math.exp(-s * 26) +
      Math.sin(2 * Math.PI * hz * 5.6 * s) * 0.16 * Math.exp(-s * 42);
    out[i] = body * struck(t, decay) * gain * 0.6;
  }
  return out;
}

/**
 * Slide whistle. A smooth pitch glide with vibrato and a breath of noise —
 * the single most recognisable cartoon sound.
 */
function slideWhistle({ durationMs = 420, startHz = 500, endHz = 1400, gain = 0.42 }) {
  const out = buffer(durationMs);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    const s = i / SAMPLE_RATE;
    // Ease the glide so it swoops rather than ramps linearly.
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const vibrato = 1 + Math.sin(2 * Math.PI * 5.5 * s) * 0.012;
    const hz = (startHz + (endHz - startHz) * eased) * vibrato;
    phase += hz / SAMPLE_RATE;

    const tone = Math.sin(2 * Math.PI * phase) + Math.sin(4 * Math.PI * phase) * 0.12;
    const breath = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.05;
    out[i] = (tone + breath) * breathed(t) * gain;
  }
  return out;
}

/** Wood block / temple block: a dry "tok". Pitch drops instantly, dies fast. */
function woodBlock({ durationMs = 90, hz = 900, gain = 0.5 }) {
  const out = buffer(durationMs);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    const s = i / SAMPLE_RATE;
    const pitch = hz * Math.exp(-s * 55); // the "tok" click-down
    phase += pitch / SAMPLE_RATE;
    const noise = (Math.sin(i * 78.233) * 12345.6789) % 1;
    out[i] = (Math.sin(2 * Math.PI * phase) * 0.8 + noise * 0.25) * struck(t, 26) * gain;
  }
  return out;
}

/**
 * Boing. Pitch wobbles around a centre with a decaying depth — the spring
 * every cartoon character bounces off.
 */
function boing({ durationMs = 320, hz = 260, gain = 0.4, wobbleHz = 17 }) {
  const out = buffer(durationMs);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    const s = i / SAMPLE_RATE;
    const depth = 0.55 * Math.exp(-s * 9);
    const pitch = hz * (1 + Math.sin(2 * Math.PI * wobbleHz * s) * depth);
    phase += pitch / SAMPLE_RATE;
    // Triangle-ish body keeps it comic rather than synthetic.
    const tri = 4 * Math.abs(phase - Math.floor(phase + 0.5)) - 1;
    out[i] = tri * struck(t, 6) * gain;
  }
  return out;
}

/** Bright pop, like a cork. Very short rising blip. */
function pop({ durationMs = 110, startHz = 420, endHz = 980, gain = 0.42 }) {
  const out = buffer(durationMs);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    const hz = startHz + (endHz - startHz) * t * t;
    phase += hz / SAMPLE_RATE;
    out[i] = Math.sin(2 * Math.PI * phase) * struck(t, 9) * gain;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mixing
// ---------------------------------------------------------------------------

/** Places rendered voices on a timeline at given offsets (ms). */
function mix(events) {
  const totalMs = Math.max(...events.map((e) => e.atMs + e.samples.length / SAMPLE_RATE * 1000));
  const out = new Float32Array(Math.round((totalMs / 1000) * SAMPLE_RATE) + 1);

  for (const { atMs, samples } of events) {
    const start = Math.round((atMs / 1000) * SAMPLE_RATE);
    for (let i = 0; i < samples.length; i++) {
      const j = start + i;
      if (j < out.length) out[j] += samples[i];
    }
  }

  // Guard against a click at the very end of the file.
  const tail = Math.min(400, out.length);
  for (let i = 0; i < tail; i++) out[out.length - 1 - i] *= i / tail;

  return out;
}

/**
 * Normalizes a cue to an exact peak.
 *
 * Without this the cues drift apart in loudness as the synthesis is tuned, and
 * feedback volume jumps around mid-game. The targets also ENCODE rule 10:
 * the win is the loudest thing in the app and the miss is quieter than the
 * match, so celebration always outweighs failure — by construction, not by ear.
 */
function normalize(samples, targetPeak) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  if (peak === 0) return samples;
  const k = targetPeak / peak;
  for (let i = 0; i < samples.length; i++) samples[i] *= k;
  return samples;
}

/** Peak level per cue. Ordering here is the rule-10 guarantee. */
const LEVEL = {
  click: 0.5, //   frequent, must not fatigue
  flip: 0.55, //   frequent
  noMatch: 0.5, // QUIETER than match — a miss is never the loud moment
  match: 0.75,
  ihuu: 0.75,
  win: 0.95, //    the loudest sound in the app
};

const at = (atMs, samples) => ({ atMs, samples });

/** 16-bit mono PCM WAV container. */
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
// The cues
// ---------------------------------------------------------------------------

// Note frequencies used across the cues.
const C5 = 523, D5 = 587, E5 = 659, F5 = 698, G5 = 784, A5 = 880, B5 = 988;
const C6 = 1047, E6 = 1319, G6 = 1568;

const CUES = {
  // Card lift: a light wood tap with a bright pop on top. Quick, not chirpy.
  flip: () => mix([
    at(0, woodBlock({ durationMs: 80, hz: 1100, gain: 0.34 })),
    at(10, pop({ durationMs: 130, startHz: 620, endHz: 1150, gain: 0.3 })),
  ]),

  // Pair found: a fast rising xylophone run. The classic "got it!" tinkle.
  match: () => mix([
    at(0, xylo({ hz: C5, durationMs: 200 })),
    at(70, xylo({ hz: E5, durationMs: 200 })),
    at(140, xylo({ hz: G5, durationMs: 220 })),
    at(210, xylo({ hz: C6, durationMs: 300, gain: 0.55 })),
  ]),

  // Miss: a comic slide DOWN plus a soft boing. Playful, never a buzzer —
  // a wrong move must feel like a joke, not a penalty (rule 2).
  noMatch: () => mix([
    at(0, slideWhistle({ durationMs: 380, startHz: 780, endHz: 300, gain: 0.3 })),
    at(300, boing({ durationMs: 260, hz: 190, gain: 0.26, wobbleHz: 14 })),
  ]),

  // Piece pickup / drop: a dry wood block. Percussive, no pitch.
  click: () => mix([at(0, woodBlock({ durationMs: 85, hz: 820, gain: 0.45 }))]),

  // Piece seated ("ihuu"): a slide UP capped by a bright xylophone ping.
  ihuu: () => mix([
    at(0, slideWhistle({ durationMs: 300, startHz: 520, endHz: 1250, gain: 0.32 })),
    at(250, xylo({ hz: E6, durationMs: 260, gain: 0.5 })),
    at(250, xylo({ hz: G6, durationMs: 260, gain: 0.3 })),
  ]),

  // Win: a full cartoon fanfare — xylophone run up the scale, a whistle swoop,
  // then a ringing chord. Long and loud on purpose (rule 10: the celebration
  // always outweighs any failure).
  win: () => mix([
    at(0, xylo({ hz: C5, durationMs: 180 })),
    at(90, xylo({ hz: D5, durationMs: 180 })),
    at(180, xylo({ hz: E5, durationMs: 180 })),
    at(270, xylo({ hz: F5, durationMs: 180 })),
    at(360, xylo({ hz: G5, durationMs: 200 })),
    at(450, xylo({ hz: A5, durationMs: 200 })),
    at(540, xylo({ hz: B5, durationMs: 200 })),
    at(630, slideWhistle({ durationMs: 320, startHz: 900, endHz: 1500, gain: 0.26 })),
    // Final chord, held.
    at(860, xylo({ hz: C6, durationMs: 900, gain: 0.55, decay: 3.4 })),
    at(860, xylo({ hz: E6, durationMs: 900, gain: 0.34, decay: 3.4 })),
    at(860, xylo({ hz: G6, durationMs: 900, gain: 0.24, decay: 3.4 })),
  ]),
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const FILENAME = { flip: 'flip', match: 'match', noMatch: 'no-match', click: 'click', ihuu: 'ihuu', win: 'win' };

for (const [key, render] of Object.entries(CUES)) {
  const samples = normalize(render(), LEVEL[key]);
  const wav = toWav(samples);
  fs.writeFileSync(path.join(OUT_DIR, `${FILENAME[key]}.wav`), wav);
  const ms = Math.round((samples.length / SAMPLE_RATE) * 1000);
  console.log(`  ${FILENAME[key]}.wav`.padEnd(18) + `${String(ms).padStart(5)}ms  ${(wav.length / 1024).toFixed(1)}KB`);
}

console.log(`\n${Object.keys(CUES).length} cartoon cues written to assets/sounds/`);
