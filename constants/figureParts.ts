// constants/figureParts.ts
// How each drawing comes apart.
//
// THE DESIGN
//
// A piece is a PART OF THE PICTURE, cut along the drawing's own anatomy — the
// way a wooden toddler puzzle of a dinosaur separates into head-and-neck,
// belly-and-arms, and tail-and-legs. Because those outlines follow the animal,
// each one only fits its own place, and a child can see that from the shape.
//
// Two earlier attempts failed for the same underlying reason:
//   - identical rectangles: shape said nothing, so the child had to read
//     fragments of picture and reason about them
//   - circle / square / triangle / star punched into the art: the shapes were
//     distinct, but they were not the picture. Assembling them taught shape
//     sorting, not "I built the windmill".
//
// So the cut follows the subject. The BACKGROUND stays on the board and is
// never part of a piece — the pieces are the drawing, nothing else.
//
// Every part carries an explicit polygon rather than being derived, because
// the boundary is a drawing decision: where a castle's turret ends and its keep
// begins is a judgement about the picture, not a computation.

import type { StaticPrimitiveKind } from '../components/scene/primitives';

export type FigurePart = {
  id: string;
  /** Outline in the primitive's own 100×100 box (primitives.tsx contract). */
  path: string;
  /**
   * The part's bounding box in that same space, as [x, y, width, height].
   *
   * Declared rather than computed: it decides how large the piece is drawn and
   * how big its touch target must be, and a parser guessing at arcs would be a
   * silent source of misplaced pieces.
   */
  box: readonly [number, number, number, number];
  /** Parent-facing. The child never sees text. */
  label: string;
};

/**
 * The parts of each drawing, in assembly order (top of the picture first).
 *
 * Counts vary because subjects vary: a forest is naturally three trees, a
 * castle is four distinct masses, a mountain is a peak and two flanks.
 * Forcing every picture into the same number of pieces would mean cutting some
 * of them against their own shape.
 */
export const FIGURE_PARTS: Record<StaticPrimitiveKind, readonly FigurePart[]> = {
  // Peak, then two slopes cut on a SLANT so they are not mirror images.
  // A symmetric cut would give two identical shapes, and identical shapes are
  // exactly the ambiguity this design exists to remove.
  mountain: [
    {
      id: 'peak',
      path: 'M 50 8 L 72 50 L 30 50 Z',
      box: [30, 8, 42, 42],
      label: 'Peak',
    },
    {
      id: 'left-slope',
      path: 'M 30 50 L 52 50 L 40 100 L 2 100 Z',
      box: [2, 50, 50, 50],
      label: 'Left slope',
    },
    {
      id: 'right-slope',
      path: 'M 52 50 L 72 50 L 98 100 L 40 100 Z',
      box: [40, 50, 58, 50],
      label: 'Right slope',
    },
  ],

  // Spire, shaft, splayed base — three different silhouettes by nature.
  tower: [
    {
      id: 'spire',
      path: 'M 38 28 L 50 3 L 62 28 Z',
      box: [38, 3, 24, 25],
      label: 'Spire',
    },
    {
      id: 'shaft',
      path: 'M 38 28 L 62 28 L 68 64 L 32 64 Z',
      box: [32, 28, 36, 36],
      label: 'Middle',
    },
    {
      id: 'base',
      path: 'M 32 64 L 68 64 L 78 100 L 22 100 Z',
      box: [22, 64, 56, 36],
      label: 'Base',
    },
  ],

  // Four masses, each deliberately different: a plain turret, a turret with a
  // pointed cap, a crenellated keep, and a gate with its archway cut out.
  castle: [
    {
      id: 'left-turret',
      path: 'M 10 34 L 30 34 L 30 100 L 10 100 Z',
      box: [10, 34, 20, 66],
      label: 'Left tower',
    },
    {
      id: 'keep',
      path: 'M 30 44 L 30 36 L 40 36 L 40 44 L 52 44 L 52 36 L 62 36 L 62 44 L 70 44 L 70 70 L 30 70 Z',
      box: [30, 36, 40, 34],
      label: 'Keep',
    },
    {
      id: 'gate',
      path: 'M 30 70 L 70 70 L 70 100 L 58 100 L 58 84 Q 50 78 42 84 L 42 100 L 30 100 Z',
      box: [30, 70, 40, 30],
      label: 'Gate',
    },
    {
      id: 'right-turret',
      path: 'M 68 34 L 80 18 L 92 34 L 88 34 L 88 100 L 72 100 L 72 34 Z',
      box: [68, 18, 24, 82],
      label: 'Right tower',
    },
  ],

  // A semicircle, a plain wall, and a wall with the doorway cut into it.
  dome: [
    {
      id: 'cupola',
      path: 'M 24 58 A 26 26 0 0 1 76 58 Z',
      box: [24, 30, 52, 28],
      label: 'Dome',
    },
    {
      id: 'left-wall',
      path: 'M 24 58 L 48 58 L 48 100 L 24 100 Z',
      box: [24, 58, 24, 42],
      label: 'Left wall',
    },
    {
      id: 'right-wall',
      path: 'M 48 58 L 76 58 L 76 100 L 62 100 L 62 82 Q 55 76 48 82 Z',
      box: [48, 58, 28, 42],
      label: 'Right wall',
    },
  ],

  // Roof, an upper storey, and a ground floor with the door cut out.
  house: [
    {
      id: 'roof',
      path: 'M 14 46 L 50 9 L 86 46 Z',
      box: [14, 9, 72, 37],
      label: 'Roof',
    },
    {
      id: 'upper-floor',
      path: 'M 18 46 L 82 46 L 82 74 L 18 74 Z',
      box: [18, 46, 64, 28],
      label: 'Upstairs',
    },
    {
      id: 'ground-floor',
      path: 'M 18 74 L 82 74 L 82 100 L 60 100 L 60 84 L 40 84 L 40 100 L 18 100 Z',
      box: [18, 74, 64, 26],
      label: 'Downstairs',
    },
  ],

  // The entablature, then two arcades of DIFFERENT widths and arch counts.
  columns: [
    {
      id: 'entablature',
      path: 'M 8 24 L 92 24 L 88 46 L 12 46 Z',
      box: [8, 24, 84, 22],
      label: 'Roof',
    },
    {
      id: 'left-arcade',
      path: 'M 12 46 L 44 46 L 44 100 L 36 100 L 36 66 Q 28 60 20 66 L 20 100 L 14 100 Z',
      box: [12, 46, 32, 54],
      label: 'Left arches',
    },
    {
      id: 'right-arcade',
      path: 'M 44 46 L 88 46 L 86 100 L 78 100 L 78 66 Q 70 60 62 66 L 62 100 L 54 100 L 54 66 Q 49 62 44 66 Z',
      box: [44, 46, 44, 54],
      label: 'Right arches',
    },
  ],

  // A lintel, a plain pier, and a pier with a stepped foot.
  arch: [
    {
      id: 'lintel',
      path: 'M 12 20 L 88 20 L 84 44 L 16 44 Z',
      box: [12, 20, 76, 24],
      label: 'Top',
    },
    {
      id: 'left-pier',
      path: 'M 16 44 L 42 44 L 42 100 L 18 100 Z',
      box: [16, 44, 26, 56],
      label: 'Left side',
    },
    {
      id: 'right-pier',
      path: 'M 58 44 L 84 44 L 82 92 L 88 92 L 88 100 L 56 100 L 56 92 L 60 92 Z',
      box: [56, 44, 32, 56],
      label: 'Right side',
    },
  ],

  // A forest is already three trees, and they are three different heights.
  forest: [
    {
      id: 'left-tree',
      path: 'M 22 100 L 6 62 L 16 62 L 22 38 L 28 62 L 38 62 Z',
      box: [6, 38, 32, 62],
      label: 'Small tree',
    },
    {
      id: 'centre-tree',
      path: 'M 52 100 L 32 52 L 44 52 L 52 20 L 60 52 L 72 52 Z',
      box: [32, 20, 40, 80],
      label: 'Tall tree',
    },
    {
      id: 'right-tree',
      path: 'M 80 100 L 64 64 L 74 64 L 80 42 L 86 64 L 96 64 Z',
      box: [64, 42, 32, 58],
      label: 'Other tree',
    },
  ],

  // A sloping end, the arched span, and an end with a pier under it.
  bridge: [
    {
      id: 'left-end',
      path: 'M 2 80 L 30 58 L 30 100 L 2 100 Z',
      box: [2, 58, 28, 42],
      label: 'Left end',
    },
    {
      id: 'span',
      path: 'M 30 58 Q 50 48 68 58 L 68 74 Q 50 64 30 74 Z',
      box: [30, 48, 38, 26],
      label: 'Middle',
    },
    {
      id: 'right-end',
      path: 'M 68 58 L 98 80 L 98 100 L 84 100 L 84 76 L 76 76 L 76 100 L 68 100 Z',
      box: [68, 58, 30, 42],
      label: 'Right end',
    },
  ],

  // Ground treatments are never the puzzle's subject; they stay on the board.
  hill: [],
  water: [],
  field: [],
};

/** The parts for a primitive, or an empty list if it is not a subject. */
export function partsFor(kind: StaticPrimitiveKind): readonly FigurePart[] {
  return FIGURE_PARTS[kind] ?? [];
}

/** Primitives that can be the subject of a puzzle. */
export function isPuzzleSubject(kind: StaticPrimitiveKind): boolean {
  return partsFor(kind).length >= 2;
}

/**
 * A hint for laying out the tray, as a fraction of the board.
 *
 * NOT the tap-target guarantee: that is `LAYOUT.touchMin`, an absolute 90pt,
 * applied in PuzzlePiece. A fraction of the board was tried first and failed —
 * a castle turret came to 78pt on an iPad, because 90pt is a fact about
 * fingers and not a proportion of anything on screen.
 */
export const MIN_PIECE_SHARE = 0.22;
