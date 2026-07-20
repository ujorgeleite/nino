// components/memory/MemoryBoard.tsx
// The 5×2 board — §6. Purely presentational: all state comes from useMemoryNL.
//
// Layout responds to the mode (docs/DESIGN_SYSTEM.md, "behaviour contract"):
// There scatters the cards for a playful, searchable board; Back aligns them
// into a clean grid so the end of the day is calmer.

import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import MemoryCardView from './MemoryCardView';
import { LAYOUT, SPACING, type NinoMode } from '../../constants/nino';
import type { MemoryCard } from '../../hooks/useMemoryNL';

const COLUMNS = 5;
const ROWS = 2;

/**
 * Target card width.
 *
 * Raised from 124 in the sensory redesign: a 2-year-old reaches for the
 * biggest thing on screen, and Memory was losing to Shape Fit partly on sheer
 * presence. Still fitted to the viewport, never below the 90pt floor.
 */
const NOMINAL_CARD = 148;

/** How far a card may drift from its grid slot, as a fraction of card width. */
const SCATTER_X = 0.16;
const SCATTER_Y = 0.13;
const SCATTER_TILT = 7; // degrees

/**
 * Deterministic per-card offset. Seeded from the card's instanceId so a card
 * keeps its position across every render — a scatter that re-randomises on
 * state change would make the whole board twitch on every tap.
 */
export function scatterFor(
  instanceId: string,
  mode: NinoMode,
  cardWidth: number,
): { dx: number; dy: number; tilt: number } {
  // Back mode is aligned by definition: no drift, no tilt.
  if (mode === 'back') return { dx: 0, dy: 0, tilt: 0 };

  // Cheap stable hash of the id — three decorrelated values from one string.
  let h = 2166136261;
  for (let i = 0; i < instanceId.length; i++) {
    h ^= instanceId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 1000) / 1000;
  const b = ((h >>> 10) % 1000) / 1000;
  const c = ((h >>> 20) % 1000) / 1000;

  // Map 0..1 to -1..1 so cards drift both ways around their slot.
  return {
    dx: (a * 2 - 1) * cardWidth * SCATTER_X,
    dy: (b * 2 - 1) * cardWidth * SCATTER_Y,
    tilt: (c * 2 - 1) * SCATTER_TILT,
  };
}

type Props = {
  cards: readonly MemoryCard[];
  mode: NinoMode;
  onFlip: (instanceId: string) => void;
};

export function MemoryBoard({ cards, mode, onFlip }: Props) {
  const { width, height } = useWindowDimensions();

  // Fit 5 across and 2 down inside the play area, never below the tap floor.
  // There mode reserves extra room so scattered cards cannot collide or clip.
  const gap = mode === 'back' ? SPACING.s3 : SPACING.s5;
  const scatterAllowance = mode === 'back' ? 1 : 1 + SCATTER_X * 2;

  const byWidth =
    (width - SPACING.s5 * 2 - gap * (COLUMNS - 1)) / COLUMNS / scatterAllowance;
  const byHeight = (height * 0.6 - gap * (ROWS - 1)) / ROWS / 1.28 / scatterAllowance;
  const cardW = Math.max(LAYOUT.touchMin, Math.min(NOMINAL_CARD, byWidth, byHeight));

  return (
    <View style={[styles.grid, { gap }]} testID="memory-board">
      {cards.map((card) => {
        const { dx, dy, tilt } = scatterFor(card.instanceId, mode, cardW);
        return (
          <View
            key={card.instanceId}
            style={{
              transform: [
                { translateX: dx },
                { translateY: dy },
                { rotate: `${tilt}deg` },
              ],
            }}
          >
            <MemoryCardView
              emoji={card.emoji}
              tint={card.tint}
              status={card.status}
              size={cardW}
              onPress={() => onFlip(card.instanceId)}
              // The child cannot read this; it is for the reviewing parent.
              accessibilityLabel={card.status === 'down' ? 'Hidden card' : card.emoji}
              testID={`card-${card.instanceId}`}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
});

export default MemoryBoard;
