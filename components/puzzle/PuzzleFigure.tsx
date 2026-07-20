// components/puzzle/PuzzleFigure.tsx
// The country's landmark, drawn once — and croppable.
//
// A puzzle piece is not a separate drawing. It is the SAME figure, rendered at
// full size inside a clipping window that is offset so only one cell shows.
// That is why the pieces line up perfectly when assembled: they are literally
// the same picture seen through different holes.
//
// The alternative — drawing each piece separately — would need the artwork cut
// eleven times by hand, which is the category of work this project has already
// established it cannot verify.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';
import { PRIMITIVES, INK, type StaticPrimitiveKind } from '../scene/primitives';
import type { CountryData, ScenePiece } from '../../constants/countries';

/** Local box every primitive draws into (primitives.tsx contract). */
const UNIT = 100;

/** Primitives that read as a landmark rather than as ground. */
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
  /**
   * Draw as an outline only — the target shape on the board, showing where the
   * picture will be without giving the answer away.
   */
  outline?: boolean;
  /** Crop window, in cell coordinates. Omit to draw the whole figure. */
  crop?: { row: number; col: number; rows: number; cols: number };
};

export function PuzzleFigure({ country, size, outline = false, crop }: Props) {
  const piece = figureFor(country);
  if (!piece) return null;

  // The windmill has no static primitive; its tower reads fine as one.
  const kind = (piece.kind === 'windmill' ? 'tower' : piece.kind) as StaticPrimitiveKind;
  const Primitive = PRIMITIVES[kind];
  if (!Primitive) return null;

  const { palette } = country;
  const scale = size / UNIT;

  const figure = (
    <Svg width={size} height={size}>
      {!outline && (
        // A soft plate behind the art, so a cropped piece reads as a piece
        // rather than as floating fragments of line.
        <Rect x={0} y={0} width={size} height={size} fill={palette.skyThere[1]} />
      )}
      <G scale={scale}>
        <Primitive
          fill={outline ? 'transparent' : (piece.fill ?? palette.structure)}
          altFill={outline ? 'transparent' : palette.structureAlt}
          accent={outline ? 'transparent' : palette.accent}
          variant={piece.variant}
        />
      </G>
    </Svg>
  );

  if (!crop) {
    return <View style={{ width: size, height: size }}>{figure}</View>;
  }

  // The crop: a window one cell wide, with the full figure pushed so that the
  // wanted cell lands inside it.
  const cellW = size / crop.cols;
  const cellH = size / crop.rows;

  return (
    <View style={[styles.window, { width: cellW, height: cellH }]}>
      <View style={{ marginLeft: -crop.col * cellW, marginTop: -crop.row * cellH }}>
        {figure}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden' },
});

/** The ink colour, re-exported so the board can draw matching guide lines. */
export { INK };

export default PuzzleFigure;
