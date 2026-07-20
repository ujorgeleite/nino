// components/ui/ModeToggle.tsx
// There ☀️ / Back 🌙 pill — prompts/starting.md §5b.
// There active = sun yellow bg, ink #7A5A12. Back active = dusk navy bg, white.
//
// The two modes are the product's core metaphor (outbound / return), driven by
// app state — NOT by the OS colour scheme.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, LAYOUT, RADII, SHADOWS, SPACING, TYPE } from '../../constants/nino';
import type { NinoMode } from '../../constants/nino';

/** Ink for the active "There" half — specified exactly in §5b. */
const THERE_INK = '#7A5A12';

type Props = {
  mode: NinoMode;
  onChange: (mode: NinoMode) => void;
};

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <View style={styles.pill}>
      <Half
        active={mode === 'there'}
        emoji="☀️"
        label="There"
        activeBg={COLORS.sun}
        activeInk={THERE_INK}
        onPress={() => onChange('there')}
      />
      <Half
        active={mode === 'back'}
        emoji="🌙"
        label="Back"
        activeBg={COLORS.dusk}
        activeInk={COLORS.paper}
        onPress={() => onChange('back')}
      />
    </View>
  );
}

type HalfProps = {
  active: boolean;
  emoji: string;
  label: string;
  activeBg: string;
  activeInk: string;
  onPress: () => void;
};

function Half({ active, emoji, label, activeBg, activeInk, onPress }: HalfProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      hitSlop={SPACING.s2}
      style={({ pressed }) => [
        styles.half,
        active && { backgroundColor: activeBg },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.emoji} allowFontScaling={false}>
        {emoji}
      </Text>
      <Text
        style={[styles.label, { color: active ? activeInk : COLORS.mutedInk }]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    backgroundColor: COLORS.paper,
    borderRadius: RADII.pill,
    borderWidth: 3,
    borderColor: COLORS.border,
    padding: SPACING.s1,
    gap: SPACING.s1,
    ...SHADOWS.chunkSm,
  },
  half: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s2,
    // This toggle sits on the Menu, where the child is, so rule 3 applies in
    // full: each half is a tap target at the 90pt floor. (An earlier version
    // subtracted the pill padding and landed at 66pt — below the floor.)
    minHeight: LAYOUT.touchMin,
    minWidth: LAYOUT.touchMin * 1.5,
    paddingHorizontal: SPACING.s4,
    borderRadius: RADII.pill,
  },
  pressed: { transform: [{ scale: 0.96 }] },
  emoji: { fontSize: TYPE.sizes.heading },
  label: {
    fontFamily: TYPE.fontBodyBold,
    fontSize: TYPE.sizes.body,
  },
});

export default ModeToggle;
