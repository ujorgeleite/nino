// components/ui/HudButton.tsx
// Round tan-bordered white HUD button — prompts/starting.md §6 (home, restart,
// mute). Shared by both games.
//
// HUD chrome is grown-up affordance, but it sits on a child screen, so it still
// honours the 90pt tap floor (CLAUDE.md rule 3).

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Glyph, { type GlyphName } from './Glyph';
import { COLORS, LAYOUT, SHADOWS } from '../../constants/nino';

type Props = {
  icon: GlyphName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
};

export function HudButton({ icon, onPress, accessibilityLabel, size }: Props) {
  const side = size ?? LAYOUT.touchMin;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      style={({ pressed }) => [
        styles.button,
        { width: side, height: side, borderRadius: side / 2 },
        pressed && styles.pressed,
      ]}
    >
      <Glyph name={icon} size={side * 0.5} color={COLORS.mutedInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.paper,
    borderWidth: 3,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.chunkSm,
  },
  pressed: { transform: [{ scale: 0.94 }] },
});

export default HudButton;
