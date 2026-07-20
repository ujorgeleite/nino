// components/memory/MemoryCardView.test.ts
// Regression test for a shipped bug: the card rendered completely blank.
//
// Cause: opacity crossfade AND backfaceVisibility were both applied, so face
// down BOTH faces were hidden — the front by opacity 0, the back by facing
// away. Each mechanism is correct alone; together they cancel the card out.
//
// The invariant that broke: at every point in the flip, exactly one face is
// visible. Never zero.

import { faceOpacity, faceRotation, facesViewer } from './MemoryCardView';

describe('faceOpacity', () => {
  it('shows the back when the card is face down', () => {
    expect(faceOpacity(0)).toEqual({ front: 0, back: 1 });
  });

  it('shows the front when the card is face up', () => {
    expect(faceOpacity(1)).toEqual({ front: 1, back: 0 });
  });

  it('never leaves the card blank at any point in the flip', () => {
    // The actual bug: both faces at 0. Sweep the whole animation.
    for (let i = 0; i <= 100; i++) {
      const progress = i / 100;
      const { front, back } = faceOpacity(progress);
      expect(front + back).toBe(1);
    }
  });

  it('never shows both faces at once', () => {
    for (let i = 0; i <= 100; i++) {
      const { front, back } = faceOpacity(i / 100);
      expect(Math.min(front, back)).toBe(0);
    }
  });

  it('swaps at the halfway point', () => {
    expect(faceOpacity(0.49).back).toBe(1);
    expect(faceOpacity(0.5).front).toBe(1);
  });
});

// A second, distinct bug shipped here: the two faces had their rotations
// swapped, so whichever face was visible was the one turned AWAY from the
// viewer — the card looked mirrored or blank at both ends of the flip.
describe('faceRotation', () => {
  it('points the back at the viewer when the card is face down', () => {
    const { back } = faceRotation(0);
    expect(facesViewer(back)).toBe(true);
  });

  it('points the front at the viewer when the card is face up', () => {
    const { front } = faceRotation(1);
    expect(facesViewer(front)).toBe(true);
  });

  it('turns the hidden face away at both ends', () => {
    expect(facesViewer(faceRotation(0).front)).toBe(false);
    expect(facesViewer(faceRotation(1).back)).toBe(false);
  });

  it('THE INVARIANT: the visible face always faces the viewer', () => {
    // The assertion that would have caught the bug. Sweep the flip and check
    // that whichever face opacity picks is also the one facing forward.
    //
    // progress exactly 0.5 is excluded deliberately: there the card is edge-on
    // (rotation 90°/270°, zero apparent width) so NO face is readable, and the
    // question is meaningless rather than wrong. Every other point must hold.
    for (let i = 0; i <= 100; i++) {
      const progress = i / 100;
      if (progress === 0.5) continue;

      const opacity = faceOpacity(progress);
      const rotation = faceRotation(progress);
      const visible = opacity.front === 1 ? rotation.front : rotation.back;
      expect(facesViewer(visible)).toBe(true);
    }
  });

  it('is edge-on exactly at the midpoint', () => {
    // Pins the one excluded point, so the exclusion above stays honest.
    const { front, back } = faceRotation(0.5);
    expect(front % 360).toBe(270);
    expect(back % 360).toBe(90);
  });
});
