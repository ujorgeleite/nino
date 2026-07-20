// components/scene/primitives.test.tsx
// Every primitive, in every variant a country actually asks for, must render.
//
// A crash here would take down a whole country's screen, so this sweeps the
// real data rather than a hand-written list.

import React from 'react';
import { render } from '@testing-library/react-native';
import Svg from 'react-native-svg';
import { PRIMITIVES, NODE_COST, type StaticPrimitiveKind } from './primitives';
import { COUNTRIES } from '../../constants/countries';

const PROPS = {
  fill: '#C1876B',
  altFill: '#8E6B52',
  accent: '#F2C14E',
};

const KINDS = Object.keys(PRIMITIVES) as StaticPrimitiveKind[];

/** Every (kind, variant) pair any country asks for. */
const USED: [StaticPrimitiveKind, string | undefined][] = [];
for (const country of COUNTRIES) {
  for (const piece of country.scene) {
    if (piece.kind === 'windmill') continue;
    const key: [StaticPrimitiveKind, string | undefined] = [
      piece.kind as StaticPrimitiveKind,
      piece.variant,
    ];
    if (!USED.some(([k, v]) => k === key[0] && v === key[1])) USED.push(key);
  }
}

describe('scene primitives', () => {
  it.each(KINDS)('%s renders with default props', (kind) => {
    const Primitive = PRIMITIVES[kind];
    const { UNSAFE_root } = render(
      <Svg>
        <Primitive {...PROPS} />
      </Svg>,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it.each(USED)('%s / variant %s renders (used by a real country)', (kind, variant) => {
    const Primitive = PRIMITIVES[kind];
    const { UNSAFE_root } = render(
      <Svg>
        <Primitive {...PROPS} variant={variant} />
      </Svg>,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('has a node cost recorded for every primitive', () => {
    // The performance budget below depends on this table being complete.
    for (const kind of KINDS) {
      expect(NODE_COST[kind]).toBeGreaterThan(0);
    }
    expect(NODE_COST.windmill).toBeGreaterThan(0);
  });

  it('every kind a country asks for actually exists', () => {
    // Catches a typo in country data before it renders as a blank scene.
    for (const country of COUNTRIES) {
      for (const piece of country.scene) {
        if (piece.kind === 'windmill') continue;
        expect(PRIMITIVES[piece.kind as StaticPrimitiveKind]).toBeDefined();
      }
    }
  });
});

describe('scene node budget (performance)', () => {
  /**
   * SVG node count is the main driver of scene cost on device. This turns the
   * piece budget in the data into a concrete node estimate per country.
   */
  const MAX_NODES = 90;

  it.each(COUNTRIES.map((c) => [c.code, c] as const))(
    '%s stays under the node budget',
    (code, country) => {
      const nodes = country.scene.reduce(
        (sum, p) => sum + (NODE_COST[p.kind as keyof typeof NODE_COST] ?? 5),
        0,
      );
      expect(nodes).toBeLessThanOrEqual(MAX_NODES);
    },
  );

  it('reports the heaviest country for visibility', () => {
    const costs = COUNTRIES.map((c) => ({
      code: c.code,
      nodes: c.scene.reduce(
        (sum, p) => sum + (NODE_COST[p.kind as keyof typeof NODE_COST] ?? 5),
        0,
      ),
    })).sort((a, b) => b.nodes - a.nodes);

    // Not an assertion about a specific country — just keeps the number in the
    // test output so a regression is visible in CI logs.
    expect(costs[0].nodes).toBeLessThanOrEqual(MAX_NODES);
    expect(costs.length).toBe(COUNTRIES.length);
  });
});
