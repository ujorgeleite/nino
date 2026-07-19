// app/games/memory.tsx — Memory Match (Game 1). See docs/PRODUCT.md MVP scope.
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemoryGame } from '../../hooks/useMemoryGame';
import GameBoard from '../../components/board/GameBoard';
import PedroMascot, { type PedroMood } from '../../components/mascot/PedroMascot';
import WinScreen from '../../components/screens/WinScreen';
import { COLORS, SPACING } from '../../constants/theme';

export default function MemoryGame() {
  const { cards, isWon, flipCard, reset, lastEvent } = useMemoryGame();
  const moodRef = useRef<PedroMood>('idle');

  // Pedro + haptics react to match / mismatch.
  useEffect(() => {
    if (lastEvent === 'match') {
      moodRef.current = 'celebrate';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (lastEvent === 'mismatch') {
      moodRef.current = 'oops';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [lastEvent]);

  if (isWon) {
    return <WinScreen onPlayAgain={reset} />;
  }

  return (
    <LinearGradient colors={[COLORS.skyBlue, COLORS.warmCream]} style={styles.fill}>
      <View style={styles.pedro}>
        <PedroMascot
          mood={lastEvent === 'match' ? 'celebrate' : lastEvent === 'mismatch' ? 'oops' : 'idle'}
          size={72}
        />
      </View>
      <View style={styles.boardWrap}>
        <GameBoard cards={cards} onFlip={flipCard} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pedro: { alignItems: 'center', paddingTop: SPACING.md },
  boardWrap: { flex: 1, justifyContent: 'center' },
});
