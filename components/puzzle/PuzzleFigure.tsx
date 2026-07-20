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

/**
 * The floor of a carved socket: the piece's own colour, in shadow.
 *
 * Washing the colour over shadowed timber was tried first and came out muddy —
 * red read as brown, blue as grey — which destroys the one cue the child is
 * meant to use. Darkening the colour itself keeps the hue unmistakable while
 * still reading as the bottom of a hole rather than the surface of the board.
 */
function recessFloor(colour: string): string {
  const n = parseInt(colour.slice(1), 16);
  const shade = (c: number) => Math.round(c * 0.52);
  const [r, g, b] = [shade((n >> 16) & 255), shade((n >> 8) & 255), shade(n & 255)];
  return `rgb(${r}, ${g}, ${b})`;
}

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

  // A PART IS A FLAT COLOUR, not a crop of the artwork.
  //
  // Cropping the primitive meant every cut had to agree with geometry in
  // another file; when it did not, the child was handed an outline with
  // nothing inside it. A flat colour cannot disagree with anything, and it is
  // also the instruction: the child matches the red piece to the red hole
  // instead of judging whether one silhouette would fit inside another.
  if (part) {
    const [bx, by, bw, bh] = part.box;
    return (
      <View
        style={{ width: (bw / 100) * size, height: (bh / 100) * size }}
        pointerEvents="none"
      >
        <Svg
          width={(bw / 100) * size}
          height={(bh / 100) * size}
          viewBox={`${bx} ${by} ${bw} ${bh}`}
        >
          <Path
            d={part.path}
            fill={part.colour}
            stroke={INK}
            // The cut edge. Without it a piece dissolves into whatever is
            // behind it and stops reading as a separate object.
            strokeWidth={outlined ? 3 : 2}
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    );
  }

  // The whole picture, used only for the faint guide behind the sockets.
  // Opacity is applied to the GROUP so it takes the primitive's ink outlines
  // with it — fading only the fills left the empty board looking finished.
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <G opacity={ghost ? GHOST_OPACITY : 1}>
          <Primitive
            fill={scenePiece.fill ?? palette.structure}
            altFill={palette.structureAlt}
            accent={palette.accent}
            variant={scenePiece.variant}
          />
        </G>
      </Svg>
    </View>
  );
}

/**
 * An empty socket: the part's silhouette, tinted with THAT PART'S COLOUR.
 *
 * The tint is the whole instruction. A child sees a pale red hole and a solid
 * red piece and fills one with the other; nothing rests on comparing shapes,
 * which is a hard spatial judgement at two.
 */
export function PartSocket({
  part,
  size,
  fill,
}: {
  part: FigurePart;
  size: number;
  fill?: string;
}) {
  const [bx, by, bw, bh] = part.box;
  const w = (bw / 100) * size;
  const h = (bh / 100) * size;
  const clipId = `socket-${part.id}`;

  // CARVED, NOT DRAWN ON.
  //
  // A flat tinted silhouette read as decoration — a shape painted on the
  // board rather than a hole in it — so it was not obvious that anything was
  // meant to go inside. This builds a recess the way a wooden puzzle tray
  // has one: the outline is redrawn twice inside its own clip, offset down
  // and right for the shadowed wall the light does not reach, and up and
  // left for the lit rim on the far side. Two extra paths, no filters, and
  // the depth is unmistakable.
  return (
    <Svg width={w} height={h} viewBox={`${bx} ${by} ${bw} ${bh}`}>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={part.path} />
        </ClipPath>
      </Defs>

      {/* The floor of the recess. Opaque, because a hole shows its own bottom
          rather than whatever is behind the panel — a translucent tint over
          the board read as paint on the surface. */}
      <Path d={part.path} fill={fill ?? recessFloor(part.colour)} />

      <G clipPath={`url(#${clipId})`}>
        <Path
          d={part.path}
          transform="translate(2.2, 2.8)"
          fill="none"
          stroke="rgba(28, 18, 12, 0.42)"
          strokeWidth={5}
          strokeLinejoin="round"
        />
        <Path
          d={part.path}
          transform="translate(-2, -2.4)"
          fill="none"
          stroke="rgba(255, 255, 255, 0.34)"
          strokeWidth={4}
          strokeLinejoin="round"
        />
      </G>

      {/* The lip of the recess, crisp over both. */}
      <Path
        d={part.path}
        fill="none"
        stroke={INK}
        strokeWidth={2.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export { INK };
export default PuzzleFigure;
