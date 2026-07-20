// components/puzzle/PuzzleFigure.tsx
// The country's landmark, and the parts it comes apart into.
//
// A piece is a PART OF THE PICTURE, cut along the drawing's own anatomy —
// a roof, a turret, a mountain peak. Its outline follows the subject, so it
// only fits its own place and a child can see that from the shape alone.
//
// THE BACKGROUND IS NEVER PART OF A PIECE. The board keeps the sky; a piece is
// the drawing and nothing else. That is what makes a piece read as a thing
// rather than as a tile.
//
// Everything is drawn in the primitive's own 100×100 space and cropped with a
// viewBox, so a part is exactly the region the data declares — no scaling
// arithmetic to get subtly wrong.

import React from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg';
import { PRIMITIVES, INK, type StaticPrimitiveKind } from '../scene/primitives';
import { isPuzzleSubject, partsFor, type FigurePart } from '../../constants/figureParts';
import type { CountryData, ScenePiece } from '../../constants/countries';

/**
 * The figure a country's puzzle shows: its biggest landmark that can be cut.
 *
 * Biggest, not first — the Matterhorn should be the picture for Switzerland,
 * not a chalet standing beside it.
 */
export function figureFor(country: CountryData): ScenePiece | undefined {
  const candidates = country.scene.filter((p) => {
    const kind = (p.kind === 'windmill' ? 'tower' : p.kind) as StaticPrimitiveKind;
    return isPuzzleSubject(kind, p.variant);
  });
  if (candidates.length === 0) return undefined;
  return [...candidates].sort((a, b) => (b.scale ?? 1) - (a.scale ?? 1))[0];
}

/** The primitive a scene piece is drawn with. */
export function kindOf(piece: ScenePiece): StaticPrimitiveKind {
  // The windmill has no static primitive; its tower reads fine as one.
  return (piece.kind === 'windmill' ? 'tower' : piece.kind) as StaticPrimitiveKind;
}

/** The parts a country's picture comes apart into. */
export function partsForCountry(country: CountryData): readonly FigurePart[] {
  const piece = figureFor(country);
  return piece ? partsFor(kindOf(piece), piece.variant) : [];
}

type Props = {
  country: CountryData;
  /** Rendered size of the WHOLE figure, in points. */
  size: number;
  /** Draw only this part, cropped to its own bounds. */
  part?: FigurePart;
  /** Draw as a faint guide rather than finished artwork. */
  ghost?: boolean;
  /** Outline the part's silhouette. On for a piece, off inside the board. */
  outlined?: boolean;
};

/** Faint enough to be a hint, strong enough to promise a picture. */
const GHOST_OPACITY = 0.17;

export function PuzzleFigure({
  country,
  size,
  part,
  ghost = false,
  outlined = false,
}: Props) {
  const scenePiece = figureFor(country);
  if (!scenePiece) return null;

  const Primitive = PRIMITIVES[kindOf(scenePiece)];
  if (!Primitive) return null;

  const { palette } = country;

  // THE GHOST FADES THE WHOLE DRAWING, not just its fills.
  //
  // Fading only the fills left every primitive's INK outline at full strength,
  // so the empty board still read as a finished picture — a child could not
  // see that anything was missing. Opacity on the group takes the strokes with
  // it, and the ghost keeps the real colours, which says more about what the
  // picture will be than a brown smudge did.
  const artwork = (
    <G opacity={ghost ? GHOST_OPACITY : 1}>
      <Primitive
        fill={scenePiece.fill ?? palette.structure}
        altFill={palette.structureAlt}
        accent={palette.accent}
        variant={scenePiece.variant}
      />
    </G>
  );

  // The whole picture. Transparent behind it — the board owns the background.
  if (!part) {
    return (
      <View style={{ width: size, height: size }} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {artwork}
        </Svg>
      </View>
    );
  }

  // One part. The viewBox crops to its bounds AND scales it, so the part is
  // exactly the region the data declares.
  const [bx, by, bw, bh] = part.box;
  const w = (bw / 100) * size;
  const h = (bh / 100) * size;
  const clipId = `part-${part.id}`;

  return (
    <View style={{ width: w, height: h }} pointerEvents="none">
      <Svg width={w} height={h} viewBox={`${bx} ${by} ${bw} ${bh}`}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={part.path} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clipId})`}>{artwork}</G>
        {outlined && (
          // The cut edge. Without it a piece dissolves into the artwork it
          // came from and stops reading as a separate object.
          <Path
            d={part.path}
            fill="none"
            stroke={INK}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        )}
      </Svg>
    </View>
  );
}

/** An empty socket: the part's silhouette, recessed into the board. */
export function PartSocket({
  part,
  size,
  fill = 'rgba(38, 25, 15, 0.20)',
}: {
  part: FigurePart;
  size: number;
  fill?: string;
}) {
  const [bx, by, bw, bh] = part.box;
  const w = (bw / 100) * size;
  const h = (bh / 100) * size;

  return (
    <Svg width={w} height={h} viewBox={`${bx} ${by} ${bw} ${bh}`}>
      <Path
        d={part.path}
        fill={fill}
        stroke={INK}
        strokeWidth={2.5}
        strokeLinejoin="round"
        // A DASHED edge says empty. Solid outlines at full strength made the
        // untouched board look like a finished drawing, so a child could not
        // see that anything was missing.
        strokeDasharray="7 5"
        strokeOpacity={0.5}
      />
    </Svg>
  );
}

export { INK };
export default PuzzleFigure;
