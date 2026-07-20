// components/ui/Glyph.tsx
// The small UI glyphs (back, home, restart, mute, play, lock) as simple stroked
// SVGs at the outline weight — prompts/starting.md §8.
//
// These are grown-up affordances (HUD chrome), NOT child-facing content. The
// child's iconography is emoji, which is deliberate (§8: "Emoji are intentional
// brand iconography for pre-readers").

import React from 'react';
import Svg, { Line, Path, Polygon, Rect } from 'react-native-svg';
import { COLORS } from '../../constants/nino';

export type GlyphName =
  | 'home'
  | 'back'
  | 'restart'
  | 'sound'
  | 'muted'
  | 'play'
  | 'lock'
  | 'close';

type Props = {
  name: GlyphName;
  size?: number;
  color?: string;
  /** Stroke weight. Matches the mascot art's 4.5 at a 100-unit viewBox. */
  weight?: number;
};

export function Glyph({
  name,
  size = 28,
  color = COLORS.ninoInk,
  weight = 7,
}: Props) {
  const stroke = {
    stroke: color,
    strokeWidth: weight,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {name === 'home' && (
        <>
          <Path d="M 18 48 L 50 20 L 82 48" {...stroke} />
          <Path d="M 28 44 L 28 80 L 72 80 L 72 44" {...stroke} />
          <Path d="M 42 80 L 42 60 L 58 60 L 58 80" {...stroke} />
        </>
      )}

      {name === 'back' && <Path d="M 62 22 L 34 50 L 62 78" {...stroke} />}

      {name === 'restart' && (
        <>
          {/* Open arc — the gap is where the arrowhead sits. */}
          <Path d="M 78 50 A 28 28 0 1 1 62 24" {...stroke} />
          <Path d="M 62 24 L 62 42 M 62 24 L 46 28" {...stroke} />
        </>
      )}

      {name === 'sound' && (
        <>
          <Path d="M 26 40 L 40 40 L 56 26 L 56 74 L 40 60 L 26 60 Z" {...stroke} />
          <Path d="M 66 38 A 18 18 0 0 1 66 62" {...stroke} />
        </>
      )}

      {name === 'muted' && (
        <>
          <Path d="M 26 40 L 40 40 L 56 26 L 56 74 L 40 60 L 26 60 Z" {...stroke} />
          <Line x1={66} y1={38} x2={84} y2={62} {...stroke} />
          <Line x1={84} y1={38} x2={66} y2={62} {...stroke} />
        </>
      )}

      {name === 'play' && (
        <Polygon points="34,24 34,76 80,50" fill={color} stroke={color} strokeWidth={weight} strokeLinejoin="round" />
      )}

      {name === 'lock' && (
        <>
          <Rect x={26} y={46} width={48} height={36} rx={8} {...stroke} />
          <Path d="M 36 46 L 36 34 A 14 14 0 0 1 64 34 L 64 46" {...stroke} />
        </>
      )}

      {name === 'close' && (
        <>
          <Line x1={30} y1={30} x2={70} y2={70} {...stroke} />
          <Line x1={70} y1={30} x2={30} y2={70} {...stroke} />
        </>
      )}
    </Svg>
  );
}

export default Glyph;
