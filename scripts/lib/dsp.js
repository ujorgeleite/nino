// scripts/lib/dsp.js
// The synthesis toolkit shared by every sound generator.
//
// WHY THIS EXISTS
//
// The first generation of sounds was additive sine stacks through one-pole
// filters. That is why they read as synthetic: a one-pole filter has no
// resonance, and a stack of sines has no body. Real sounds are a SOURCE
// shaped by a RESONATOR — a throat, a wooden box, a metal bar, a room.
//
// Three techniques carry almost all of the realism here:
//
//   1. FORMANTS (source-filter synthesis). An animal call is a buzzy glottal
//      pulse pushed through the resonances of a throat and mouth. Model those
//      resonances as parallel band-passes and a sawtooth becomes a cow. This
//      is the single biggest win in the whole file.
//   2. KARPLUS-STRONG. A noise burst circulating in a damped delay line IS a
//      plucked string, physically. Far more convincing than summing harmonics,
//      and cheaper.
//   3. MODAL synthesis with per-mode decay. Real bells and bars have partials
//      that die at DIFFERENT rates — the high ones first. Decaying them all
//      together is what makes synthetic metal sound like a beep.
//
// Everything is deterministic: same input, byte-identical output, so
// regenerating never churns the git history.

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Noise
// ---------------------------------------------------------------------------

/** Deterministic white noise. An LCG, seeded, so rebuilds are reproducible. */
function noiseGen(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2147483648 - 1;
  };
}

/** Fills a buffer with white noise. */
function whiteNoise(length, seed = 1) {
  const rnd = noiseGen(seed);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = rnd();
  return out;
}

// ---------------------------------------------------------------------------
// Biquad filters (RBJ cookbook)
// ---------------------------------------------------------------------------
//
// A proper 2-pole filter, unlike the one-pole used before. The difference that
// matters is Q: a one-pole cannot resonate, and resonance is what gives a
// filter a voice rather than just a dullness.

/**
 * @param type 'lowpass' | 'highpass' | 'bandpass' | 'peaking'
 * @param q    resonance. 0.7 is neutral; 8+ rings audibly.
 */
function biquadCoefficients(type, sampleRate, freq, q, gainDb = 0) {
  const w0 = (TAU * freq) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const A = Math.pow(10, gainDb / 40);

  let b0, b1, b2, a0, a1, a2;

  switch (type) {
    case 'highpass':
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
    case 'bandpass':
      // Constant peak gain — the form used for formants.
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
    case 'peaking':
      b0 = 1 + alpha * A;
      b1 = -2 * cos;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cos;
      a2 = 1 - alpha / A;
      break;
    case 'lowpass':
    default:
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
  }

  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Applies a biquad in place. Returns the same buffer for chaining. */
function biquad(samples, sampleRate, type, freq, q, gainDb = 0) {
  const c = biquadCoefficients(type, sampleRate, freq, q, gainDb);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    samples[i] = y;
  }
  return samples;
}

// ---------------------------------------------------------------------------
// Source-filter synthesis — the animal voices
// ---------------------------------------------------------------------------

/**
 * A glottal pulse train: the buzz a voice starts as, before a throat shapes it.
 *
 * Modelled as a rounded sawtooth. The rounding matters — a raw sawtooth is
 * too bright and buzzy, and real vocal folds close gradually.
 *
 * @param pitch  f0 in Hz as a function of normalized time (0..1)
 * @param rough  0..1. Adds jitter to the period, which is what makes a call
 *               sound like an animal rather than an oscillator.
 */
function glottalSource({ length, sampleRate, pitch, rough = 0, seed = 3 }) {
  const out = new Float32Array(length);
  const rnd = noiseGen(seed);
  let phase = 0;

  for (let i = 0; i < length; i++) {
    const t = i / length;
    // Jitter the instantaneous frequency slightly; real voices are never
    // perfectly periodic, and perfect periodicity is what reads as "synth".
    const jitter = 1 + rnd() * rough * 0.06;
    phase += (pitch(t) * jitter) / sampleRate;
    if (phase >= 1) phase -= 1;

    // Rounded saw: steep open phase, smooth close. Approximated with a
    // raised-cosine on the closing quarter.
    const p = phase;
    out[i] = p < 0.75 ? (p / 0.75) * 2 - 1 : Math.cos(((p - 0.75) / 0.25) * Math.PI);
  }
  return out;
}

/**
 * A formant: one resonance of a vocal tract.
 *
 * Real vowels are defined by the first two or three of these. Their positions
 * are what distinguish "moo" from "meow" far more than pitch does.
 */
function formantBank(source, sampleRate, formants) {
  const out = new Float32Array(source.length);

  for (const f of formants) {
    // Each formant filters a COPY of the source, in parallel — a series chain
    // would just cascade into silence.
    const band = Float32Array.from(source);
    // Q from bandwidth: a narrow band rings, a wide one merely colours.
    const q = f.freq / (f.bandwidth ?? f.freq * 0.12);
    biquad(band, sampleRate, 'bandpass', f.freq, q);
    const gain = f.gain ?? 1;
    for (let i = 0; i < out.length; i++) out[i] += band[i] * gain;
  }

  return out;
}

/**
 * A formant bank whose frequencies MOVE over the sound.
 *
 * This is what a mouth opening and closing does, and it is the difference
 * between a held vowel and a word. A cat's "meow" is exactly this: formants
 * sliding from an "ee" shape to an "ow" shape.
 *
 * Implemented as a crossfade between a few static snapshots — cheap, and
 * indistinguishable from true time-varying coefficients at these durations.
 */
function movingFormants(source, sampleRate, keyframes, steps = 6) {
  const out = new Float32Array(source.length);
  const n = source.length;

  for (let s = 0; s < steps; s++) {
    const t = steps === 1 ? 0 : s / (steps - 1);
    // Interpolate every formant to this point in the gesture.
    const shape = keyframes[0].map((_, fi) => {
      const from = keyframes[0][fi];
      const to = keyframes[keyframes.length - 1][fi];
      return {
        freq: from.freq + (to.freq - from.freq) * t,
        bandwidth:
          (from.bandwidth ?? from.freq * 0.12) +
          ((to.bandwidth ?? to.freq * 0.12) - (from.bandwidth ?? from.freq * 0.12)) * t,
        gain: (from.gain ?? 1) + ((to.gain ?? 1) - (from.gain ?? 1)) * t,
      };
    });

    const band = formantBank(source, sampleRate, shape);
    // Triangular window around this step's centre, so the snapshots blend.
    const centre = t;
    const width = 1 / Math.max(1, steps - 1);
    for (let i = 0; i < n; i++) {
      const pos = i / n;
      const w = Math.max(0, 1 - Math.abs(pos - centre) / width);
      out[i] += band[i] * w;
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Karplus-Strong — plucked and struck strings
// ---------------------------------------------------------------------------

/**
 * A physically modelled string.
 *
 * A burst of noise is fed into a delay line one period long, and each pass is
 * slightly damped and low-passed. That is literally what a vibrating string
 * does, and the result has an attack, a body and a decay that no additive
 * stack reproduces convincingly.
 *
 * @param damping   0..1. Higher kills the highs faster — a duller string.
 * @param brightness 0..1 of the initial noise burst retained.
 */
function pluckedString({
  length,
  sampleRate,
  freq,
  damping = 0.5,
  brightness = 1,
  seed = 11,
}) {
  const period = Math.max(2, Math.round(sampleRate / freq));
  const buffer = whiteNoise(period, seed);

  // Shape the excitation: a bright pluck keeps the noise, a soft one filters
  // it down toward a sine.
  if (brightness < 1) {
    biquad(buffer, sampleRate, 'lowpass', freq * (2 + brightness * 8), 0.7);
  }

  const out = new Float32Array(length);
  let index = 0;
  // The averaging coefficient IS the damping: 0.5 is the classic KS filter.
  const a = 0.5 + damping * 0.25;

  for (let i = 0; i < length; i++) {
    const current = buffer[index];
    const next = buffer[(index + 1) % period];
    const filtered = a * current + (1 - a) * next;
    // Slight overall loss so the string eventually stops.
    buffer[index] = filtered * 0.998;
    out[i] = current;
    index = (index + 1) % period;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Modal synthesis — bells, bars, metal
// ---------------------------------------------------------------------------

/**
 * A struck resonant object.
 *
 * The essential detail is that each partial decays at its OWN rate, with the
 * high ones dying first. Decaying them together is what makes synthetic metal
 * sound like a beep instead of a bell.
 *
 * @param modes [{ ratio, gain, decay }]
 */
function modal({ length, sampleRate, freq, modes, seed = 17 }) {
  const out = new Float32Array(length);

  for (const m of modes) {
    const hz = freq * m.ratio;
    if (hz > sampleRate / 2) continue; // above Nyquist — would alias
    const w = (TAU * hz) / sampleRate;
    for (let i = 0; i < length; i++) {
      const s = i / sampleRate;
      out[i] += Math.sin(w * i) * m.gain * Math.exp(-s * m.decay);
    }
  }

  // A short noise transient: the sound of the striker itself hitting. Real
  // struck objects always have one, and its absence reads as "computer".
  const strikeLen = Math.min(Math.round(sampleRate * 0.004), length);
  const strike = whiteNoise(strikeLen, seed);
  biquad(strike, sampleRate, 'highpass', freq * 2, 0.7);
  for (let i = 0; i < strikeLen; i++) {
    out[i] += strike[i] * 0.35 * (1 - i / strikeLen);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Space
// ---------------------------------------------------------------------------

/**
 * A small room, as a Schroeder reverb: parallel combs into series allpasses.
 *
 * Even a very short tail matters. A dry sound sits in a vacuum; a hint of
 * early reflection puts it somewhere, and "somewhere" is most of what makes a
 * recording sound real rather than generated.
 *
 * @param amount 0..1 wet mix. Keep it low — 0.12 is plenty for a game cue.
 */
function room(samples, sampleRate, { amount = 0.12, size = 0.5 } = {}) {
  if (amount <= 0) return samples;

  const combDelays = [1557, 1617, 1491, 1422].map((d) =>
    Math.max(1, Math.round((d * size * sampleRate) / 44100)),
  );
  const allpassDelays = [225, 556].map((d) =>
    Math.max(1, Math.round((d * sampleRate) / 44100)),
  );

  const wet = new Float32Array(samples.length);

  for (const delay of combDelays) {
    const buf = new Float32Array(delay);
    let idx = 0;
    const feedback = 0.76 * size;
    for (let i = 0; i < samples.length; i++) {
      const delayed = buf[idx];
      buf[idx] = samples[i] + delayed * feedback;
      wet[i] += delayed * 0.25;
      idx = (idx + 1) % delay;
    }
  }

  for (const delay of allpassDelays) {
    const buf = new Float32Array(delay);
    let idx = 0;
    const g = 0.5;
    for (let i = 0; i < wet.length; i++) {
      const delayed = buf[idx];
      const input = wet[i];
      buf[idx] = input + delayed * g;
      wet[i] = delayed - input * g;
      idx = (idx + 1) % delay;
    }
  }

  for (let i = 0; i < samples.length; i++) {
    samples[i] = samples[i] * (1 - amount * 0.5) + wet[i] * amount;
  }
  return samples;
}

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

/**
 * ADSR, in seconds, applied in place.
 *
 * The attack time is the most perceptually loaded number in any sound: under
 * ~5ms reads as struck or plucked, 20-60ms as blown, 100ms+ as bowed or swelled.
 */
function adsr(samples, sampleRate, { attack = 0.005, decay = 0.08, sustain = 0.7, release = 0.2 }) {
  const n = samples.length;
  const a = Math.round(attack * sampleRate);
  const d = Math.round(decay * sampleRate);
  const r = Math.round(release * sampleRate);
  const sustainEnd = Math.max(a + d, n - r);

  for (let i = 0; i < n; i++) {
    let env;
    if (i < a) env = a === 0 ? 1 : i / a;
    else if (i < a + d) env = 1 - (1 - sustain) * ((i - a) / Math.max(1, d));
    else if (i < sustainEnd) env = sustain;
    else env = sustain * (1 - (i - sustainEnd) / Math.max(1, n - sustainEnd));
    samples[i] *= env;
  }
  return samples;
}

/** Exponential decay from an instant attack. The percussive shape. */
function struck(samples, sampleRate, decayRate = 6) {
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= Math.exp((-i / sampleRate) * decayRate);
  }
  return samples;
}

/** Applies an arbitrary amplitude curve over normalized time. */
function shape(samples, fn) {
  const n = samples.length;
  for (let i = 0; i < n; i++) samples[i] *= fn(i / n);
  return samples;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/** Places buffers on a timeline. `events` is [{ at: ms, buffer }]. */
function mixAt(events, sampleRate, tailMs = 40) {
  const totalMs =
    Math.max(...events.map((e) => e.at + (e.buffer.length / sampleRate) * 1000)) + tailMs;
  const out = new Float32Array(Math.round((totalMs / 1000) * sampleRate));

  for (const { at, buffer, gain = 1 } of events) {
    const start = Math.round((at / 1000) * sampleRate);
    for (let i = 0; i < buffer.length; i++) {
      const j = start + i;
      if (j < out.length) out[j] += buffer[i] * gain;
    }
  }

  // No file may end on a discontinuity — that is an audible click.
  const fade = Math.min(Math.round(sampleRate * 0.01), out.length);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;

  return out;
}

/**
 * Removes DC offset.
 *
 * A waveform that is not centred on zero wastes headroom, can click on
 * playback, and pushes a speaker cone off its rest position. Feedback loops
 * are the usual culprit — Karplus-Strong in particular accumulates a bias,
 * and the violin measured at 0.126 before this existed.
 *
 * Applied to every generated file as a matter of course, not as a fix for one.
 */
function removeDC(samples, sampleRate) {
  // A very low high-pass leaves everything audible untouched.
  biquad(samples, sampleRate, 'highpass', 22, 0.707);
  // Then subtract any residual mean the filter did not catch.
  let mean = 0;
  for (const s of samples) mean += s;
  mean /= samples.length;
  if (Math.abs(mean) > 1e-6) {
    for (let i = 0; i < samples.length; i++) samples[i] -= mean;
  }
  return samples;
}

/** Scales to an exact peak. */
function normalize(samples, peak = 0.7) {
  let max = 0;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  if (max > 0) {
    const k = peak / max;
    for (let i = 0; i < samples.length; i++) samples[i] *= k;
  }
  return samples;
}

/** Soft clipper. Tames peaks without the harshness of hard clipping. */
function softClip(samples, drive = 1) {
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.tanh(samples[i] * drive) / Math.tanh(drive);
  }
  return samples;
}

/** 16-bit mono PCM WAV. */
function toWav(samples, sampleRate) {
  const bytes = samples.length * 2;
  const b = Buffer.alloc(44 + bytes);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + bytes, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sampleRate, 24);
  b.writeUInt32LE(sampleRate * 2, 28);
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

const buffer = (ms, sampleRate) => new Float32Array(Math.round((ms / 1000) * sampleRate));

module.exports = {
  TAU,
  noiseGen,
  whiteNoise,
  biquad,
  glottalSource,
  formantBank,
  movingFormants,
  pluckedString,
  modal,
  room,
  adsr,
  struck,
  shape,
  mixAt,
  normalize,
  removeDC,
  softClip,
  toWav,
  buffer,
};
