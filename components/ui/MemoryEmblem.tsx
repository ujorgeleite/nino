// components/ui/MemoryEmblem.tsx
// The Memory tile's emblem: two little flip-cards showing the SAME item,
// which is what "find the pair" looks like — prompts/starting.md §5c.
//
// A single emoji would not communicate the mechanic; two matching cards do.
// The item comes from the country, so the tile says both "memory" and "which
// place" without a word of text.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADII, SHADOWS } from '../../constants/nino';

/** Face tint for the front card — a soft pink, per §5c. */
const PINK = '#F4B8C8';

type Props = {
  size?: number;
  /** The country's signature item — the same emoji on both cards. */
  emoji?: string;
};

export function MemoryEmblem({ size = 96, emoji = '🌷' }: Props) {
  const cardW = size * 0.58;
  const cardH = cardW * 1.32;

  return (
    <View style={[styles.wrap, { width: size, height: cardH * 1.08 }]}>
      <Card
        w={cardW}
        h={cardH}
        bg={COLORS.blue}
        rotate="-12deg"
        offset={-cardW * 0.34}
        emoji={emoji}
      />
      <Card
        w={cardW}
        h={cardH}
        bg={PINK}
        rotate="10deg"
        offset={cardW * 0.34}
        emoji={emoji}
      />
    </View>
  );
}

function Card({
  w,
  h,
  bg,
  rotate,
  offset,
  emoji,
}: {
  w: number;
  h: number;
  bg: string;
  rotate: string;
  offset: number;
  emoji: string;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          width: w,
          height: h,
          backgroundColor: bg,
          transform: [{ translateX: offset }, { rotate }],
        },
      ]}
    >
      <Text style={{ fontSize: w * 0.5 }} allowFontScaling={false}>
        {emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute',
    borderRadius: RADII.sm,
    borderWidth: 3,
    borderColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.chunkSm,
  },
});

export default MemoryEmblem;
