// components/cards/CardFront.tsx
// The face-UP side of a memory card: a light wooden tile showing the travel icon.
// Child-facing → icon only, never text (docs/TODDLER_UX.md).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CARD, COLORS } from '../../constants/theme';

type Props = {
  emoji: string;
  matched?: boolean;
  width?: number;
  height?: number;
};

export function CardFront({
  emoji,
  matched = false,
  width = CARD.width,
  height = CARD.height,
}: Props) {
  return (
    <View
      style={[
        styles.tile,
        { width, height, borderRadius: CARD.radius },
        matched && styles.matched,
      ]}
    >
      <Text style={styles.emoji} allowFontScaling={false}>
        {emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: COLORS.warmCream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.peach,
  },
  matched: {
    borderColor: COLORS.successGreen,
    backgroundColor: '#EAF7EA',
  },
  emoji: {
    fontSize: 44,
  },
});

export default CardFront;
