// constants/depth.test.ts
// The depth system's contract: things must genuinely LOOK like they lift.
//
// These read like arithmetic, but each one is a visual claim. If the contact
// shadow does not fade, nothing reads as leaving the ground.

import {
  FLOAT,
  HALO,
  LIFT_HEIGHT,
  LIFT_SCALE,
  castShadow,
  contactShadow,
} from './depth';

describe('contact shadow', () => {
  it('is strongest when the object rests on the surface', () => {
    expect(contactShadow(0).shadowOpacity).toBeGreaterThan(
      contactShadow(1).shadowOpacity,
    );
  });

  it('fades substantially over the lift — this IS the lift cue', () => {
    const rest = contactShadow(0).shadowOpacity;
    const lifted = contactShadow(1).shadowOpacity;
    expect(lifted).toBeLessThan(rest * 0.4);
  });

  it('stays tight — a contact shadow that blurs is a cast shadow', () => {
    expect(contactShadow(0).shadowRadius).toBeLessThan(6);
    expect(contactShadow(1).shadowRadius).toBeLessThan(6);
  });

  it('clamps out-of-range elevation instead of producing nonsense', () => {
    expect(contactShadow(-3).shadowOpacity).toBe(contactShadow(0).shadowOpacity);
    expect(contactShadow(9).shadowOpacity).toBe(contactShadow(1).shadowOpacity);
  });
});

describe('cast shadow', () => {
  it('grows softer and larger as the object rises', () => {
    expect(castShadow(1).shadowRadius).toBeGreaterThan(castShadow(0).shadowRadius);
  });

  it('drifts further from the object as it rises', () => {
    // The light source does not move, so a higher object throws further.
    expect(castShadow(1).shadowOffset.height).toBeGreaterThan(
      castShadow(0).shadowOffset.height,
    );
    expect(castShadow(1).shadowOffset.width).toBeGreaterThan(
      castShadow(0).shadowOffset.width,
    );
  });

  it('deepens as the object rises', () => {
    expect(castShadow(1).shadowOpacity).toBeGreaterThan(castShadow(0).shadowOpacity);
  });

  it('moves opposite to the contact shadow', () => {
    // The two must diverge, or the object reads as a sticker with one blob.
    const contactDelta = contactShadow(1).shadowOpacity - contactShadow(0).shadowOpacity;
    const castDelta = castShadow(1).shadowOpacity - castShadow(0).shadowOpacity;
    expect(Math.sign(contactDelta)).toBe(-Math.sign(castDelta));
  });

  it('gives Android a matching elevation ramp', () => {
    // Android ignores shadow* entirely and uses elevation.
    expect(castShadow(1).elevation).toBeGreaterThan(castShadow(0).elevation);
  });
});

describe('lift and float amounts', () => {
  it('lifts far enough to notice', () => {
    expect(LIFT_HEIGHT).toBeGreaterThanOrEqual(8);
  });

  it('scales subtly — a big jump reads as a bug, not as depth', () => {
    expect(LIFT_SCALE).toBeGreaterThan(0.04);
    expect(LIFT_SCALE).toBeLessThan(0.2);
  });

  it('floats slowly enough to be calm (TODDLER_UX.md)', () => {
    expect(FLOAT.period).toBeGreaterThanOrEqual(2500);
  });

  it('floats a small distance — ambient, not attention-grabbing', () => {
    expect(FLOAT.amplitude).toBeLessThan(10);
  });
});

describe('drop halo', () => {
  it('is invisible until a drop is actually valid', () => {
    // A halo that is always on teaches nothing.
    expect(HALO.restingOpacity).toBe(0);
    expect(HALO.activeOpacity).toBeGreaterThan(0.5);
  });

  it('grows beyond the target so it reads as a glow, not a border', () => {
    expect(HALO.scale).toBeGreaterThan(1);
  });
});
