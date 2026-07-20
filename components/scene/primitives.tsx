// components/scene/primitives.tsx
// The scene vocabulary. A country picks from these; nobody draws a new one.
//
// CONTRACT: every primitive draws inside a 100×100 local box with its BASELINE
// AT y=100, so the renderer can place them all on one horizon with a single
// translate. They return SVG children, not <Svg> roots — the whole skyline is
// one <Svg>, because each additional Svg root is a separate native view and
// that is the expensive thing on device.
//
// Node counts are commented per primitive; the budget is enforced in
// constants/countries/countries.test.ts and primitives.test.ts.

import React from 'react';
import { Ellipse, G, Line, Path, Rect } from 'react-native-svg';

/** The universal outline. Every shape in this app carries it. */
export const INK = '#33241C';
const STROKE = 3.2;

export type PrimitiveProps = {
  fill: string;
  altFill: string;
  accent: string;
  variant?: string;
};

const outline = { stroke: INK, strokeWidth: STROKE, strokeLinejoin: 'round' as const };

// ---------------------------------------------------------------------------
// Structures
// ---------------------------------------------------------------------------

/** Tower — 6 nodes. Variants: lattice (Eiffel), spire, clock, leaning, plain. */
export function Tower({ fill, accent, variant = 'plain' }: PrimitiveProps) {
  if (variant === 'lattice') {
    return (
      <G>
        <Path d="M 22 100 L 40 26 L 60 26 L 78 100 Z" fill={fill} {...outline} />
        <Path d="M 40 26 L 50 6 L 60 26 Z" fill={fill} {...outline} />
        {/* Two cross-braces read as lattice without dozens of nodes. */}
        <Line x1={28} y1={78} x2={72} y2={78} stroke={INK} strokeWidth={STROKE} />
        <Line x1={34} y1={52} x2={66} y2={52} stroke={INK} strokeWidth={STROKE} />
        <Path d="M 34 52 L 66 78 M 66 52 L 34 78" stroke={INK} strokeWidth={2} fill="none" />
      </G>
    );
  }

  if (variant === 'leaning') {
    // The lean is the whole point — a straight one is just a tower.
    return (
      <G rotation={-6} origin="50, 100">
        <Rect x={36} y={18} width={28} height={82} rx={3} fill={fill} {...outline} />
        <Line x1={36} y1={44} x2={64} y2={44} stroke={INK} strokeWidth={2} />
        <Line x1={36} y1={66} x2={64} y2={66} stroke={INK} strokeWidth={2} />
        <Ellipse cx={50} cy={18} rx={16} ry={6} fill={accent} {...outline} />
      </G>
    );
  }

  const capped = variant === 'spire' || variant === 'clock';
  return (
    <G>
      <Rect x={36} y={variant === 'clock' ? 22 : 30} width={28} height={variant === 'clock' ? 78 : 70} fill={fill} {...outline} />
      {capped && <Path d="M 32 30 L 50 2 L 68 30 Z" fill={accent} {...outline} />}
      {variant === 'clock' && <Ellipse cx={50} cy={40} rx={10} ry={10} fill="#FFFFFF" {...outline} />}
      {variant === 'clock' && <Path d="M 50 40 L 50 34 M 50 40 L 55 43" stroke={INK} strokeWidth={2.4} fill="none" />}
    </G>
  );
}

/** Castle — 8 nodes. Variant: spired (fairy-tale) or plain (keep). */
export function Castle({ fill, altFill, accent, variant }: PrimitiveProps) {
  const spired = variant === 'spired';
  return (
    <G>
      <Rect x={22} y={46} width={56} height={54} fill={fill} {...outline} />
      {/* Two flanking turrets. */}
      <Rect x={10} y={34} width={20} height={66} fill={altFill} {...outline} />
      <Rect x={70} y={34} width={20} height={66} fill={altFill} {...outline} />
      {spired ? (
        <>
          <Path d="M 8 34 L 20 8 L 32 34 Z" fill={accent} {...outline} />
          <Path d="M 68 34 L 80 8 L 92 34 Z" fill={accent} {...outline} />
          <Path d="M 20 46 L 50 18 L 80 46 Z" fill={accent} {...outline} />
        </>
      ) : (
        // Crenellations: one path, not one rect per merlon.
        <Path
          d="M 22 46 L 22 38 L 32 38 L 32 46 L 42 46 L 42 38 L 52 38 L 52 46 L 62 46 L 62 38 L 72 38 L 72 46 Z"
          fill={fill}
          {...outline}
        />
      )}
      <Rect x={44} y={72} width={12} height={28} rx={6} fill={INK} />
    </G>
  );
}

/** Dome — 4 nodes. Rotunda / basilica. */
export function Dome({ fill, accent }: PrimitiveProps) {
  return (
    <G>
      <Rect x={24} y={58} width={52} height={42} fill={fill} {...outline} />
      <Path d="M 24 58 A 26 26 0 0 1 76 58 Z" fill={accent} {...outline} />
      <Line x1={50} y1={30} x2={50} y2={18} stroke={INK} strokeWidth={STROKE} />
      <Rect x={44} y={78} width={12} height={22} rx={6} fill={INK} />
    </G>
  );
}

/** Arch — 3 nodes. Triumphal arch or city gate. */
export function Arch({ fill, accent }: PrimitiveProps) {
  return (
    <G>
      <Rect x={18} y={30} width={64} height={70} fill={fill} {...outline} />
      <Path d="M 36 100 L 36 60 A 14 14 0 0 1 64 60 L 64 100 Z" fill={INK} />
      <Rect x={14} y={22} width={72} height={10} fill={accent} {...outline} />
    </G>
  );
}

/** Columns — 6 nodes. Amphitheatre / classical facade. */
export function Columns({ fill, accent }: PrimitiveProps) {
  return (
    <G>
      <Rect x={14} y={34} width={72} height={66} fill={fill} {...outline} />
      {/* Arcade drawn as one repeated path — cheaper than 4 separate shapes. */}
      <Path
        d="M 24 100 L 24 56 A 8 8 0 0 1 40 56 L 40 100 M 46 100 L 46 56 A 8 8 0 0 1 62 56 L 62 100 M 68 100 L 68 56 A 8 8 0 0 1 84 56 L 84 100"
        fill={INK}
        opacity={0.55}
      />
      <Rect x={10} y={26} width={80} height={10} fill={accent} {...outline} />
      <Line x1={14} y1={68} x2={86} y2={68} stroke={INK} strokeWidth={2.4} />
    </G>
  );
}

/** House — 4 nodes. Variants: stepped, pointed, flat. */
export function House({ fill, accent, variant = 'pointed' }: PrimitiveProps) {
  const gable =
    variant === 'stepped'
      ? 'M 16 44 L 16 34 L 30 34 L 30 24 L 44 24 L 44 14 L 56 14 L 56 24 L 70 24 L 70 34 L 84 34 L 84 44 Z'
      : variant === 'flat'
        ? 'M 14 44 L 14 36 L 86 36 L 86 44 Z'
        : 'M 16 44 L 50 12 L 84 44 Z';

  return (
    <G>
      <Rect x={18} y={44} width={64} height={56} fill={fill} {...outline} />
      <Path d={gable} fill={fill} {...outline} />
      {/* Windows as one path: 4 panes, 1 node. */}
      <Path
        d="M 28 56 h 16 v 14 h -16 Z M 56 56 h 16 v 14 h -16 Z M 28 78 h 16 v 14 h -16 Z M 56 78 h 16 v 14 h -16 Z"
        fill={accent}
        stroke={INK}
        strokeWidth={2.4}
      />
    </G>
  );
}

/** Bridge — 4 nodes. */
export function Bridge({ fill }: PrimitiveProps) {
  return (
    <G>
      <Path d="M 4 76 Q 50 36 96 76" fill="none" stroke={INK} strokeWidth={STROKE + 3} />
      <Path d="M 4 76 Q 50 42 96 76 L 96 84 Q 50 50 4 84 Z" fill={fill} {...outline} />
      <Line x1={26} y1={64} x2={26} y2={100} stroke={INK} strokeWidth={STROKE} />
      <Line x1={74} y1={64} x2={74} y2={100} stroke={INK} strokeWidth={STROKE} />
    </G>
  );
}

// ---------------------------------------------------------------------------
// Land
// ---------------------------------------------------------------------------

/** Mountain — 3 nodes. Variant: snow adds a cap. */
export function Mountain({ fill, variant }: PrimitiveProps) {
  return (
    <G>
      <Path d="M 2 100 L 50 8 L 98 100 Z" fill={fill} {...outline} />
      {variant === 'snow' && (
        <Path d="M 34 36 L 50 8 L 66 36 L 58 32 L 50 38 L 42 32 Z" fill="#F2F6F9" {...outline} />
      )}
    </G>
  );
}

/** Hill — 1 node. */
export function Hill({ fill }: PrimitiveProps) {
  return <Ellipse cx={50} cy={124} rx={78} ry={44} fill={fill} {...outline} />;
}

/** Forest — 3 nodes. Variants: conifer (default), cypress. */
export function Forest({ fill, variant }: PrimitiveProps) {
  if (variant === 'cypress') {
    return (
      <G>
        <Path d="M 26 100 Q 18 52 26 26 Q 34 52 26 100 Z" fill={fill} {...outline} />
        <Path d="M 50 100 Q 41 44 50 14 Q 59 44 50 100 Z" fill={fill} {...outline} />
        <Path d="M 74 100 Q 66 56 74 32 Q 82 56 74 100 Z" fill={fill} {...outline} />
      </G>
    );
  }
  // Three conifers, each a single triangle-stack path.
  return (
    <G>
      <Path d="M 22 100 L 8 62 L 16 62 L 22 40 L 28 62 L 36 62 Z" fill={fill} {...outline} />
      <Path d="M 52 100 L 34 52 L 44 52 L 52 22 L 60 52 L 70 52 Z" fill={fill} {...outline} />
      <Path d="M 80 100 L 66 64 L 74 64 L 80 44 L 86 64 L 94 64 Z" fill={fill} {...outline} />
    </G>
  );
}

/** Field — 2 nodes. Striped farmland. */
export function Field({ fill, altFill }: PrimitiveProps) {
  return (
    <G>
      <Rect x={0} y={70} width={100} height={30} fill={fill} />
      <Path
        d="M 0 78 h 100 M 0 86 h 100 M 0 94 h 100"
        stroke={altFill}
        strokeWidth={4}
        fill="none"
      />
    </G>
  );
}

/** Water — 3 nodes. A calm band with a couple of still ripples. */
export function Water({ fill, accent }: PrimitiveProps) {
  return (
    <G>
      <Rect x={0} y={64} width={100} height={36} fill={fill} />
      <Rect x={0} y={64} width={100} height={3} fill={INK} />
      <Path
        d="M 12 76 q 8 -4 16 0 M 46 84 q 8 -4 16 0 M 74 74 q 8 -4 16 0"
        stroke={accent}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        opacity={0.75}
      />
    </G>
  );
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Windmill is deliberately ABSENT here: its sails rotate, so it cannot live in
 * the memoized static skyline. SceneRenderer draws it as a separate animated
 * layer. See MAX one windmill per country in the data tests.
 */
export const PRIMITIVES = {
  tower: Tower,
  castle: Castle,
  dome: Dome,
  arch: Arch,
  columns: Columns,
  house: House,
  bridge: Bridge,
  mountain: Mountain,
  hill: Hill,
  forest: Forest,
  field: Field,
  water: Water,
} as const;

export type StaticPrimitiveKind = keyof typeof PRIMITIVES;

/** Approximate SVG node cost, used by the performance budget test. */
export const NODE_COST: Record<StaticPrimitiveKind | 'windmill', number> = {
  tower: 6,
  castle: 8,
  dome: 4,
  arch: 3,
  columns: 6,
  house: 4,
  bridge: 4,
  mountain: 3,
  hill: 1,
  forest: 3,
  field: 2,
  water: 3,
  windmill: 9,
};
