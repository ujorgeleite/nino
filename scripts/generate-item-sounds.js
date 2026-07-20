#!/usr/bin/env node
// scripts/generate-item-sounds.js
// The voices of the items: a duck quacks, a horse neighs, a bicycle rings.
//
// Every one is synthesized from scratch — no samples, no libraries, nothing
// licensed. That matters more here than for the UI cues, because animal
// recordings are exactly the kind of asset that carries rights.
//
// HOW THE ANIMALS WORK: source-filter synthesis.
//
// A voice is a buzzy glottal pulse pushed through the resonances of a throat
// and mouth. Those resonances — FORMANTS — are what distinguish one animal
// from another far more than pitch does. A cow and a cat can hit the same
// note; what makes one a moo is that its energy sits at 250 and 700 Hz while
// the cat's sits at 700 and 2000.
//
// The previous generation stacked sine harmonics instead. That has no throat
// in it, which is precisely why it sounded like a synthesizer imitating an
// animal rather than an animal.
//
// The objects use the matching physical model: struck things get modal
// synthesis with per-partial decay, plucked things get Karplus-Strong, and
// everything gets a short room so it sits somewhere instead of in a vacuum.
//
// Run: node scripts/generate-item-sounds.js   (or `make item-sounds`)

const fs = require('fs');
const path = require('path');
const {
  adsr,
  biquad,
  buffer,
  formantBank,
  glottalSource,
  mixAt,
  modal,
  movingFormants,
  normalize,
  pluckedString,
  removeDC,
  room,
  shape,
  softClip,
  toWav,
  whiteNoise,
} = require('./lib/dsp');

const SR = 22050; // raised from 16k: formants above 6kHz were being lost
const OUT = path.join(__dirname, '..', 'assets', 'sounds', 'items');

const buf = (ms) => buffer(ms, SR);
const at = (ms, b, gain = 1) => ({ at: ms, buffer: b, gain });

// Common amplitude curves.
const bell = (t) => Math.sin(Math.PI * t);
const hit = (t) => Math.exp(-t * 6);

/**
 * A voiced animal call.
 *
 * @param formants  either one set (held) or [from, to] (a moving mouth)
 * @param rough     0..1 jitter in the vocal folds; higher reads as more animal
 * @param breath    0..1 of noise mixed into the source — a real throat leaks air
 */
function call({
  ms,
  pitch,
  formants,
  rough = 0.4,
  breath = 0.08,
  amp = bell,
  seed = 5,
  reverb = 0.1,
}) {
  const length = Math.round((ms / 1000) * SR);

  const source = glottalSource({ length, sampleRate: SR, pitch, rough, seed });

  // Air leaking past the folds. Without it a call is too clean to be alive.
  if (breath > 0) {
    const air = whiteNoise(length, seed + 1);
    biquad(air, SR, 'bandpass', 1800, 0.8);
    for (let i = 0; i < length; i++) source[i] += air[i] * breath;
  }

  const moving = Array.isArray(formants[0]);
  const voiced = moving
    ? movingFormants(source, SR, formants)
    : formantBank(source, SR, formants);

  shape(voiced, amp);
  room(voiced, SR, { amount: reverb, size: 0.4 });
  return voiced;
}

// ---------------------------------------------------------------------------
// The voices
// ---------------------------------------------------------------------------

const VOICES = {
  // --- Animals ------------------------------------------------------------

  // A low back vowel, roughly "mooo". F1 low and F2 low is what makes it read
  // as a big animal: a small throat cannot produce formants this low.
  moo: () =>
    mixAt(
      [
        at(
          0,
          call({
            ms: 900,
            pitch: (t) => 148 - 34 * t,
            formants: [
              [
                { freq: 260, bandwidth: 70, gain: 1 },
                { freq: 640, bandwidth: 110, gain: 0.7 },
                { freq: 2200, bandwidth: 320, gain: 0.18 },
              ],
              [
                { freq: 210, bandwidth: 60, gain: 1 },
                { freq: 540, bandwidth: 100, gain: 0.55 },
                { freq: 1900, bandwidth: 300, gain: 0.1 },
              ],
            ],
            rough: 0.35,
            breath: 0.05,
            amp: (t) => Math.min(1, t * 7) * Math.min(1, (1 - t) * 4),
            reverb: 0.16, // a cow is outdoors
          }),
        ),
      ],
      SR,
    ),

  // "ee" sliding to "ow": F2 falls from 2200 to 1000 while F1 opens. That
  // gesture IS the meow — the pitch contour alone does not read as a cat.
  meow: () =>
    mixAt(
      [
        at(
          0,
          call({
            ms: 620,
            pitch: (t) => (t < 0.3 ? 420 + t * 700 : 630 - (t - 0.3) * 330),
            formants: [
              [
                { freq: 480, bandwidth: 90, gain: 0.9 },
                { freq: 2150, bandwidth: 200, gain: 1 },
                { freq: 3100, bandwidth: 400, gain: 0.35 },
              ],
              [
                { freq: 760, bandwidth: 130, gain: 1 },
                { freq: 1080, bandwidth: 180, gain: 0.75 },
                { freq: 2700, bandwidth: 420, gain: 0.2 },
              ],
            ],
            rough: 0.5,
            breath: 0.1,
            reverb: 0.08,
          }),
        ),
      ],
      SR,
    ),

  // Two bursts. A bark is mostly TRANSIENT: a wide-band noisy attack over a
  // very short voiced body that collapses immediately.
  bark: () => {
    const one = (seed) => {
      const voiced = call({
        ms: 130,
        pitch: (t) => 300 - 150 * t,
        formants: [
          { freq: 500, bandwidth: 200, gain: 1 },
          { freq: 1500, bandwidth: 400, gain: 0.6 },
          { freq: 2600, bandwidth: 600, gain: 0.25 },
        ],
        rough: 0.7,
        breath: 0.18,
        amp: (t) => Math.exp(-t * 5),
        seed,
        reverb: 0.14,
      });
      const attack = whiteNoise(Math.round(0.02 * SR), seed + 9);
      biquad(attack, SR, 'bandpass', 1400, 1.1);
      shape(attack, (t) => Math.exp(-t * 12));
      return mixAt([at(0, attack, 0.5), at(4, voiced)], SR, 10);
    };
    return mixAt([at(0, one(3)), at(210, one(31))], SR);
  },

  // A duck's syrinx is a buzzing membrane, not folds: very rough, heavily
  // damped, with a strong nasal formant.
  quack: () => {
    const one = (seed) =>
      call({
        ms: 170,
        pitch: (t) => 330 - 70 * t,
        formants: [
          { freq: 900, bandwidth: 350, gain: 1 },
          { freq: 1700, bandwidth: 450, gain: 0.7 },
          { freq: 2900, bandwidth: 700, gain: 0.3 },
        ],
        rough: 0.95, // the buzz is the whole character
        breath: 0.12,
        amp: (t) => Math.min(1, t * 14) * Math.exp(-t * 3.2),
        seed,
        reverb: 0.1,
      });
    return mixAt([at(0, one(7)), at(230, one(23))], SR);
  },

  // Three rising calls then a held, rough squawk. The last one is where the
  // roughness climbs — a rooster's final note is nearly noise.
  crow: () => {
    const note = (ms, hz, rough, seed) =>
      call({
        ms,
        pitch: () => hz,
        formants: [
          { freq: 800, bandwidth: 180, gain: 1 },
          { freq: 2000, bandwidth: 350, gain: 0.8 },
          { freq: 3400, bandwidth: 600, gain: 0.3 },
        ],
        rough,
        breath: 0.14,
        seed,
        reverb: 0.18,
      });
    return mixAt(
      [
        at(0, note(150, 520, 0.4, 2)),
        at(160, note(150, 680, 0.5, 4)),
        at(330, note(480, 860, 0.85, 6)),
      ],
      SR,
    );
  },

  // The flutter is the signature: ~26 Hz amplitude and pitch modulation over a
  // falling contour. Without the flutter it is just a descending vowel.
  neigh: () => {
    const v = call({
      ms: 850,
      pitch: (t) => (640 - 340 * t) * (1 + Math.sin(t * 95) * 0.045),
      formants: [
        [
          { freq: 520, bandwidth: 130, gain: 1 },
          { freq: 1750, bandwidth: 260, gain: 0.7 },
          { freq: 2900, bandwidth: 500, gain: 0.22 },
        ],
        [
          { freq: 400, bandwidth: 110, gain: 1 },
          { freq: 1400, bandwidth: 240, gain: 0.5 },
          { freq: 2500, bandwidth: 480, gain: 0.14 },
        ],
      ],
      rough: 0.6,
      breath: 0.16,
      amp: (t) =>
        Math.min(1, t * 8) * Math.min(1, (1 - t) * 3) * (0.72 + 0.28 * Math.sin(t * 160)),
      reverb: 0.2,
    });
    return mixAt([at(0, v)], SR);
  },

  // Low, wide-band, slowly pulsing. Kept warm and unthreatening — a bear a
  // 2-year-old meets, not one they run from.
  growl: () => {
    const v = call({
      ms: 780,
      pitch: (t) => 88 - 12 * t,
      formants: [
        { freq: 300, bandwidth: 160, gain: 1 },
        { freq: 900, bandwidth: 380, gain: 0.5 },
        { freq: 1800, bandwidth: 600, gain: 0.16 },
      ],
      rough: 0.8,
      breath: 0.22,
      amp: (t) => bell(t) * (0.7 + 0.3 * Math.sin(t * 30)),
      reverb: 0.22,
    });
    return mixAt([at(0, v)], SR);
  },

  // Soft and nasal, two notes. Deer calls are breathy and almost flute-like.
  deerCall: () => {
    const note = (ms, from, to, seed) =>
      call({
        ms,
        pitch: (t) => from + (to - from) * t,
        formants: [
          { freq: 620, bandwidth: 140, gain: 1 },
          { freq: 1500, bandwidth: 300, gain: 0.45 },
          { freq: 2600, bandwidth: 500, gain: 0.12 },
        ],
        rough: 0.25,
        breath: 0.26, // breathier than any other animal here
        seed,
        reverb: 0.24, // a forest
      });
    return mixAt([at(0, note(320, 350, 300, 13)), at(360, note(420, 320, 250, 19))], SR);
  },

  // --- Things -------------------------------------------------------------

  // A real bicycle bell is a struck dome: strongly inharmonic, with the high
  // partials dying first. Modal synthesis is exactly that.
  bicycleBell: () => {
    const ding = (seed) => {
      const b = modal({
        length: Math.round(0.55 * SR),
        sampleRate: SR,
        freq: 1900,
        modes: [
          { ratio: 1, gain: 1, decay: 5 },
          { ratio: 2.41, gain: 0.5, decay: 9 },
          { ratio: 3.83, gain: 0.28, decay: 16 },
          { ratio: 5.12, gain: 0.14, decay: 26 },
        ],
        seed,
      });
      room(b, SR, { amount: 0.14, size: 0.35 });
      return b;
    };
    return mixAt([at(0, ding(3)), at(170, ding(29))], SR);
  },

  // Two horns a major third apart, each slightly detuned against itself so
  // they beat — real horns are never perfectly in tune with themselves.
  carHorn: () => {
    const beep = () => {
      const length = Math.round(0.26 * SR);
      const out = new Float32Array(length);
      for (const [hz, g] of [
        [420, 1],
        [423, 0.9], // the beat
        [525, 0.7],
        [529, 0.6],
      ]) {
        for (let i = 0; i < length; i++) {
          const s = i / SR;
          // Square-ish: horns are reedy, not sinusoidal.
          const v = Math.sin(2 * Math.PI * hz * s) + 0.32 * Math.sin(6 * Math.PI * hz * s);
          out[i] += v * g;
        }
      }
      biquad(out, SR, 'lowpass', 3000, 0.9);
      adsr(out, SR, { attack: 0.012, decay: 0.03, sustain: 0.85, release: 0.05 });
      room(out, SR, { amount: 0.1, size: 0.3 });
      return out;
    };
    return mixAt([at(0, beep()), at(320, beep())], SR);
  },

  // Bigger, lower, slower to speak.
  busHorn: () => {
    const length = Math.round(0.6 * SR);
    const out = new Float32Array(length);
    for (const [hz, g] of [
      [196, 1],
      [198, 0.85],
      [262, 0.6],
    ]) {
      for (let i = 0; i < length; i++) {
        const s = i / SR;
        out[i] +=
          (Math.sin(2 * Math.PI * hz * s) + 0.4 * Math.sin(6 * Math.PI * hz * s)) * g;
      }
    }
    biquad(out, SR, 'lowpass', 2200, 0.9);
    adsr(out, SR, { attack: 0.05, decay: 0.06, sustain: 0.85, release: 0.14 });
    room(out, SR, { amount: 0.16, size: 0.5 });
    return out;
  },

  // Very low, very slow, and wet — a ship's horn is defined by the water
  // around it as much as by the pitch.
  boatHorn: () => {
    const length = Math.round(1.15 * SR);
    const out = new Float32Array(length);
    for (const [hz, g] of [
      [110, 1],
      [111.4, 0.9],
      [165, 0.45],
      [220, 0.2],
    ]) {
      for (let i = 0; i < length; i++) {
        const s = i / SR;
        out[i] +=
          (Math.sin(2 * Math.PI * hz * s) + 0.25 * Math.sin(4 * Math.PI * hz * s)) * g;
      }
    }
    biquad(out, SR, 'lowpass', 1400, 0.8);
    adsr(out, SR, { attack: 0.14, decay: 0.1, sustain: 0.9, release: 0.35 });
    room(out, SR, { amount: 0.3, size: 0.85 }); // open water
    return out;
  },

  // A watch escapement: a tiny metallic click with a real strike transient.
  watchTick: () => {
    const click = (hz, seed) => {
      const b = modal({
        length: Math.round(0.09 * SR),
        sampleRate: SR,
        freq: hz,
        modes: [
          { ratio: 1, gain: 1, decay: 90 },
          { ratio: 2.7, gain: 0.4, decay: 140 },
        ],
        seed,
      });
      biquad(b, SR, 'highpass', 1200, 0.8);
      return b;
    };
    const out = mixAt(
      [at(0, click(2600, 2)), at(190, click(2050, 4)), at(380, click(2600, 6))],
      SR,
    );
    room(out, SR, { amount: 0.08, size: 0.2 });
    return out;
  },

  // A bowed string, modelled rather than stacked: Karplus-Strong for the body,
  // a slow attack for the bow, and vibrato.
  violinNote: () => {
    const length = Math.round(1.0 * SR);
    const str = pluckedString({
      length,
      sampleRate: SR,
      freq: 440,
      damping: 0.25,
      brightness: 0.75,
      seed: 41,
    });
    // Bowing: re-excite gently so it sustains rather than decays like a pluck.
    for (let i = 0; i < length; i++) {
      const s = i / SR;
      const vib = 1 + Math.sin(2 * Math.PI * 5.2 * s) * 0.006;
      str[i] += Math.sin(2 * Math.PI * 440 * vib * s) * 0.22 * Math.min(1, s * 4);
    }
    biquad(str, SR, 'peaking', 2400, 1.2, 4); // the body resonance of a violin
    adsr(str, SR, { attack: 0.12, decay: 0.15, sustain: 0.8, release: 0.3 });
    room(str, SR, { amount: 0.22, size: 0.6 });
    return str;
  },

  // A burst of air, not a tone. The pitch drop is the rubber relaxing.
  balloonPop: () => {
    const length = Math.round(0.13 * SR);
    const n = whiteNoise(length, 53);
    biquad(n, SR, 'bandpass', 1600, 0.6);
    shape(n, (t) => Math.exp(-t * 26));
    const thump = buf(130);
    let phase = 0;
    for (let i = 0; i < thump.length; i++) {
      const t = i / thump.length;
      phase += (700 - 580 * t) / SR;
      thump[i] = Math.sin(2 * Math.PI * phase) * Math.exp(-t * 14) * 0.4;
    }
    const out = mixAt([at(0, n), at(0, thump)], SR, 20);
    room(out, SR, { amount: 0.14, size: 0.4 });
    return out;
  },

  // Water: a bright impact, then a low gurgle as the cavity collapses.
  splash: () => {
    const impact = whiteNoise(Math.round(0.14 * SR), 59);
    biquad(impact, SR, 'bandpass', 3200, 0.7);
    shape(impact, (t) => Math.exp(-t * 14));

    const wash = whiteNoise(Math.round(0.5 * SR), 61);
    biquad(wash, SR, 'lowpass', 1100, 1.2);
    shape(wash, (t) => Math.exp(-t * 4.5));

    // The gurgle: a short rising tone, which is a real bubble resonating.
    const bubble = buf(180);
    let phase = 0;
    for (let i = 0; i < bubble.length; i++) {
      const t = i / bubble.length;
      phase += (320 + 420 * t) / SR;
      bubble[i] = Math.sin(2 * Math.PI * phase) * Math.exp(-t * 7) * 0.3;
    }

    const out = mixAt([at(0, impact, 0.9), at(30, wash, 0.7), at(80, bubble)], SR);
    room(out, SR, { amount: 0.18, size: 0.5 });
    return out;
  },

  // Three bites. Each is a filtered noise burst with a hard transient — the
  // sound of something brittle fracturing.
  crunch: () => {
    const bite = (ms, cut, seed) => {
      const n = whiteNoise(Math.round((ms / 1000) * SR), seed);
      biquad(n, SR, 'bandpass', cut, 0.9);
      shape(n, (t) => Math.exp(-t * 18) * (1 - t * 0.3));
      return n;
    };
    const out = mixAt(
      [at(0, bite(70, 2400, 67)), at(95, bite(60, 1900, 71)), at(190, bite(80, 1500, 73))],
      SR,
    );
    room(out, SR, { amount: 0.1, size: 0.3 });
    return out;
  },

  // A pass over snow: broadband noise sweeping up in frequency and back down,
  // which is what a moving sound source actually does.
  skiSwish: () => {
    const length = Math.round(0.55 * SR);
    const n = whiteNoise(length, 79);
    // Sweep by filtering in segments — cheap approximation of a moving filter.
    const segments = 8;
    const out = new Float32Array(length);
    for (let s = 0; s < segments; s++) {
      const from = Math.floor((s / segments) * length);
      const to = Math.floor(((s + 1) / segments) * length);
      const chunk = n.slice(from, to);
      const t = s / (segments - 1);
      const centre = 900 + Math.sin(t * Math.PI) * 2600;
      biquad(chunk, SR, 'bandpass', centre, 1.4);
      out.set(chunk, from);
    }
    shape(out, (t) => Math.sin(Math.PI * t) ** 1.4);
    room(out, SR, { amount: 0.2, size: 0.55 });
    return out;
  },

  // A kettle whistle: near-pure, rising, with the breath of steam behind it.
  kettle: () => {
    const length = Math.round(0.85 * SR);
    const out = new Float32Array(length);
    let phase = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const hz = 1780 + 420 * t;
      phase += hz / SR;
      out[i] = Math.sin(2 * Math.PI * phase) + 0.06 * Math.sin(4 * Math.PI * phase);
    }
    const steam = whiteNoise(length, 83);
    biquad(steam, SR, 'bandpass', 4200, 0.7);
    for (let i = 0; i < length; i++) out[i] = out[i] * 0.8 + steam[i] * 0.22;
    adsr(out, SR, { attack: 0.16, decay: 0.1, sustain: 0.9, release: 0.22 });
    room(out, SR, { amount: 0.12, size: 0.35 });
    return out;
  },

  // Rain is many tiny impacts, not a hiss. Individual droplets over a bed is
  // what separates rain from static.
  rain: () => {
    const length = Math.round(1.1 * SR);
    const bed = whiteNoise(length, 89);
    biquad(bed, SR, 'bandpass', 3000, 0.5);
    for (let i = 0; i < length; i++) bed[i] *= 0.35;

    // Scatter discrete droplets deterministically.
    const drops = [];
    let seed = 97;
    for (let i = 0; i < 40; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const atMs = (seed % 1000);
      const d = whiteNoise(Math.round(0.012 * SR), seed);
      biquad(d, SR, 'bandpass', 2000 + (seed % 3000), 2.5);
      shape(d, (t) => Math.exp(-t * 30));
      drops.push(at(atMs, d, 0.5));
    }

    const out = mixAt([at(0, bed), ...drops], SR);
    shape(out, bell);
    room(out, SR, { amount: 0.16, size: 0.45 });
    return out;
  },

  // Wind is filtered noise whose filter MOVES. A static filter is just hiss.
  wind: () => {
    const length = Math.round(1.15 * SR);
    const n = whiteNoise(length, 101);
    const segments = 10;
    const out = new Float32Array(length);
    for (let s = 0; s < segments; s++) {
      const from = Math.floor((s / segments) * length);
      const to = Math.floor(((s + 1) / segments) * length);
      const chunk = n.slice(from, to);
      const t = s / (segments - 1);
      // Two slow oscillations so the gusting never sounds periodic.
      const centre = 420 + Math.sin(t * Math.PI * 1.7) * 200 + Math.sin(t * 5.1) * 90;
      biquad(chunk, SR, 'lowpass', centre, 1.6);
      out.set(chunk, from);
    }
    shape(out, (t) => bell(t) * (0.65 + 0.35 * Math.sin(t * 7)));
    room(out, SR, { amount: 0.24, size: 0.7 });
    return out;
  },
};

// ---------------------------------------------------------------------------

fs.mkdirSync(OUT, { recursive: true });

let total = 0;
for (const [name, render] of Object.entries(VOICES)) {
  // removeDC before normalize: an offset would otherwise eat the headroom
  // that normalize is trying to allocate.
  const samples = normalize(softClip(removeDC(render(), SR), 1.2), 0.62);
  const wav = toWav(samples, SR);
  fs.writeFileSync(path.join(OUT, `${name}.wav`), wav);
  total += wav.length;
  const ms = Math.round(((wav.length - 44) / 2 / SR) * 1000);
  console.log(
    `  ${name}.wav`.padEnd(20) + `${String(ms).padStart(5)}ms  ${(wav.length / 1024).toFixed(0)}KB`,
  );
}

console.log(
  `\n${Object.keys(VOICES).length} item voices, ${(total / 1024).toFixed(0)} KB total`,
);
