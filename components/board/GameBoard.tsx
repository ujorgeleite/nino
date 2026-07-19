// components/board/GameBoard.tsx
// Lays out the memory grid and wires taps → flips. Purely presentational:
// all game logic comes from useMemoryGame via props.

import React, { useCallback } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import type { BoardCard } from '../../hooks/useMemoryGame';
import { useCardFlip } from '../../hooks/useCardFlip';
import { CARD, SPACING } from '../../constants/theme';
import WoodCard from '../cards/WoodCard';
import CardFront from '../cards/CardFront';

type Props = {
  cards: BoardCard[];
  onFlip: (instanceId: string) => void;
};

function seedFrom(instanceId: string): number {
  let h = 0;
  for (let i = 0; i < instanceId.length; i++) h = (h * 31 + instanceId.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}

function FlipCard({
  card,
  size,
  onFlip,
}: {
  card: BoardCard;
  size: { w: number; h: number };
  onFlip: (id: string) => void;
}) {
  const faceUp = card.status === 'up' || card.status === 'matched';
  const { frontStyle, backStyle } = useCardFlip(faceUp);

  const handle = useCallback(() => {
    if (card.status !== 'down') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onFlip(card.instanceId);
  }, [card.instanceId, card.status, onFlip]);

  const tap = Gesture.Tap()
    .maxDuration(10000)
    .onEnd((_e, success) => {
      'worklet';
      if (success) runOnJS(handle)();
    });

  return (
    <GestureDetector gesture={tap}>
      <View style={[styles.slot, { width: size.w, height: size.h }]}>
        {/* back (wood) */}
        <Animated.View style={[styles.face, backStyle]}>
          <WoodCard width={size.w} height={size.h} seed={seedFrom(card.instanceId)} />
        </Animated.View>
        {/* front (icon) */}
        <Animated.View style={[styles.face, frontStyle]}>
          <CardFront
            emoji={card.emoji}
            matched={card.status === 'matched'}
            width={size.w}
            height={size.h}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export function GameBoard({ cards, onFlip }: Props) {
  const { width } = useWindowDimensions();
  // 4 columns on wide (iPad) screens, 3 on narrow (iPhone).
  const columns = width >= 700 ? 4 : 3;
  const gutter = SPACING.md * 2 + CARD.margin * 2 * columns;
  const cardW = Math.min(CARD.width * 1.4, (width - gutter) / columns);
  const cardH = cardW * (CARD.height / CARD.width);

  return (
    <View style={styles.board}>
      {cards.map((card) => (
        <View key={card.instanceId} style={{ margin: CARD.margin }}>
          <FlipCard card={card} size={{ w: cardW, h: cardH }} onFlip={onFlip} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  slot: {
    position: 'relative',
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default GameBoard;
