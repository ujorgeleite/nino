// components/ui/PuzzleEmblem.tsx
// The Puzzle tile's emblem: the country's picture with two holes still open.
//
// It shows the actual board that game presents — the artwork, plus shaped
// sockets. A child sees both WHAT they will make and THAT pieces go into
// shapes, which is the whole mechanic said without a word.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import PuzzleFigure from '../puzzle/PuzzleFigure';
import { PUZZLE_SHAPES, shapePath } from '../../constants/puzzleShapes';
import { COLORS, RADII } from '../../constants/nino';
import type { CountryData } from '../../constants/countries';

/** Which holes read as still empty. Two gaps say "unfinished" without clutter. */
const OPEN = new Set(['circle', 'star']);

type Props = {
  size?: number;
  country: CountryData;
};

export function PuzzleEmblem({ size = 96, country }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <PuzzleFigure country={country} size={size} />

      {PUZZLE_SHAPES.map((shape) => {
        const s = shape.size * size;
        const left = shape.cx * size - s / 2;
        const top = shape.cy * size - s / 2;
        return (
          <View key={shape.id} style={[styles.hole, { width: s, height: s, left, top }]}>
            {OPEN.has(shape.id) ? (
              <Svg width={s} height={s}>
                <Path
                  d={shapePath(shape.id, s)}
                  fill="rgba(38, 25, 15, 0.55)"
                  stroke={COLORS.ninoInk}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
              </Svg>
            ) : (
              <PuzzleFigure country={country} size={size} shape={shape} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.sm,
    overflow: 'hidden',
  },
  hole: { position: 'absolute' },
});

export default PuzzleEmblem;
