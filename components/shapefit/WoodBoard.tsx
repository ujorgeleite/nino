// components/shapefit/WoodBoard.tsx
// The wooden board with five recessed cut-outs — prompts/starting.md §7.
// Brown gradient, plank seams, inset highlight/shadow, chunky drop shadow.
// Each socket shows a faint silhouette of its item until the piece is seated.
//
// Socket centres are reported in WINDOW coordinates, because that is the space
// the pan gesture's absoluteX/absoluteY already live in. Reporting them
// parent-relative meant the drop point had to be reconstructed by summing a
// chain of offsets (socket row padding, board position, layer position) — and
// missing any one of them silently broke every drop.

import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CountryItem } from '../../constants/countries';
import { COLORS, RADII, SHADOWS, SPACING } from '../../constants/nino';

/** Plank tones — the wood ramp lives here, not in the Nino palette. */
const WOOD_LIGHT = '#C89B6A';
const WOOD_MID = '#B07F4F';
const WOOD_DARK = '#8B5A2B';

type Props = {
  items: readonly CountryItem[];
  seated: Set<string>;
  socketSize: number;
  /** Reports a socket's centre in WINDOW coordinates. */
  onSocketMeasured: (itemId: string, centre: { x: number; y: number }) => void;
};

export function WoodBoard({ items, seated, socketSize, onSocketMeasured }: Props) {
  const refs = useRef<Record<string, View | null>>({});

  const measure = useCallback(
    (itemId: string) => {
      const node = refs.current[itemId];
      if (!node) return;
      node.measureInWindow((x, y, width, height) => {
        onSocketMeasured(itemId, { x: x + width / 2, y: y + height / 2 });
      });
    },
    [onSocketMeasured],
  );

  return (
    <View style={styles.shadowWrap}>
      <LinearGradient
        colors={[WOOD_LIGHT, WOOD_MID, WOOD_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.board}
      >
        {/* Plank seams: three hairlines across the face. */}
        {[0.25, 0.5, 0.75].map((t) => (
          <View key={t} pointerEvents="none" style={[styles.seam, { top: `${t * 100}%` }]} />
        ))}

        {/* Inset highlight along the top edge, shadow along the bottom. */}
        <View pointerEvents="none" style={styles.insetTop} />
        <View pointerEvents="none" style={styles.insetBottom} />

        <View style={styles.sockets}>
          {items.map((item) => (
            <View
              key={item.id}
              style={[
                styles.socket,
                { width: socketSize, height: socketSize, borderRadius: socketSize * 0.24 },
              ]}
              testID={`socket-${item.id}`}
              ref={(node) => {
                refs.current[item.id] = node;
              }}
              // Measure after layout settles; window coords need a committed tree.
              onLayout={() => measure(item.id)}
            >
              {seated.has(item.id) ? (
                <Text style={{ fontSize: socketSize * 0.55 }} allowFontScaling={false}>
                  {item.emoji}
                </Text>
              ) : (
                // Faint silhouette: enough to aim at, not enough to look filled.
                <Text
                  style={[styles.silhouette, { fontSize: socketSize * 0.55 }]}
                  allowFontScaling={false}
                >
                  {item.emoji}
                </Text>
              )}
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: { ...SHADOWS.chunkLg, borderRadius: RADII.xl },
  board: {
    borderRadius: RADII.xl,
    borderWidth: 5,
    borderColor: COLORS.ninoInk,
    padding: SPACING.s5,
    overflow: 'hidden',
  },
  seam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(60, 30, 10, 0.18)',
  },
  insetTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 220, 170, 0.28)',
  },
  insetBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: 'rgba(50, 25, 5, 0.26)',
  },
  sockets: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s4,
  },
  socket: {
    backgroundColor: 'rgba(45, 24, 8, 0.55)',
    borderWidth: 3,
    borderColor: 'rgba(30, 15, 5, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // §7: "a faint (28% brightness-0) silhouette" — opacity is RN's honest
  // equivalent; there is no brightness filter.
  silhouette: { opacity: 0.28 },
});

export default WoodBoard;
