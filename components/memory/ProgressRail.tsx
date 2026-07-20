// components/memory/ProgressRail.tsx
// The five item tokens that light up as each pair is found — §6.
//
// This is the child's only progress feedback, and it is purely additive: it
// fills up, never empties. Nothing here can read as losing ground.

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { CountryItem } from '../../constants/countries';
import { COLORS, MOTION, RADII, SPACING } from '../../constants/nino';

type Props = {
  items: readonly CountryItem[];
  foundItemIds: readonly string[];
};

export function ProgressRail({ items, foundItemIds }: Props) {
  return (
    <View style={styles.rail} accessibilityRole="progressbar">
      {items.map((item) => (
        <Token
          key={item.id}
          testID={`rail-${item.id}`}
          emoji={item.emoji}
          label={item.label}
          tint={item.tint}
          found={foundItemIds.includes(item.id)}
        />
      ))}
    </View>
  );
}

function Token({
  emoji,
  label,
  tint,
  found,
  testID,
}: {
  emoji: string;
  label: string;
  tint: string;
  found: boolean;
  testID: string;
}) {
  const pop = useSharedValue(1);

  useEffect(() => {
    if (found) {
      pop.value = withSequence(
        withTiming(1.3, { duration: MOTION.matchPulse }),
        withSpring(1, { damping: 7, stiffness: 190 }),
      );
    }
  }, [found, pop]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <Animated.View
      style={[
        styles.token,
        { backgroundColor: found ? tint : COLORS.surface },
        found && styles.tokenFound,
        style,
      ]}
      testID={testID}
      // Parent-facing progress readout. accessibilityState alone does not
      // surface on the web build (no supporting role), and a parent checking
      // on the game benefits from hearing what has been found anyway.
      accessibilityRole="image"
      accessibilityLabel={`${label}: ${found ? 'found' : 'not found yet'}`}
    >
      {/* Dimmed rather than hidden: the child sees what is still to come. */}
      <Text style={[styles.emoji, !found && styles.pending]} allowFontScaling={false}>
        {emoji}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    gap: SPACING.s2,
    backgroundColor: COLORS.paper,
    borderRadius: RADII.pill,
    borderWidth: 3,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.s3,
    paddingVertical: SPACING.s2,
  },
  token: {
    width: 40,
    height: 40,
    borderRadius: RADII.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.borderSoft,
  },
  tokenFound: { borderColor: COLORS.green },
  emoji: { fontSize: 20 },
  pending: { opacity: 0.28 },
});

export default ProgressRail;
