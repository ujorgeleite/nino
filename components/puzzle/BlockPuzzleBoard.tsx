// components/puzzle/BlockPuzzleBoard.tsx
// The wooden board the blocks go into.
//
// THREE LAYERS, and the order is the design:
//   1. the FRAME — chunky painted wood, with a lip of shadow under it so it
//      reads as an object sitting on the table rather than a panel painted on
//      the background. The board used to be a plain tan square and had no
//      identity at all; a wooden tray is a thing a toddler has already held.
//   2. the GHOST — the finished landmark, pale and outlined in dashes. This is
//      the whole instruction: the child sees a triangle-shaped hole and has a
//      triangle in their hands. Nothing depends on reading, or on colour.
//   3. the BLOCKS already placed, drawn at full strength on top of their ghost.
//
// A ghost region and the block that fills it are drawn from THE SAME path, so
// the two can never disagree about what fits where.

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import BlockShape from './BlockShape';
import { BOARD, GHOST, type Landmark } from '../../constants/landmarks';
import { TYPE } from '../../constants/nino';

type Props = {
  landmark: Landmark;
  placed: ReadonlySet<string>;
  /** The board's inner panel size in points. Everything scales off this. */
  size: number;
  /** Reports a hole's centre in WINDOW coordinates, for the drop test. */
  onHoleMeasured: (id: string, centre: { x: number; y: number }) => void;
};

/** The frame's thickness, as a share of the panel. Chunky on purpose. */
const FRAME = 0.075;

export function BlockPuzzleBoard({ landmark, placed, size, onHoleMeasured }: Props) {
  const frame = Math.round(size * FRAME);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[BOARD.frameFrom, BOARD.frameTo]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.frame, { padding: frame }]}
      >
        <Text style={styles.title} allowFontScaling={false}>
          {landmark.title}
        </Text>

        <View style={[styles.panel, { width: size, height: size }]}>
          <LinearGradient
            colors={[BOARD.panelFrom, BOARD.panelTo]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* 2. The ghost: every hole, whether filled yet or not. */}
          <Svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {landmark.blocks.map((block) => (
              <Path
                key={block.id}
                d={block.path}
                fill={GHOST.fill}
                fillOpacity={GHOST.fillOpacity}
                stroke={GHOST.stroke}
                strokeWidth={2}
                strokeDasharray={GHOST.dash}
                strokeLinejoin="round"
              />
            ))}
          </Svg>

          {/* 3. What has been built so far, plus the holes that report where
              they are. A hole always renders so it can be measured, even once
              it is full. */}
          {landmark.blocks.map((block) => (
            <Hole
              key={block.id}
              block={block}
              boardSize={size}
              filled={placed.has(block.id)}
              onMeasured={onHoleMeasured}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

function Hole({
  block,
  boardSize,
  filled,
  onMeasured,
}: {
  block: Landmark['blocks'][number];
  boardSize: number;
  filled: boolean;
  onMeasured: (id: string, centre: { x: number; y: number }) => void;
}) {
  const ref = useRef<View | null>(null);
  const [bx, by, bw, bh] = block.box;

  // THE POP BELONGS HERE, not on the piece that was dragged.
  //
  // A placed block is drawn by the board and the dragged piece is hidden, so a
  // pop animation on the piece played to nobody. This is the shape the child
  // is actually looking at when it lands.
  const pop = useSharedValue(0);
  const wasFilled = useRef(filled);

  useEffect(() => {
    if (filled && !wasFilled.current) {
      pop.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 220 }),
      );
    }
    wasFilled.current = filled;
  }, [filled, pop]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pop.value * 0.14 }],
  }));

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, w, h) => {
      onMeasured(block.id, { x: x + w / 2, y: y + h / 2 });
    });
  }, [block.id, onMeasured]);

  return (
    <View
      ref={ref}
      onLayout={measure}
      pointerEvents="none"
      testID={`hole-${block.id}`}
      style={{
        position: 'absolute',
        left: (bx / 100) * boardSize,
        top: (by / 100) * boardSize,
        width: (bw / 100) * boardSize,
        height: (bh / 100) * boardSize,
      }}
    >
      {filled ? (
        <Animated.View style={popStyle}>
          <BlockShape block={block} boardSize={boardSize} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  frame: {
    borderRadius: 28,
    borderWidth: 9,
    borderColor: BOARD.border,
    alignItems: 'center',
    // The lip that makes it an object on a table, not a painted rectangle.
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  title: {
    fontFamily: TYPE.fontDisplay,
    fontSize: TYPE.sizes.label,
    color: BOARD.title,
    marginBottom: 6,
  },
  panel: { borderRadius: 18, overflow: 'hidden' },
});

export default BlockPuzzleBoard;
