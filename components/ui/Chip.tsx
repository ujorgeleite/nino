// components/ui/Chip.tsx
// A small promise chip for the Parent panel — prompts/starting.md §5d.
// Parent-facing only; a child never sees this screen.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADII, SPACING, TYPE } from '../../constants/nino';

type Props = {
  emoji: string;
  label: string;
};

export function Chip({ emoji, label }: Props) {
  return (
    <View style={styles.chip}>
      <Text style={styles.emoji} allowFontScaling={false}>
        {emoji}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s2,
    backgroundColor: COLORS.blue100,
    borderRadius: RADII.pill,
    borderWidth: 2,
    borderColor: COLORS.borderSoft,
    paddingHorizontal: SPACING.s3,
    paddingVertical: SPACING.s2,
  },
  emoji: { fontSize: TYPE.sizes.label },
  label: {
    fontFamily: TYPE.fontBody,
    fontSize: TYPE.sizes.caption,
    color: COLORS.textBody,
  },
});

export default Chip;
