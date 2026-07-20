// components/cards/WoodCard.tsx
// Procedural wood rendered with Skia: a rounded plank with deterministic grain.
// Static Skia canvas only (no animated Skia values) per ANIMATION_GUIDELINES.md.
//
// ⚠️ NOT CURRENTLY USED. Preserved deliberately: this is the only procedural
// wood in the repo, and it is better than the flat gradient that
// components/shapefit/WoodBoard.tsx draws today. Migrating that board to this
// renderer is an open option.
//
// Grain is seeded from a caller-supplied `seed` (a Lehmer RNG), never
// Math.random — random-per-render would make the grain shimmer every frame.
//
// If the WoodBoard migration is ruled out, delete this file and constants/theme.ts.

import React, { useMemo } from 'react';
import {
  Canvas,
  RoundedRect,
  LinearGradient,
  Path,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { CARD, COLORS } from '../../constants/theme';

type Props = {
  width?: number;
  height?: number;
  /** stable seed derived from the card instance so grain is consistent per card */
  seed?: number;
};

// Deterministic pseudo-random from a seed (no Math.random → stable per card).
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const GRAIN_COLORS = ['#D4956A', '#C07840', '#A85C2A', '#B8703A', '#D4956A'];

export function WoodCard({ width = CARD.width, height = CARD.height, seed = 1 }: Props) {
  const grainPaths = useMemo(() => {
    const rand = seeded(seed);
    return Array.from({ length: 7 }, (_, i) => {
      const p = Skia.Path.Make();
      const y = (height / 7) * i + rand() * 8;
      p.moveTo(0, y);
      p.quadTo(width * 0.5, y + (rand() - 0.5) * 18, width, y + (rand() - 0.5) * 10);
      return { path: p, color: GRAIN_COLORS[i % GRAIN_COLORS.length] };
    });
  }, [width, height, seed]);

  return (
    <Canvas style={{ width, height }}>
      <RoundedRect x={0} y={0} width={width} height={height} r={CARD.radius}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[COLORS.woodLight, COLORS.woodMid, COLORS.woodDark]}
        />
      </RoundedRect>
      {grainPaths.map((g, i) => (
        <Path
          key={i}
          path={g.path}
          color={COLORS.woodGrainRgba}
          style="stroke"
          strokeWidth={2}
        />
      ))}
    </Canvas>
  );
}

export default WoodCard;
