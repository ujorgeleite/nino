// components/ui/ShapeFitEmblem.tsx
// The Shape Fit emblem: a shaped hole, and the piece that fits it hovering
// just above, tilted, about to drop in.
//
// THE IDEA: the hole and the piece are the SAME PATH — one hollow, one solid.
// That identity is what reads as "it fits". An earlier version drew a plain
// square socket and a rounded tile, which only said "two objects".
//
// The tab on top makes the shape unmistakably a puzzle piece rather than a
// box, and gives the eye an obvious alignment cue between the two.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { COLORS } from '../../constants/nino';

/** Board tone — the wood the real game draws. */
const WOOD = '#B07F4F';
const WOOD_DARK = '#7A4E27';

/**
 * A puzzle piece: rounded body with a tab on top. Drawn in a 100×100 box so
 * the hole and the piece can share it exactly.
 */
const PIECE_PATH =
  'M 18 44 L 36 44 Q 36 22 50 22 Q 64 22 64 44 L 82 44 L 82 84 Q 82 90 76 90 L 24 90 Q 18 90 18 84 Z';

type Props = {
  size?: number;
  /** The country's signature item, riding on the piece. */
  emoji?: string;
  tint?: string;
};

export function ShapeFitEmblem({ size = 96, emoji = '🧩', tint = '#F8E3C2' }: Props) {
  const boardH = size * 0.72;
  const piece = size * 0.6;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* The board with the hole sunk into it. */}
      <View style={styles.board}>
        <Svg width={size} height={boardH} viewBox="0 0 100 72">
          <Rect
            x={3}
            y={10}
            width={94}
            height={58}
            rx={9}
            fill={WOOD}
            stroke={COLORS.ninoInk}
            strokeWidth={4}
          />
          {/* The hole: the piece path, dark, scaled down into the board. */}
          <G x={17} y={4} scale={0.66}>
            <Path
              d={PIECE_PATH}
              fill={WOOD_DARK}
              stroke={COLORS.ninoInk}
              strokeWidth={5}
              strokeLinejoin="round"
            />
          </G>
        </Svg>
      </View>

      {/* The same shape, solid, tilted, in flight above the hole. */}
      <View style={[styles.piece, { width: piece, height: piece }]}>
        <Svg width={piece} height={piece} viewBox="0 0 100 100">
          <Path
            d={PIECE_PATH}
            fill={tint}
            stroke={COLORS.ninoInk}
            strokeWidth={5}
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={[styles.emoji, { fontSize: piece * 0.3 }]} allowFontScaling={false}>
          {emoji}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'flex-end' },
  board: { position: 'absolute', bottom: 0 },
  piece: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // The tilt says "in flight", not "already placed".
    transform: [{ rotate: '-10deg' }],
  },
  emoji: { position: 'absolute', top: '40%' },
});

export default ShapeFitEmblem;
