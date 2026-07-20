// components/ui/PuzzleEmblem.tsx
// The Puzzle tile's emblem: the country's landmark, half assembled.
//
// It shows the actual figure that game builds, with two cells still missing.
// A child sees both WHAT they will make and THAT it is made of pieces — which
// is the whole mechanic, said without a word.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import PuzzleFigure from '../puzzle/PuzzleFigure';
import { COLORS, RADII } from '../../constants/nino';
import type { CountryData } from '../../constants/countries';

const ROWS = 2;
const COLS = 3;

/** Which cells are shown as still missing. Two gaps read as "unfinished". */
const MISSING = new Set(['r0c2', 'r1c0']);

type Props = {
  size?: number;
  country: CountryData;
};

export function PuzzleEmblem({ size = 96, country }: Props) {
  const cellW = size / COLS;
  const cellH = size / ROWS;

  return (
    <View style={[styles.wrap, { width: size, height: size * (ROWS / COLS) }]}>
      {Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => {
          const id = `r${row}c${col}`;
          const missing = MISSING.has(id);
          return (
            <View
              key={id}
              style={[
                styles.cell,
                {
                  width: cellW,
                  height: cellH,
                  left: col * cellW,
                  top: row * cellH,
                },
                missing && styles.gap,
              ]}
            >
              {missing ? null : (
                <PuzzleFigure
                  country={country}
                  size={size}
                  crop={{ row, col, rows: ROWS, cols: COLS }}
                />
              )}
            </View>
          );
        }),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  cell: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.paper,
    borderRadius: RADII.sm / 3,
  },
  // An empty socket, so the tile reads as a puzzle in progress.
  gap: { backgroundColor: 'rgba(51, 36, 28, 0.22)' },
});

export default PuzzleEmblem;
