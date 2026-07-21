// components/puzzle/BlockShape.tsx
// One soft toy block, drawn.
//
// Just the drawing — no gestures, no animation. The board uses it to show what
// has been built, and the draggable piece wraps it. Keeping it dumb is what
// guarantees a block and the hole it fills are the same shape: both come from
// the same path in constants/landmarks.ts, rendered by this one component.
//
// The heavy outline is the brand's, and it is what stops a block dissolving
// into the cream panel behind it once it is placed.

import React from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { BLOCK_INK, type Block } from '../../constants/landmarks';

type Props = {
  block: Block;
  /** The board's size in points — a block is cut at exactly this scale. */
  boardSize: number;
};

/** Outline weights, in design units. 6 and 5 at a 100-unit box, per the spec. */
const OUTLINE = 6;
const DETAIL_OUTLINE = 5;

export function BlockShape({ block, boardSize }: Props) {
  const [bx, by, bw, bh] = block.box;
  const width = (bw / 100) * boardSize;
  const height = (bh / 100) * boardSize;

  // The viewBox crops to the block's own bounds AND scales it, so the drawing
  // is exactly the region the data declares — no offset arithmetic anywhere.
  //
  // Padded by half the stroke: an outline centred on the path would otherwise
  // be sliced in half by the edge of the box.
  const pad = OUTLINE / 2;

  return (
    <View style={{ width, height }} pointerEvents="none">
      <Svg
        width={width}
        height={height}
        viewBox={`${bx - pad} ${by - pad} ${bw + OUTLINE} ${bh + OUTLINE}`}
      >
        <G>
          <Path
            d={block.path}
            fill={block.fill}
            stroke={BLOCK_INK}
            strokeWidth={OUTLINE}
            strokeLinejoin="round"
          />
          {block.details?.map((detail) => (
            <Path
              key={detail.path}
              d={detail.path}
              fill={detail.fill}
              stroke={BLOCK_INK}
              strokeWidth={DETAIL_OUTLINE}
              strokeLinejoin="round"
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

export default BlockShape;
