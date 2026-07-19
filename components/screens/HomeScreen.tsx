// components/screens/HomeScreen.tsx
// One screen, one primary action (TODDLER_UX.md): a big airplane Play button.
// No text in the play area — icon only.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import PedroMascot from '../mascot/PedroMascot';
import { COLORS, SPACING } from '../../constants/theme';

export function HomeScreen() {
  const router = useRouter();

  const play = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/games/memory');
  };

  return (
    <LinearGradient colors={[COLORS.skyBlue, COLORS.peach]} style={styles.fill}>
      <View style={styles.center}>
        <PedroMascot mood="idle" size={120} />
        <Pressable
          onPress={play}
          style={({ pressed }) => [styles.play, pressed && styles.playPressed]}
          hitSlop={24}
          accessibilityRole="button"
          accessibilityLabel="Play"
        >
          <Text style={styles.playIcon} allowFontScaling={false}>
            ✈️
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.xxl },
  play: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.pedroOrange,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  playPressed: { transform: [{ scale: 0.94 }] },
  playIcon: { fontSize: 72 },
});

export default HomeScreen;
