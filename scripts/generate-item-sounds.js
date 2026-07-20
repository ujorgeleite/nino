#!/usr/bin/env node
// scripts/generate-item-sounds.js
// The voices of the items: a duck quacks, a horse neighs, a bicycle rings.
//
// Every one is synthesized from scratch — no samples, no libraries, nothing
// licensed. That matters here more than for the UI cues, because animal
// recordings are exactly the kind of asset that carries rights.
//
// These are CARTOON impressions, not field recordings, and deliberately so:
// they have to read instantly to a 2-year-old at low volume on an iPad
// speaker, which a naturalistic recording would not.
//
// Run: node scripts/generate-item-sounds.js   (or `make item-sounds`)

const fs = require('fs');
const path = require('path');

const SR = 16000; // plenty for these; a third of the bytes of 44.1k
const OUT = path.join(__dirname, '..', 'assets', 'sounds', 'items');

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const buf = (ms) => new Float32Array(Math.round((ms / 1000) * SR));

/** Deterministic noise, so a rebuild produces byte-identical files. */
function noiseGen(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 2147483648) - 1;
  };
}

/** One-pole low-pass. Turns white noise into wind, rain, splash, growl. */
function lowpass(samples, cutoffHz) {
  const dt = 1 / SR;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const a = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < samples.length; i++) {
    prev += a * (samples[i] - prev);
    samples[i] = prev;
  }
  return samples;
}

/** One-pole high-pass — removes rumble from bright sounds. */
function highpass(samples, cutoffHz) {
  const dt = 1 / SR;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const a = rc / (rc + dt);
  let prevIn = 0;
  let prevOut = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    prevOut = a * (prevOut + x - prevIn);
    prevIn = x;
    samples[i] = prevOut;
  }
  return samples;
}

/**
 * A voiced tone: harmonic stack with a pitch contour.
 *
 * `pitch(t)` returns Hz at normalized time t (0..1). `harmonics` is a list of
 * amplitudes for partial 1, 2, 3… — the shape of that list is what makes a
 * moo sound different from a meow at the same pitch.
 */
function voiced({ ms, pitch, harmonics, amp = (t) => Math.sin(Math.PI * t), gain = 0.5 }) {
  const out = buf(ms);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    const hz = pitch(t);
    phase += hz / SR;
    let s = 0;
    for (let h = 0; h < harmonics.length; h++) {
      s += harmonics[h] * Math.sin(2 * Math.PI * phase * (h + 1));
    }
    out[i] = s * amp(t) * gain;
  }
  return out;
}

/** Shaped noise: the basis for splash, crunch, wind, rain, growl texture. */
function noise({ ms, cutoff = 2000, amp = (t) => Math.sin(Math.PI * t), gain = 0.5, seed = 7, hp = 0 }) {
  const out = buf(ms);
  const rnd = noiseGen(seed);
  for (let i = 0; i < out.length; i++) out[i] = rnd();
  lowpass(out, cutoff);
  if (hp) highpass(out, hp);
  for (let i = 0; i < out.length; i++) out[i] *= amp(i / out.length) * gain;
  return out;
}

/** Struck metal — bicycle bell, watch tick. Inharmonic partials, fast decay. */
function metal({ ms, hz, partials = [1, 2.76, 5.4], gain = 0.5, decay = 9 }) {
  const out = buf(ms);
  for (let i = 0; i < out.length; i++) {
    const s = i / SR;
    let v = 0;
    for (let p = 0; p < partials.length; p++) {
      v += Math.sin(2 * Math.PI * hz * partials[p] * s) / (p + 1.4);
    }
    out[i] = v * Math.exp(-s * decay) * gain;
  }
  return out;
}

/** Lays voices on a timeline. */
function mix(events) {
  const totalMs = Math.max(...events.map((e) => e.at + (e.s.length / SR) * 1000));
  const out = buf(totalMs + 30);
  for (const { at, s } of events) {
    const start = Math.round((at / 1000) * SR);
    for (let i = 0; i < s.length; i++) {
      const j = start + i;
      if (j < out.length) out[j] += s[i];
    }
  }
  // Fade the tail so no file ends on a click.
  const fade = Math.min(240, out.length);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return out;
}

const at = (ms, s) => ({ at: ms, s });

/** Normalizes to a fixed peak so no animal is startlingly louder than another. */
function normalize(s, peak = 0.62) {
  let max = 0;
  for (const v of s) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < s.length; i++) s[i] *= peak / max;
  return s;
}

// Common amplitude envelopes.
const bell = (t) => Math.sin(Math.PI * t); //          soft in, soft out
const hit = (t) => Math.exp(-t * 6); //                struck
const swell = (t) => Math.min(1, t * 6) * Math.exp(-t * 2.2);

// ---------------------------------------------------------------------------
// The voices
// ---------------------------------------------------------------------------

const VOICES = {
  // --- Animals ------------------------------------------------------------

  // Low, long, falling. Rich harmonics with a slow wobble.
  moo: () =>
    mix([
      at(
        0,
        voiced({
          ms: 750,
          pitch: (t) => (150 - 40 * t) * (1 + Math.sin(t * 26) * 0.012),
          harmonics: [1, 0.7, 0.45, 0.3, 0.18, 0.1],
          amp: (t) => Math.min(1, t * 8) * Math.min(1, (1 - t) * 5),
          gain: 0.4,
        }),
      ),
    ]),

  // Rises then falls; nasal, so odd harmonics dominate.
  meow: () =>
    mix([
      at(
        0,
        voiced({
          ms: 480,
          pitch: (t) => (t < 0.35 ? 380 + t * 900 : 700 - (t - 0.35) * 560),
          harmonics: [1, 0.15, 0.6, 0.1, 0.35, 0.08, 0.2],
          amp: bell,
          gain: 0.36,
        }),
      ),
    ]),

  // Two sharp bursts: a noisy transient over a fast-dropping tone.
  bark: () => {
    const one = (seed) =>
      mix([
        at(0, noise({ ms: 70, cutoff: 2600, amp: hit, gain: 0.5, seed })),
        at(
          0,
          voiced({
            ms: 110,
            pitch: (t) => 260 - 140 * t,
            harmonics: [1, 0.6, 0.4, 0.25],
            amp: (t) => Math.exp(-t * 7),
            gain: 0.45,
          }),
        ),
      ]);
    return mix([at(0, one(3)), at(190, one(11))]);
  },

  // Buzzy and clipped: a mid tone chopped by fast amplitude modulation.
  quack: () => {
    const one = () =>
      voiced({
        ms: 150,
        pitch: (t) => 340 - 60 * t,
        harmonics: [1, 0.8, 0.65, 0.5, 0.35, 0.2],
        amp: (t) => (0.55 + 0.45 * Math.sin(t * 150)) * Math.min(1, (1 - t) * 6),
        gain: 0.42,
      });
    return mix([at(0, one()), at(210, one())]);
  },

  // Four rising calls, the last one held and rough.
  crow: () =>
    mix([
      at(0, voiced({ ms: 130, pitch: () => 520, harmonics: [1, 0.5, 0.3], amp: bell, gain: 0.3 })),
      at(140, voiced({ ms: 130, pitch: () => 660, harmonics: [1, 0.5, 0.3], amp: bell, gain: 0.32 })),
      at(
        290,
        voiced({
          ms: 420,
          pitch: (t) => 880 - 220 * Math.max(0, t - 0.6),
          harmonics: [1, 0.55, 0.4, 0.25, 0.15],
          amp: (t) => Math.min(1, t * 9) * Math.min(1, (1 - t) * 4),
          gain: 0.34,
        }),
      ),
      at(300, noise({ ms: 380, cutoff: 3200, amp: bell, gain: 0.09, seed: 21, hp: 700 })),
    ]),

  // A whinny: falling pitch with a fast flutter on top.
  neigh: () =>
    mix([
      at(
        0,
        voiced({
          ms: 700,
          pitch: (t) => (620 - 330 * t) * (1 + Math.sin(t * 120) * 0.05),
          harmonics: [1, 0.6, 0.45, 0.3, 0.2, 0.12],
          amp: (t) => Math.min(1, t * 10) * Math.min(1, (1 - t) * 3),
          gain: 0.34,
        }),
      ),
      at(120, noise({ ms: 520, cutoff: 1600, amp: bell, gain: 0.07, seed: 33 })),
    ]),

  // Low rumble plus filtered noise, slow amplitude wobble. Never frightening.
  growl: () =>
    mix([
      at(
        0,
        voiced({
          ms: 620,
          pitch: (t) => 95 - 15 * t,
          harmonics: [1, 0.8, 0.5, 0.3],
          amp: (t) => bell(t) * (0.7 + 0.3 * Math.sin(t * 44)),
          gain: 0.34,
        }),
      ),
      at(0, noise({ ms: 620, cutoff: 500, amp: bell, gain: 0.22, seed: 5 })),
    ]),

  // A soft two-note call — a deer is gentle, not a bark.
  deerCall: () =>
    mix([
      at(
        0,
        voiced({
          ms: 300,
          pitch: (t) => 330 - 50 * t,
          harmonics: [1, 0.35, 0.2, 0.1],
          amp: bell,
          gain: 0.34,
        }),
      ),
      at(
        330,
        voiced({
          ms: 380,
          pitch: (t) => 300 - 70 * t,
          harmonics: [1, 0.3, 0.16],
          amp: bell,
          gain: 0.3,
        }),
      ),
    ]),

  // --- Things -------------------------------------------------------------

  // Two bright strikes, the classic ding-ding.
  bicycleBell: () =>
    mix([
      at(0, metal({ ms: 320, hz: 1950, partials: [1, 2.4, 4.1], gain: 0.4, decay: 11 })),
      at(150, metal({ ms: 420, hz: 1950, partials: [1, 2.4, 4.1], gain: 0.42, decay: 9 })),
    ]),

  // Two-tone beep, a major third apart. Beeped twice.
  carHorn: () => {
    const beep = () =>
      mix([
        at(0, voiced({ ms: 230, pitch: () => 420, harmonics: [1, 0.7, 0.4, 0.2], amp: (t) => Math.min(1, t * 20) * Math.min(1, (1 - t) * 12), gain: 0.3 })),
        at(0, voiced({ ms: 230, pitch: () => 525, harmonics: [1, 0.6, 0.3], amp: (t) => Math.min(1, t * 20) * Math.min(1, (1 - t) * 12), gain: 0.24 })),
      ]);
    return mix([at(0, beep()), at(300, beep())]);
  },

  // Same idea, lower and longer — a bus is a bigger thing.
  busHorn: () =>
    mix([
      at(0, voiced({ ms: 520, pitch: () => 230, harmonics: [1, 0.8, 0.5, 0.3, 0.2], amp: (t) => Math.min(1, t * 14) * Math.min(1, (1 - t) * 6), gain: 0.32 })),
      at(0, voiced({ ms: 520, pitch: () => 290, harmonics: [1, 0.6, 0.35], amp: (t) => Math.min(1, t * 14) * Math.min(1, (1 - t) * 6), gain: 0.24 })),
    ]),

  // Deep and slow: a ship's horn across water.
  boatHorn: () =>
    mix([
      at(0, voiced({ ms: 950, pitch: () => 118, harmonics: [1, 0.85, 0.6, 0.4, 0.25, 0.15], amp: swell, gain: 0.4 })),
      at(0, voiced({ ms: 950, pitch: () => 176, harmonics: [1, 0.5, 0.3], amp: swell, gain: 0.22 })),
    ]),

  // Tick-tock-tick. Three dry clicks, close enough together to read as a
  // rhythm rather than as two unrelated noises with a gap.
  watchTick: () => {
    const click = (seed, hz) =>
      mix([
        at(0, noise({ ms: 22, cutoff: 7000, amp: hit, gain: 0.5, seed, hp: 2200 })),
        at(0, metal({ ms: 60, hz, partials: [1, 3.2], gain: 0.22, decay: 60 })),
      ]);
    return mix([
      at(0, click(2, 2400)),
      at(170, click(4, 1900)), // the "tock" sits lower
      at(340, click(6, 2400)),
    ]);
  },

  // A bowed note: sawtooth-ish stack, slow attack, gentle vibrato.
  violinNote: () =>
    mix([
      at(
        0,
        voiced({
          ms: 850,
          pitch: (t) => 440 * (1 + Math.sin(t * 34) * 0.008),
          harmonics: [1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.13, 0.1],
          amp: (t) => Math.min(1, t * 5) * Math.min(1, (1 - t) * 4),
          gain: 0.3,
        }),
      ),
    ]),

  // A short burst with a downward chirp — comic, not startling.
  balloonPop: () =>
    mix([
      at(0, noise({ ms: 45, cutoff: 5000, amp: hit, gain: 0.55, seed: 9 })),
      at(0, voiced({ ms: 90, pitch: (t) => 900 - 700 * t, harmonics: [1, 0.3], amp: (t) => Math.exp(-t * 12), gain: 0.3 })),
    ]),

  // Water: a bright burst settling into a low wash.
  splash: () =>
    mix([
      at(0, noise({ ms: 160, cutoff: 5200, amp: hit, gain: 0.5, seed: 13, hp: 400 })),
      at(60, noise({ ms: 420, cutoff: 1100, amp: (t) => Math.exp(-t * 4), gain: 0.34, seed: 17 })),
    ]),

  // Three quick bites.
  crunch: () =>
    mix([
      at(0, noise({ ms: 55, cutoff: 3400, amp: hit, gain: 0.45, seed: 23, hp: 600 })),
      at(70, noise({ ms: 55, cutoff: 3000, amp: hit, gain: 0.4, seed: 29, hp: 600 })),
      at(150, noise({ ms: 70, cutoff: 2600, amp: hit, gain: 0.36, seed: 31, hp: 500 })),
    ]),

  // A pass of snow under a ski: noise that sweeps up and away.
  skiSwish: () =>
    mix([
      at(
        0,
        noise({
          ms: 480,
          cutoff: 3600,
          amp: (t) => Math.sin(Math.PI * t) ** 1.6,
          gain: 0.34,
          seed: 41,
          hp: 900,
        }),
      ),
    ]),

  // A kettle: a pure whistle sliding upward.
  kettle: () =>
    mix([
      at(
        0,
        voiced({
          ms: 720,
          pitch: (t) => 1750 + 380 * t,
          harmonics: [1, 0.08],
          amp: (t) => Math.min(1, t * 4) * Math.min(1, (1 - t) * 4),
          gain: 0.24,
        }),
      ),
    ]),

  // Soft, steady, unremarkable — which is what rain sounds like.
  rain: () =>
    mix([at(0, noise({ ms: 900, cutoff: 4200, amp: bell, gain: 0.26, seed: 47, hp: 1200 }))]),

  // Low, breathy, slowly swelling.
  wind: () =>
    mix([
      at(
        0,
        noise({
          ms: 950,
          cutoff: 700,
          amp: (t) => Math.sin(Math.PI * t) * (0.7 + 0.3 * Math.sin(t * 9)),
          gain: 0.34,
          seed: 53,
        }),
      ),
    ]),
};

// ---------------------------------------------------------------------------
// WAV
// ---------------------------------------------------------------------------

function toWav(samples) {
  const bytes = samples.length * 2;
  const b = Buffer.alloc(44 + bytes);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + bytes, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(bytes, 40);
  for (let i = 0; i < samples.length; i++) {
    const c = Math.max(-1, Math.min(1, samples[i]));
    b.writeInt16LE(Math.round(c * 32767), 44 + i * 2);
  }
  return b;
}

fs.mkdirSync(OUT, { recursive: true });

let total = 0;
for (const [name, render] of Object.entries(VOICES)) {
  const wav = toWav(normalize(render()));
  fs.writeFileSync(path.join(OUT, `${name}.wav`), wav);
  total += wav.length;
  const ms = Math.round(((wav.length - 44) / 2 / SR) * 1000);
  console.log(`  ${name}.wav`.padEnd(20) + `${String(ms).padStart(5)}ms  ${(wav.length / 1024).toFixed(0)}KB`);
}

console.log(
  `\n${Object.keys(VOICES).length} item voices, ${(total / 1024).toFixed(0)} KB total`,
);
