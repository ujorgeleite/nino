// components/memory/MemoryBoard.test.ts
// The mode behaviour contract, in code: There scatters, Back aligns.
// See docs/DESIGN_SYSTEM.md — "The modes are a behaviour contract".

import { scatterFor } from './MemoryBoard';

const CARD_W = 120;

describe('scatterFor', () => {
  it('aligns perfectly in Back mode — no drift, no tilt', () => {
    // Back mode is the calm one. Any offset here breaks the contract.
    for (const id of ['tulip-0', 'cheese-1', 'cow-0', 'boat-1']) {
      expect(scatterFor(id, 'back', CARD_W)).toEqual({ dx: 0, dy: 0, tilt: 0 });
    }
  });

  it('scatters in There mode', () => {
    const offsets = ['tulip-0', 'cheese-1', 'cow-0', 'boat-1', 'bicycle-0'].map((id) =>
      scatterFor(id, 'there', CARD_W),
    );
    // At least some cards must actually move, or "scattered" is a lie.
    expect(offsets.some((o) => Math.abs(o.dx) > 1 || Math.abs(o.dy) > 1)).toBe(true);
  });

  it('is deterministic — the same card never moves between renders', () => {
    // This is the property that keeps the board from twitching on every tap.
    const a = scatterFor('tulip-0', 'there', CARD_W);
    const b = scatterFor('tulip-0', 'there', CARD_W);
    expect(a).toEqual(b);
  });

  it('gives different cards different offsets', () => {
    const a = scatterFor('tulip-0', 'there', CARD_W);
    const b = scatterFor('tulip-1', 'there', CARD_W);
    expect(a).not.toEqual(b);
  });

  it('keeps drift within bounds so cards cannot clip off screen', () => {
    const ids = Array.from({ length: 60 }, (_, i) => `item-${i}`);
    for (const id of ids) {
      const { dx, dy, tilt } = scatterFor(id, 'there', CARD_W);
      // Bounds match SCATTER_X / SCATTER_Y / SCATTER_TILT.
      expect(Math.abs(dx)).toBeLessThanOrEqual(CARD_W * 0.16);
      expect(Math.abs(dy)).toBeLessThanOrEqual(CARD_W * 0.13);
      expect(Math.abs(tilt)).toBeLessThanOrEqual(7);
    }
  });

  it('scales the drift with card size', () => {
    const small = scatterFor('tulip-0', 'there', 90);
    const large = scatterFor('tulip-0', 'there', 180);
    // Same card, bigger board: proportionally bigger drift, same direction.
    expect(Math.abs(large.dx)).toBeGreaterThan(Math.abs(small.dx));
    expect(Math.sign(large.dx)).toBe(Math.sign(small.dx));
  });

  it('drifts in both directions, not just one', () => {
    const dxs = Array.from({ length: 40 }, (_, i) => scatterFor(`c-${i}`, 'there', CARD_W).dx);
    expect(dxs.some((d) => d > 0)).toBe(true);
    expect(dxs.some((d) => d < 0)).toBe(true);
  });
});
