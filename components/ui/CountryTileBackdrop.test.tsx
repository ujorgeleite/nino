// components/ui/CountryTileBackdrop.test.tsx
// Every tile must look like a different place.
//
// The bug this guards against shipped once: the backdrop drew ONE landmark, so
// Germany and Austria — both castles — produced identical tiles, and so did
// Switzerland and Norway, both mountains. A picker where tiles are
// indistinguishable is useless to a child navigating by picture alone.

import React from 'react';
import { render } from '@testing-library/react-native';
import CountryTileBackdrop, {
  TILE_PIECES,
  tileGround,
  tilePieces,
} from './CountryTileBackdrop';
import { COUNTRIES } from '../../constants/countries';
import { NODE_COST } from '../scene/primitives';

/**
 * A tile's visual identity: which shapes, where, in what colours, over which
 * sky and ground. Two countries producing the same signature would render the
 * same picture.
 */
function signature(country: (typeof COUNTRIES)[number]): string {
  const shapes = tilePieces(country)
    .map((p) => `${p.kind}:${p.variant ?? '-'}@${p.x.toFixed(2)}:${p.fill ?? 'default'}`)
    .join('|');
  const ground = tileGround(country);
  return [
    shapes,
    ground ? `${ground.kind}` : 'plain',
    country.palette.skyThere.join(','),
    country.palette.ground,
    country.palette.structure,
  ].join('//');
}

describe('CountryTileBackdrop', () => {
  it.each(COUNTRIES.map((c) => [c.code, c] as const))('%s renders', (code, country) => {
    const { UNSAFE_root } = render(<CountryTileBackdrop country={country} size={180} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it.each(COUNTRIES.map((c) => [c.code, c] as const))(
    '%s renders in Back mode too',
    (code, country) => {
      const { UNSAFE_root } = render(
        <CountryTileBackdrop country={country} size={180} mode="back" />,
      );
      expect(UNSAFE_root).toBeTruthy();
    },
  );

  it('draws at least one structure for every country', () => {
    // An empty tile would be a flat colour swatch — no sense of place at all.
    const empty = COUNTRIES.filter((c) => tilePieces(c).length === 0).map((c) => c.code);
    expect(empty).toEqual([]);
  });

  it('NO TWO COUNTRIES PRODUCE THE SAME TILE', () => {
    // The regression that shipped: one landmark meant castle countries were
    // interchangeable. Composition plus palette is what keeps them apart.
    const seen = new Map<string, string>();
    const collisions: string[] = [];

    for (const country of COUNTRIES) {
      const sig = signature(country);
      const other = seen.get(sig);
      if (other) collisions.push(`${other} and ${country.code}`);
      else seen.set(sig, country.code);
    }

    expect(collisions).toEqual([]);
  });

  it('keeps countries that share a landmark visually distinct', () => {
    // The specific pairs that collided before.
    const pairs: [string, string][] = [
      ['de', 'at'], // both castles
      ['ch', 'no'], // both mountains
      ['se', 'dk'], // both house-led
    ];

    for (const [a, b] of pairs) {
      const ca = COUNTRIES.find((c) => c.code === a)!;
      const cb = COUNTRIES.find((c) => c.code === b)!;
      // Jest's expect takes no message argument; the pair is named in the
      // compared values instead.
      expect(`${a}:${signature(ca)}`).not.toBe(`${a}:${signature(cb)}`);
    }
  });

  it('respects the per-tile piece budget', () => {
    for (const country of COUNTRIES) {
      expect(tilePieces(country).length).toBeLessThanOrEqual(TILE_PIECES);
    }
  });

  it('stays within the node budget for a full screen of tiles', () => {
    // PERFORMANCE: 22 tiles are on screen at once in the picker. This is the
    // number that decides whether that screen scrolls smoothly.
    const perTile = COUNTRIES.map((country) => {
      const structures = tilePieces(country).reduce(
        (sum, p) => sum + (NODE_COST[p.kind as keyof typeof NODE_COST] ?? 5),
        0,
      );
      const ground = tileGround(country);
      return structures + (ground ? NODE_COST[ground.kind as keyof typeof NODE_COST] : 1) + 1;
    });

    const worst = Math.max(...perTile);
    expect({ heaviestTileNodes: worst, budget: 24 }).toEqual({
      heaviestTileNodes: expect.any(Number),
      budget: 24,
    });
    expect(worst).toBeLessThanOrEqual(24);

    // Two tiles per country in the picker.
    const screenTotal = perTile.reduce((a, b) => a + b, 0) * 2;
    expect(screenTotal).toBeLessThanOrEqual(600);
  });

  it('keeps the biggest landmark when thinning to the budget', () => {
    // Switzerland's Matterhorn (scale 1.7) must survive; the small chalets
    // are the ones that go.
    const ch = COUNTRIES.find((c) => c.code === 'ch')!;
    const kept = tilePieces(ch);
    const biggest = [...ch.scene].sort((a, b) => (b.scale ?? 1) - (a.scale ?? 1))[0];
    expect(kept).toContainEqual(biggest);
  });

  it('draws the kept pieces left to right, as the real skyline does', () => {
    for (const country of COUNTRIES) {
      const xs = tilePieces(country).map((p) => p.x);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
    }
  });
});
