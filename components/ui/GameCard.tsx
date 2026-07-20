// components/ui/GameCard.tsx
// A tile in the game picker. Two things only: the place, and the game.
//
// WHAT IS DELIBERATELY ABSENT:
//   - a play pip. Every unlocked tile is playable; marking each one says
//     nothing and adds a shape to scan past.
//   - the country name. The child cannot read it (CLAUDE.md rule 1).
//   - the flag. The backdrop already IS the country — a flag on top of a
//     picture of the place is the same fact twice.
//
// What remains: a scene backdrop that says WHERE, and an emblem that says
// WHICH GAME. Nothing competes with them.
//
// The lock badge stays, because "you cannot play this yet" is information the
// tile cannot convey any other way.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Glyph from './Glyph';
import CountryTileBackdrop from './CountryTileBackdrop';
import { COLORS, LAYOUT, RADII, SHADOWS, SPACING } from '../../constants/nino';
import type { NinoMode } from '../../constants/nino';
import type { CountryData } from '../../constants/countries';

type Props = {
  country: CountryData;
  /** The game's emblem — MemoryEmblem or ShapeFitEmblem. */
  emblem: React.ReactNode;
  /** Parent-facing description, e.g. "Memory, France". Never rendered. */
  accessibilityLabel: string;
  locked?: boolean;
  size?: number;
  mode?: NinoMode;
  onPress?: () => void;
  testID?: string;
};

export function GameCard({
  country,
  emblem,
  accessibilityLabel,
  locked = false,
  size = 180,
  mode = 'there',
  onPress,
  testID,
}: Props) {
  const side = Math.max(LAYOUT.touchMin, size);

  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      accessibilityLabel={locked ? `${accessibilityLabel}, locked` : accessibilityLabel}
      hitSlop={SPACING.s2}
      testID={testID}
      style={({ pressed }) => [
        styles.tile,
        { width: side, height: side },
        pressed && !locked && styles.pressed,
      ]}
    >
      <CountryTileBackdrop country={country} size={side} mode={mode} />

      <View style={[styles.body, locked && styles.dimmed]}>{emblem}</View>

      {locked ? (
        <View style={styles.lock}>
          <Glyph name="lock" size={22} color={COLORS.mutedInk} weight={8} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: RADII.xl,
    borderWidth: 6,
    borderColor: COLORS.paper,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.chunk,
  },
  pressed: { transform: [{ scale: 1.05 }] },
  body: { alignItems: 'center', justifyContent: 'center' },
  // React Native has no grayscale filter; opacity is the honest equivalent.
  dimmed: { opacity: 0.45 },
  lock: {
    position: 'absolute',
    top: SPACING.s3,
    right: SPACING.s3,
    width: 38,
    height: 38,
    borderRadius: RADII.round,
    backgroundColor: COLORS.paper,
    borderWidth: 3,
    borderColor: COLORS.ninoInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GameCard;
