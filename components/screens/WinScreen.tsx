// components/screens/WinScreen.tsx
// Celebration overlay shown when all pairs are matched.
// Celebration is always louder/longer than any failure (CLAUDE.md rule 10).

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import PedroMascot from '../mascot/PedroMascot';
import { COLORS, SPACING } from '../../constants/theme';

type Props = {
  onPlayAgain: () => void;
};

export function WinScreen({ onPlayAgain }: Props) {
  // Heavy haptic burst x3 on win.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 3; i++) {
        if (cancelled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        await new Promise((r) => setTimeout(r, 150));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LinearGradient colors={[COLORS.skyBlue, COLORS.warmCream]} style={styles.fill}>
      <View style={styles.center}>
        <Text style={styles.confetti} allowFontScaling={false}>
          🎉 ✨ 🎊
        </Text>
        <PedroMascot mood="celebrate" size={140} />
        {/* Circular "play again" — icon only, no text (child cannot read). */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            onPlayAgain();
          }}
          style={({ pressed }) => [styles.again, pressed && styles.againPressed]}
          hitSlop={20}
          accessibilityRole="button"
          accessibilityLabel="Play again"
        >
          <Text style={styles.againIcon} allowFontScaling={false}>
            🔁
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  confetti: { fontSize: 56 },
  again: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.pedroOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  againPressed: { transform: [{ scale: 0.94 }] },
  againIcon: { fontSize: 52 },
});

export default WinScreen;
