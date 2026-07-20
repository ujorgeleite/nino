// constants/puzzleShapes.ts
// The cut: four unmistakable shapes punched out of the country's picture.
//
// WHY NOT A GRID
//
// The first version cut the figure into six identical rectangles. A rectangle
// tells a child NOTHING about where it goes — they had to read the fragment of
// picture on it and match that to a gap, which is a visual reasoning task a
// 2-year-old does not have yet. Six identical shapes is six identical guesses.
//
// This is how a chunky wooden toddler puzzle works instead: the board IS the
// picture, with a few holes in it, and each hole is a different shape. The
// shape alone says where the piece goes. A circle cannot go in the square
// hole, and a child can see that before they try.
//
// Circle, square, triangle and star are the canonical shape-sorter set for
// this age: maximally distinct silhouettes, all nameable, none confusable with
// another at arm's length.

/** The four shapes. Order is the tray's left-to-right order before shuffling. */
export type PuzzleShapeKind = 'circle' | 'square' | 'triangle' | 'star';

export type PuzzleShape = {
  id: PuzzleShapeKind;
  /** Centre, as a fraction of the figure box (0..1). */
  cx: number;
  cy: number;
  /** Size, as a fraction of the figure box. The shape's full width. */
  size: number;
  /** Parent-facing. The child never sees text. */
  label: string;
};

/**
 * Where the holes sit on the picture.
 *
 * Spread across the figure rather than clustered, so no two holes touch: two
 * adjacent holes would let a piece look plausible in the wrong one, which is
 * exactly the ambiguity this design exists to remove.
 *
 * Kept off the extreme edges so every hole lands on actual artwork — a hole in
 * empty sky gives a child nothing to aim at.
 */
export const PUZZLE_SHAPES: readonly PuzzleShape[] = [
  { id: 'circle', cx: 0.26, cy: 0.26, size: 0.42, label: 'Circle' },
  { id: 'square', cx: 0.74, cy: 0.26, size: 0.42, label: 'Square' },
  { id: 'triangle', cx: 0.26, cy: 0.74, size: 0.42, label: 'Triangle' },
  { id: 'star', cx: 0.74, cy: 0.74, size: 0.42, label: 'Star' },
] as const;

/**
 * Why all four are the same SIZE.
 *
 * A piece is cut at the board's scale, so its touch target is
 * `size × boardSize`. On iPhone landscape the board can only be ~220pt tall,
 * and at the original 0.3 that produced a 66pt piece — well under the 90pt
 * floor rule 3 calls non-negotiable. Uniform 0.42 keeps every piece legal on
 * the smallest screen the app supports.
 *
 * Size was never what distinguished these pieces anyway. SHAPE is.
 */

/** How many pieces a puzzle has. Four is plenty at this age. */
export const PIECE_COUNT = PUZZLE_SHAPES.length;

export function shapeById(id: string): PuzzleShape | undefined {
  return PUZZLE_SHAPES.find((s) => s.id === id);
}

/**
 * The SVG path for a shape, drawn inside a `size`×`size` box at the origin.
 *
 * Used for BOTH the piece and the hole it fits, from this one function — so
 * they can never drift apart. If a hole and its piece were drawn separately,
 * the promise "this shape fits here" would be maintained by hand.
 */
export function shapePath(kind: PuzzleShapeKind, size: number): string {
  const s = size;
  const h = s / 2;

  switch (kind) {
    case 'circle': {
      // Two arcs, because a single arc cannot close a full circle.
      const r = h;
      return `M ${h} 0 A ${r} ${r} 0 1 1 ${h} ${s} A ${r} ${r} 0 1 1 ${h} 0 Z`;
    }

    case 'square': {
      // Softly rounded: nothing in this app is sharp, and a rounded corner is
      // also more forgiving of a slightly rotated drop.
      const r = s * 0.14;
      return (
        `M ${r} 0 L ${s - r} 0 Q ${s} 0 ${s} ${r} L ${s} ${s - r} ` +
        `Q ${s} ${s} ${s - r} ${s} L ${r} ${s} Q 0 ${s} 0 ${s - r} ` +
        `L 0 ${r} Q 0 0 ${r} 0 Z`
      );
    }

    case 'triangle': {
      // Equilateral-ish, pointing up, with the corners eased.
      return `M ${h} ${s * 0.04} L ${s * 0.96} ${s * 0.9} Q ${s} ${s} ${s * 0.86} ${s} L ${s * 0.14} ${s} Q 0 ${s} ${s * 0.04} ${s * 0.9} Z`;
    }

    case 'star':
    default: {
      // Five points. The most distinctive silhouette of the four, which is why
      // it sits in the busiest corner of the picture.
      const outer = h;
      const inner = h * 0.46;
      const points: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        // Start at the top point.
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        points.push(`${h + Math.cos(angle) * r} ${h + Math.sin(angle) * r}`);
      }
      return `M ${points.join(' L ')} Z`;
    }
  }
}
