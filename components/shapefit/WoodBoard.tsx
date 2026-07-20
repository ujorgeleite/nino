// components/shapefit/WoodBoard.tsx
// The board: five recessed sockets carved into wood.
//
// A socket does two jobs. Empty, it shows a faint silhouette so the child
// knows what belongs there. As a matching piece approaches, it GLOWS — the
// board saying "yes, here" before the finger is even released.
//
// That glow is the biggest usability win in the game. Without it a 2-year-old
// has to guess whether they are close enough, and a near miss is
// indistinguishable from a wrong choice.
//
// Sockets report their centres in WINDOW coordinates, the same space the pan
// gesture reports, so hit-testing needs no offset arithmetic.

import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { HALO, RESTING } from '../../constants/depth';
import { COLORS, RADII, SPACING } from '../../constants/nino';
import type { CountryItem } from '../../constants/countries';

const WOOD_LIGHT = '#C89B6A';
const WOOD_MID = '#B07F4F';
const WOOD_DARK = '#8B5A2B';

type Props = {
  items: readonly CountryItem[];
  seated: Set<string>;
  /** The item currently hovering over its own socket, if any. */
  highlighted: string | null;
  socketSize: number;
  /** Reports a socket's centre in WINDOW coordinates. */
  onSocketMeasured: (itemId: string, centre: { x: number; y: number }) => void;
};

export function WoodBoard({
  items,
  seated,
  highlighted,
  socketSize,
  onSocketMeasured,
}: Props) {
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
    <View style={[styles.shadowWrap, RESTING.high]}>
      <LinearGradient
        colors={[WOOD_LIGHT, WOOD_MID, WOOD_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.board}
      >
        {[0.25, 0.5, 0.75].map((t) => (
          <View key={t} pointerEvents="none" style={[styles.seam, { top: `${t * 100}%` }]} />
        ))}
        <View pointerEvents="none" style={styles.insetTop} />
        <View pointerEvents="none" style={styles.insetBottom} />

        <View style={[styles.sockets, { gap: SPACING.s5 }]}>
          {items.map((item) => (
            <Socket
              key={item.id}
              item={item}
              size={socketSize}
              filled={seated.has(item.id)}
              glowing={highlighted === item.id}
              onLayout={() => measure(item.id)}
              innerRef={(node) => {
                refs.current[item.id] = node;
              }}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

function Socket({
  item,
  size,
  filled,
  glowing,
  onLayout,
  innerRef,
}: {
  item: CountryItem;
  size: number;
  filled: boolean;
  glowing: boolean;
  onLayout: () => void;
  innerRef: (node: View | null) => void;
}) {
  const glow = useSharedValue(0);

  React.useEffect(() => {
    glow.value = withTiming(glowing ? 1 : 0, { duration: 160 });
  }, [glowing, glow]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: glow.value * HALO.activeOpacity,
    transform: [{ scale: 1 + glow.value * (HALO.scale - 1) }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      {/* The halo sits behind the socket and grows out past its edge. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          { width: size, height: size, borderRadius: size * 0.3 },
          haloStyle,
        ]}
      />
      <View
        ref={innerRef}
        onLayout={onLayout}
        testID={`socket-${item.id}`}
        style={[
          styles.socket,
          { width: size, height: size, borderRadius: size * 0.24 },
        ]}
      >
        {/* The silhouette fades out once the real piece is sitting here. */}
        <Text
          style={[styles.silhouette, { fontSize: size * 0.55 }, filled && styles.hidden]}
          allowFontScaling={false}
        >
          {item.emoji}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: { borderRadius: RADII.xl },
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
  sockets: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    backgroundColor: HALO.color,
    shadowColor: HALO.color,
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  socket: {
    backgroundColor: 'rgba(45, 24, 8, 0.55)',
    borderWidth: 3,
    borderColor: 'rgba(30, 15, 5, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // §7: "a faint silhouette" — opacity is RN's honest equivalent of a filter.
  silhouette: { opacity: 0.28 },
  hidden: { opacity: 0 },
});

export default WoodBoard;
