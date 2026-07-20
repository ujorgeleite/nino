// components/ui/PuzzleEmblem.tsx
// The Puzzle tile's emblem: the country's picture, half assembled.
//
// It shows the actual board that game presents — the drawing, with some parts
// in place and some still empty sockets. A child sees both WHAT they will make
// and THAT it comes apart, which is the whole mechanic said without a word.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import PuzzleFigure, { PartSocket, partsForCountry } from '../puzzle/PuzzleFigure';
import { COLORS, RADII } from '../../constants/nino';
import type { CountryData } from '../../constants/countries';

type Props = {
  size?: number;
  country: CountryData;
};

export function PuzzleEmblem({ size = 96, country }: Props) {
  const parts = partsForCountry(country);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* The country's sky, so the emblem reads as the place too. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: country.palette.skyThere[1] },
        ]}
      />

      {parts.map((part, i) => {
        const [bx, by, bw, bh] = part.box;
        const style = {
          position: 'absolute' as const,
          left: (bx / 100) * size,
          top: (by / 100) * size,
          width: (bw / 100) * size,
          height: (bh / 100) * size,
        };
        // The last part is left out, so the tile reads as unfinished.
        const missing = i === parts.length - 1;
        return (
          <View key={part.id} style={style}>
            {missing ? (
              <PartSocket part={part} size={size} />
            ) : (
              <PuzzleFigure country={country} size={size} part={part} />
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
    borderWidth: 2,
    borderColor: COLORS.ninoInk,
    overflow: 'hidden',
  },
});

export default PuzzleEmblem;
