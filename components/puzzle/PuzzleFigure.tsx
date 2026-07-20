// components/puzzle/PuzzleFigure.tsx
// The country's landmark, drawn once — and clippable to a shape.
//
// A puzzle piece is not a separate drawing. It is the SAME figure, clipped to
// the shape of the hole it belongs in and offset so the right part shows.
// That is why a piece always matches its hole exactly: they are generated from
// one path (`shapePath`), so the promise "this shape fits here" cannot drift.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { PRIMITIVES, INK, type StaticPrimitiveKind } from '../scene/primitives';
import { shapePath, type PuzzleShape } from '../../constants/puzzleShapes';
import type { CountryData, ScenePiece } from '../../constants/countries';

/** Local box every primitive draws into (primitives.tsx contract). */
const UNIT = 100;

const LANDMARKS: StaticPrimitiveKind[] = [
  'tower',
  'castle',
  'dome',
  'columns',
  'arch',
  'mountain',
  'bridge',
  'house',
  'forest',
];

/**
 * The figure a country's puzzle shows: its biggest landmark.
 *
 * Biggest, not first — the Matterhorn should be the picture for Switzerland,
 * not a chalet standing beside it.
 */
export function figureFor(country: CountryData): ScenePiece | undefined {
  const candidates = country.scene.filter(
    (p) => p.kind === 'windmill' || LANDMARKS.includes(p.kind as StaticPrimitiveKind),
  );
  if (candidates.length === 0) return undefined;
  return [...candidates].sort((a, b) => (b.scale ?? 1) - (a.scale ?? 1))[0];
}

type Props = {
  country: CountryData;
  /** Rendered size of the WHOLE figure. */
  size: number;
  /** Draw the artwork faintly, as the board's ghost. */
  ghost?: boolean;
  /**
   * Clip to one shape's silhouette and crop to it.
   *
   * The result is exactly the piece that fills that hole.
   */
  shape?: PuzzleShape;
};

export function PuzzleFigure({ country, size, ghost = false, shape }: Props) {
  const piece = figureFor(country);
  if (!piece) return null;

  // The windmill has no static primitive; its tower reads fine as one.
  const kind = (piece.kind === 'windmill' ? 'tower' : piece.kind) as StaticPrimitiveKind;
  const Primitive = PRIMITIVES[kind];
  if (!Primitive) return null;

  const { palette } = country;
  const scale = size / UNIT;

  const artwork = (
    <>
      <Rect x={0} y={0} width={size} height={size} fill={palette.skyThere[1]} />
      <G scale={scale}>
        <Primitive
          fill={piece.fill ?? palette.structure}
          altFill={palette.structureAlt}
          accent={palette.accent}
          variant={piece.variant}
        />
      </G>
    </>
  );

  // The whole picture, for the board's background.
  if (!shape) {
    return (
      <View style={{ width: size, height: size, opacity: ghost ? 0.9 : 1 }}>
        <Svg width={size} height={size}>{artwork}</Svg>
      </View>
    );
  }

  // One shape, clipped out of the picture and cropped to its own bounds.
  const shapeSize = shape.size * size;
  const left = shape.cx * size - shapeSize / 2;
  const top = shape.cy * size - shapeSize / 2;
  const clipId = `clip-${shape.id}`;

  return (
    <View style={[styles.window, { width: shapeSize, height: shapeSize }]}>
      <Svg width={shapeSize} height={shapeSize}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={shapePath(shape.id, shapeSize)} />
          </ClipPath>
        </Defs>
        {/* The artwork is shifted so the shape's region lands in the window. */}
        <G clipPath={`url(#${clipId})`} x={-left} y={-top}>
          {artwork}
        </G>
        {/* The outline, so the silhouette reads even against busy artwork. */}
        <Path
          d={shapePath(shape.id, shapeSize)}
          fill="none"
          stroke={INK}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden' },
});

export { INK };

export default PuzzleFigure;
