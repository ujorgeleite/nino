// components/ui/WinOverlay.tsx
// Dim overlay, Nino swaying, a headline and an orange "Play again" — §6/§7.
// Shared by both games so the celebration is identical everywhere.
//
// CLAUDE.md rule 10: celebration is always louder and longer than any failure.
// The win haptic burst runs three heavy pulses; the miss gets one soft tap.

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Glyph from './Glyph';
import Mascot from '../mascot/Mascot';
import { fireWinHaptics } from '../../hooks/useFeedback';
import { useSound } from '../../hooks/useSound';
import { COLORS, LAYOUT, RADII, SHADOWS, SPACING, TYPE } from '../../constants/nino';

type Props = {
  /** Big friendly headline — one of the few strings a child sees. */
  title: string;
  /** Optional parent-facing detail, e.g. "in 7 tries". */
  detail?: string;
  /**
   * The button's words. Defaults to replaying; games that lead somewhere pass
   * their own, because finishing should open a door rather than loop back.
   */
  actionLabel?: string;
  onPlayAgain: () => void;
  /**
   * Rebuild the same thing. Optional, because not every game wants it: a child
   * who loved this one should be able to do it again without going anywhere,
   * but offering it where there is nothing to repeat would be noise.
   */
  onAgain?: () => void;
};

export function WinOverlay({
  title,
  detail,
  actionLabel = 'Play again',
  onPlayAgain,
  onAgain,
}: Props) {
  const { play } = useSound();

  useEffect(() => {
    play('win');
    return fireWinHaptics();
    // Fire once per win, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // FADES IN, and stays translucent on purpose. The win uncovers the
    // country in full colour with its clouds drifting, and a solid panel
    // dropped over it would hide the very thing being celebrated. The delay
    // lets the board fly out of frame first.
    <Animated.View
      entering={FadeIn.delay(700).duration(500)}
      style={styles.scrim}
      testID="win-overlay"
    >
      <Mascot pose="full" size={170} bob reaction="celebrate" />

      <Text style={styles.title} allowFontScaling={false}>
        {title}
      </Text>
      {detail ? (
        <Text style={styles.detail} allowFontScaling={false}>
          {detail}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {onAgain ? (
          <Pressable
            onPress={onAgain}
            accessibilityRole="button"
            accessibilityLabel="Again"
            hitSlop={SPACING.s4}
            style={({ pressed }) => [
              styles.again,
              styles.secondary,
              pressed && styles.pressed,
            ]}
            testID="win-again"
          >
            <Glyph name="restart" size={36} color={COLORS.ninoInk} />
            <Text
              style={[styles.againText, styles.secondaryText]}
              allowFontScaling={false}
            >
              Again
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onPlayAgain}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={SPACING.s4}
          style={({ pressed }) => [styles.again, pressed && styles.pressed]}
          testID="win-next"
        >
        {/* THE ICON IS THE BUTTON, the word is for whoever is sitting next to
            the child. This is the single control that continues the game, and
            rule 1 says a child who cannot read must never depend on text. */}
          <Glyph
            name={actionLabel === 'Play again' ? 'restart' : 'play'}
            size={40}
            color={COLORS.paper}
          />
          <Text style={styles.againText} allowFontScaling={false}>
            {actionLabel}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 48, 79, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s4,
    padding: SPACING.s5,
  },
  title: {
    fontFamily: TYPE.fontDisplay,
    fontSize: TYPE.sizes.display,
    color: COLORS.paper,
    textAlign: 'center',
  },
  detail: {
    fontFamily: TYPE.fontBody,
    fontSize: TYPE.sizes.body,
    color: COLORS.sun,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s4 },
  secondary: { backgroundColor: COLORS.paper },
  secondaryText: { color: COLORS.ninoInk },
  again: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s3,
    minHeight: LAYOUT.touchComfortable,
    justifyContent: 'center',
    backgroundColor: COLORS.actionPrimary,
    borderRadius: RADII.pill,
    borderWidth: 5,
    borderColor: COLORS.paper,
    paddingHorizontal: SPACING.s7,
    ...SHADOWS.chunk,
  },
  pressed: { transform: [{ scale: 0.95 }] },
  againText: {
    fontFamily: TYPE.fontDisplay,
    fontSize: TYPE.sizes.title,
    color: COLORS.actionPrimaryInk,
  },
});

export default WinOverlay;
