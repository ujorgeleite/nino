// components/ui/CountryTileBackdrop.tsx
// A tile-sized miniature of a country's actual scene.
//
// This is how a tile says WHERE without a flag or a name. A child cannot read
// "Switzerland", but two snow peaks over green meadow are the same picture
// they will see when the game opens — the tile is a promise of the place.
//
// IT IS THE REAL SCENE, NOT AN ICON. The pieces, their positions, their
// colours and the ground treatment all come from the country's own data
// (constants/countries/*.ts), just drawn small. That is what makes every tile
// different by construction: Germany and Austria both have a castle, but
// Germany pairs it with a snow peak and two forests while Austria pairs it
// with a dome — so the two silhouettes never collide.
//
// A single-landmark version of this file existed first and looked identical
// for any two countries sharing a landmark. Composition is what distinguishes
// a place, not one building.
//
// PERFORMANCE: capped at TILE_PIECES structures plus the ground. Twenty-two
// tiles sit on screen at once, so the cap is the budget — see the node count
// assertion in CountryTileBackdrop.test.tsx.

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { G, Rect } from 'react-native-svg';
import { PRIMITIVES, INK, type StaticPrimitiveKind } from '../scene/primitives';
import type { NinoMode } from '../../constants/nino';
import type { CountryData, ScenePiece } from '../../constants/countries';

const UNIT = 100;

/** How many structures a tile may draw. The performance budget lives here. */
export const TILE_PIECES = 3;

/** Pieces that stretch across the tile rather than standing on the horizon. */
const SPANNING: string[] = ['water', 'field', 'hill'];

/**
 * The structures a tile shows: the country's own scene, thinned to the budget.
 *
 * Biggest first, so a tile keeps whatever is most characteristic — the
 * Matterhorn survives, a small chalet does not. Then restored to left-to-right
 * order so the miniature matches the real skyline's arrangement.
 */
export function tilePieces(country: CountryData): ScenePiece[] {
  const structures = country.scene.filter(
    (p) => p.kind !== 'windmill' && !SPANNING.includes(p.kind),
  );

  return [...structures]
    .sort((a, b) => (b.scale ?? 1) - (a.scale ?? 1))
    .slice(0, TILE_PIECES)
    .sort((a, b) => a.x - b.x);
}

/** The country's ground treatment, if it has one (canal, field, hills). */
export function tileGround(country: CountryData): ScenePiece | undefined {
  return country.scene.find((p) => SPANNING.includes(p.kind));
}

type Props = {
  country: CountryData;
  size: number;
  mode?: NinoMode;
};

export function CountryTileBackdrop({ country, size, mode = 'there' }: Props) {
  const { palette } = country;
  const sky = mode === 'back' ? palette.skyBack : palette.skyThere;
  const horizon = size * 0.68;

  const pieces = useMemo(() => tilePieces(country), [country]);
  const ground = useMemo(() => tileGround(country), [country]);

  const GroundPrimitive = ground
    ? PRIMITIVES[ground.kind as StaticPrimitiveKind]
    : null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]}>
      <LinearGradient colors={[sky[0], sky[1]]} style={StyleSheet.absoluteFill} />

      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Ground fill under everything. */}
        <Rect x={0} y={horizon} width={size} height={size} fill={palette.ground} />

        {pieces.map((piece, i) => {
          const Primitive = PRIMITIVES[piece.kind as StaticPrimitiveKind];
          if (!Primitive) return null;

          // Structures are drawn smaller than in the real scene so several fit
          // side by side and the composition, not one shape, is what reads.
          const scale = ((piece.scale ?? 1) * size * 0.34) / UNIT;
          const x = piece.x * size - (UNIT * scale) / 2;

          return (
            <G
              key={`${piece.kind}-${i}`}
              x={x}
              y={horizon - UNIT * scale}
              scale={scale}
            >
              <Primitive
                fill={piece.fill ?? palette.structure}
                altFill={palette.structureAlt}
                accent={palette.accent}
                variant={piece.variant}
              />
            </G>
          );
        })}

        {/* The country's own ground band — a canal reads differently to a field. */}
        {GroundPrimitive && ground ? (
          <G
            x={0}
            y={horizon}
            scaleX={size / UNIT}
            scaleY={(size * 0.32) / UNIT}
          >
            <GroundPrimitive
              fill={
                ground.fill ??
                (ground.kind === 'water' ? palette.skyThere[0] : palette.ground)
              }
              altFill={palette.structureAlt}
              accent={palette.accent}
              variant={ground.variant}
            />
          </G>
        ) : (
          <Rect x={0} y={horizon} width={size} height={2.5} fill={INK} />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});

export default CountryTileBackdrop;
