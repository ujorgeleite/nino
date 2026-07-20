// components/ui/ParentGate.tsx
// "For grown-ups" pill that opens ONLY after a ~1.5s press-and-hold, with a
// fill animation showing progress — prompts/starting.md §5b.
//
// A plain tap MUST NOT open it. That is the whole point: it separates child
// space from grown-up space, and a 2-year-old taps constantly but does not
// sustain a deliberate hold.
//
// The gate is also an Apple Kids category requirement — anything commercial
// (IAP, external links) must sit behind it.

import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, RADII, SPACING, TYPE } from '../../constants/nino';

/** Hold duration required to open. Spec: ~1.5s. */
export const GATE_HOLD_MS = 1500;

type Props = {
  onUnlock: () => void;
  label?: string;
};

export function ParentGate({ onUnlock, label = 'For grown-ups' }: Props) {
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);

  // Plain functions, not useCallback: putting `progress` in a dependency array
  // makes the shared-value write look like mutating a hook argument
  // (react-hooks/immutability). Press handlers gain nothing from memoization.
  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setHolding(false);
    progress.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
  };

  const begin = () => {
    setHolding(true);
    progress.value = withTiming(1, {
      duration: GATE_HOLD_MS,
      easing: Easing.linear,
    });
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      progress.value = withTiming(0, { duration: 200 });
      onUnlock();
    }, GATE_HOLD_MS);
  };

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Pressable
      onPressIn={begin}
      onPressOut={cancel}
      // Deliberately no onPress handler: a tap must never open the gate.
      accessibilityRole="button"
      accessibilityLabel={`${label}. Press and hold to open.`}
      accessibilityHint="Hold for one and a half seconds"
      hitSlop={SPACING.s2}
      style={styles.pill}
      testID="parent-gate"
    >
      <Animated.View style={[styles.fill, fillStyle]} pointerEvents="none" />
      <View style={styles.content}>
        <Text style={styles.label} allowFontScaling={false}>
          {label}
        </Text>
        <Text style={styles.hint} allowFontScaling={false}>
          {holding ? 'keep holding…' : 'hold'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.border,
    overflow: 'hidden',
    paddingHorizontal: SPACING.s4,
    paddingVertical: SPACING.s3,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.sun,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s2 },
  label: {
    fontFamily: TYPE.fontBodyBold,
    fontSize: TYPE.sizes.label,
    color: COLORS.mutedInk,
  },
  hint: {
    fontFamily: TYPE.fontBody,
    fontSize: TYPE.sizes.caption,
    color: COLORS.muted,
  },
});

export default ParentGate;
