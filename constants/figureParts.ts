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
// EACH PART HAS ITS OWN FLAT COLOUR, and that is the instruction.
//
// Shape alone asks a 2-year-old to compare two silhouettes and decide whether
// one would fit inside the other, which is a genuinely hard spatial judgement
// at that age. A colour is not a judgement — the child sees a red piece and a
// red hole and fills it in. The shapes still differ, so the cut is still true
// to the drawing, but nothing depends on reading them.
//
// It also removes a whole class of defect for good. Pieces used to be crops of
// the primitive's artwork, which meant every cut had to agree with geometry in
// another file, and when it did not the child was handed an empty outline. A
// flat colour cannot disagree with anything.
//
// Every part carries an explicit polygon rather than being derived, because
// the boundary is a drawing decision: where a castle's turret ends and its keep
// begins is a judgement about the picture, not a computation.
//
// THE PATHS COME FROM primitives.tsx, NOT FROM AN IDEA OF THE SHAPE.
//
// The first version of this table was authored as an idealised anatomy in the
// 100x100 box, without checking where each primitive actually draws. The
// sockets looked right — they are drawn from these same paths — but the
// artwork behind them was somewhere else entirely, so a piece cropped to a
// region the drawing did not occupy came out EMPTY, and pieces that did have
// artwork showed the wrong fragment of it. It looked plausible in every unit
// test and was obvious in a screenshot.
//
// So each path here traces geometry that exists in primitives.tsx, and parts
// are keyed by VARIANT as well as kind, because a variant is not a detail: an
// Eiffel-style lattice tower and a plain clock tower share nothing but a name.
// e2e/puzzle-art.spec.ts renders each piece and fails if it is mostly empty.

import type { StaticPrimitiveKind } from '../components/scene/primitives';

export type FigurePart = {
  id: string;
  /**
   * The part's own colour, and the whole of how a child knows where it goes.
   *
   * Assigned by position from PART_COLOURS, so two parts of the same picture
   * can never share one. See the note above on why colour carries this.
   */
  colour: string;
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
/**
 * Cuts, keyed by `kind` or by `kind:variant` where the variant redraws the
 * subject. `partsFor` prefers the variant entry and falls back to the kind.
 *
 * Counts vary because subjects vary: a forest is naturally three trees, a
 * bridge is a span and its approach. Forcing every picture into the same
 * number of pieces would mean cutting some against their own shape.
 */
export const FIGURE_PARTS: Record<string, readonly Omit<FigurePart, 'colour'>[]> = {
  // Body: M 2 100 L 50 8 L 98 100 Z. The flanks are cut on a SLANT so they are
  // not mirror images of each other.
  mountain: [
    { id: 'peak', path: 'M 50 8 L 74 54 L 26 54 Z', box: [26, 8, 48, 46], label: 'Peak' },
    {
      id: 'left-slope',
      path: 'M 26 54 L 52 54 L 40 100 L 2 100 Z',
      box: [2, 54, 50, 46],
      label: 'Left slope',
    },
    {
      id: 'right-slope',
      path: 'M 52 54 L 74 54 L 98 100 L 40 100 Z',
      box: [40, 54, 58, 46],
      label: 'Right slope',
    },
  ],

  // Lattice tower: body M 22 100 L 40 26 L 60 26 L 78 100 Z, spire M 40 26 L 50 6 L 60 26 Z.
  'tower:lattice': [
    { id: 'spire', path: 'M 40 26 L 50 6 L 60 26 Z', box: [40, 6, 20, 20], label: 'Top' },
    {
      id: 'middle',
      path: 'M 40 26 L 60 26 L 69 63 L 31 63 Z',
      box: [31, 26, 38, 37],
      label: 'Middle',
    },
    {
      id: 'legs',
      path: 'M 31 63 L 69 63 L 78 100 L 22 100 Z',
      box: [22, 63, 56, 37],
      label: 'Legs',
    },
  ],

  // Capped towers: Rect 36,30,28,70 under a cap M 32 30 L 50 2 L 68 30 Z.
  'tower:spire': [
    { id: 'cap', path: 'M 32 30 L 50 2 L 68 30 Z', box: [32, 2, 36, 28], label: 'Roof' },
    {
      id: 'middle',
      path: 'M 36 30 L 64 30 L 64 66 L 36 66 Z',
      box: [36, 30, 28, 36],
      label: 'Middle',
    },
    {
      id: 'base',
      path: 'M 36 66 L 64 66 L 64 100 L 36 100 Z',
      box: [36, 66, 28, 34],
      label: 'Base',
    },
  ],

  // The clock tower's body starts higher (Rect 36,22,28,78) but wears the same
  // cap, so the cut is the same and the extra strip sits behind the roof.
  'tower:clock': [
    { id: 'cap', path: 'M 32 30 L 50 2 L 68 30 Z', box: [32, 2, 36, 28], label: 'Roof' },
    {
      id: 'middle',
      path: 'M 36 30 L 64 30 L 64 66 L 36 66 Z',
      box: [36, 30, 28, 36],
      label: 'Middle',
    },
    {
      id: 'base',
      path: 'M 36 66 L 64 66 L 64 100 L 36 100 Z',
      box: [36, 66, 28, 34],
      label: 'Base',
    },
  ],

  // Plain tower (also the windmill's tower): one Rect 36,30,28,70, so the cut
  // is three bands of DIFFERENT depths — equal bands would be equal shapes.
  tower: [
    {
      id: 'top',
      path: 'M 36 30 L 64 30 L 64 50 L 36 50 Z',
      box: [36, 30, 28, 20],
      label: 'Top',
    },
    {
      id: 'middle',
      path: 'M 36 50 L 64 50 L 64 74 L 36 74 Z',
      box: [36, 50, 28, 24],
      label: 'Middle',
    },
    {
      id: 'base',
      path: 'M 36 74 L 64 74 L 64 100 L 36 100 Z',
      box: [36, 74, 28, 26],
      label: 'Base',
    },
  ],

  // Keep Rect 22,46,56,54 with crenellations to y=38 and turrets 10/70,34,20,66.
  //
  // The building is symmetric, and a symmetric cut would hand the child two
  // identical turrets — the exact ambiguity this design removes. So the right
  // turret is cut together with the base it stands on: still a mass of the
  // drawing, and unmistakably not the left one.
  castle: [
    {
      id: 'left-turret',
      path: 'M 10 34 L 30 34 L 30 100 L 10 100 Z',
      box: [10, 34, 20, 66],
      label: 'Left tower',
    },
    {
      id: 'keep',
      path: 'M 22 38 L 32 38 L 32 46 L 42 46 L 42 38 L 52 38 L 52 46 L 62 46 L 62 38 L 72 38 L 72 46 L 78 46 L 78 58 L 22 58 Z',
      box: [22, 38, 56, 20],
      label: 'Keep',
    },
    {
      // The cut sits at y=58 rather than lower so that this part's centre and
      // the keep's stay far enough apart to aim at separately — an L-shaped
      // part is measured by its box, and a deeper cut put the two centres
      // inside one snap radius of each other.
      id: 'base',
      path: 'M 22 58 L 70 58 L 70 34 L 90 34 L 90 100 L 22 100 Z',
      box: [22, 34, 68, 66],
      label: 'Base and right tower',
    },
  ],

  // Spired castle: turret spires M 8 34 L 20 8 L 32 34 and M 68 34 L 80 8 L 92 34,
  // plus a central roof M 20 46 L 50 18 L 80 46.
  'castle:spired': [
    {
      id: 'left-tower',
      path: 'M 8 34 L 20 8 L 32 34 L 30 34 L 30 100 L 10 100 L 10 34 Z',
      box: [8, 8, 24, 92],
      label: 'Left tower',
    },
    {
      id: 'roof',
      path: 'M 20 46 L 50 18 L 80 46 Z',
      box: [20, 18, 60, 28],
      label: 'Roof',
    },
    {
      id: 'right-tower',
      path: 'M 68 34 L 80 8 L 92 34 L 90 34 L 90 100 L 22 100 L 22 46 L 70 46 L 70 34 Z',
      box: [22, 8, 70, 92],
      label: 'Right tower and hall',
    },
  ],

  // Drum Rect 24,58,52,42 under cupola M 24 58 A 26 26 0 0 1 76 58 Z.
  dome: [
    {
      id: 'cupola',
      path: 'M 24 58 A 26 26 0 0 1 76 58 Z',
      box: [24, 32, 52, 26],
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
      path: 'M 48 58 L 76 58 L 76 100 L 48 100 Z',
      box: [48, 58, 28, 42],
      label: 'Right wall',
    },
  ],

  // Body Rect 18,30,64,70 under lintel Rect 14,22,72,10.
  arch: [
    {
      id: 'lintel',
      path: 'M 14 22 L 86 22 L 86 32 L 14 32 Z',
      box: [14, 22, 72, 10],
      label: 'Top',
    },
    {
      id: 'left-pier',
      path: 'M 18 32 L 46 32 L 46 100 L 18 100 Z',
      box: [18, 32, 28, 68],
      label: 'Left side',
    },
    {
      id: 'right-pier',
      path: 'M 46 32 L 82 32 L 82 100 L 46 100 Z',
      box: [46, 32, 36, 68],
      label: 'Right side',
    },
  ],

  // Facade Rect 14,34,72,66 under entablature Rect 10,26,80,10.
  columns: [
    {
      id: 'entablature',
      path: 'M 10 26 L 90 26 L 90 36 L 10 36 Z',
      box: [10, 26, 80, 10],
      label: 'Roof',
    },
    {
      id: 'left-arcade',
      path: 'M 14 36 L 44 36 L 44 100 L 14 100 Z',
      box: [14, 36, 30, 64],
      label: 'Left arches',
    },
    {
      id: 'right-arcade',
      path: 'M 44 36 L 86 36 L 86 100 L 44 100 Z',
      box: [44, 36, 42, 64],
      label: 'Right arches',
    },
  ],

  // Body Rect 18,44,64,56 under a gable that the variant redraws.
  house: [
    { id: 'roof', path: 'M 16 44 L 50 12 L 84 44 Z', box: [16, 12, 68, 32], label: 'Roof' },
    {
      id: 'upper-floor',
      path: 'M 18 44 L 82 44 L 82 74 L 18 74 Z',
      box: [18, 44, 64, 30],
      label: 'Upstairs',
    },
    {
      id: 'ground-floor',
      path: 'M 18 74 L 82 74 L 82 100 L 18 100 Z',
      box: [18, 74, 64, 26],
      label: 'Downstairs',
    },
  ],

  'house:stepped': [
    {
      id: 'roof',
      path: 'M 16 44 L 16 34 L 30 34 L 30 24 L 44 24 L 44 14 L 56 14 L 56 24 L 70 24 L 70 34 L 84 34 L 84 44 Z',
      box: [16, 14, 68, 30],
      label: 'Roof',
    },
    {
      id: 'upper-floor',
      path: 'M 18 44 L 82 44 L 82 74 L 18 74 Z',
      box: [18, 44, 64, 30],
      label: 'Upstairs',
    },
    {
      id: 'ground-floor',
      path: 'M 18 74 L 82 74 L 82 100 L 18 100 Z',
      box: [18, 74, 64, 26],
      label: 'Downstairs',
    },
  ],

  'house:flat': [
    {
      id: 'roof',
      path: 'M 14 44 L 14 36 L 86 36 L 86 44 Z',
      box: [14, 36, 72, 8],
      label: 'Roof',
    },
    {
      id: 'upper-floor',
      path: 'M 18 44 L 82 44 L 82 74 L 18 74 Z',
      box: [18, 44, 64, 30],
      label: 'Upstairs',
    },
    {
      id: 'ground-floor',
      path: 'M 18 74 L 82 74 L 82 100 L 18 100 Z',
      box: [18, 74, 64, 26],
      label: 'Downstairs',
    },
  ],

  // The deck is one curved band, M 4 76 Q 50 42 96 76 L 96 84 Q 50 50 4 84 Z.
  // Cut off-centre, so the two halves are not mirror images. The piers are
  // strokes with no fill, so they are not pieces.
  bridge: [
    {
      id: 'long-span',
      path: 'M 4 76 Q 34 55 64 60 L 64 68 Q 34 63 4 84 Z',
      box: [4, 55, 60, 29],
      label: 'Long side',
    },
    {
      id: 'short-span',
      path: 'M 64 60 Q 82 63 96 76 L 96 84 Q 82 71 64 68 Z',
      box: [64, 60, 32, 24],
      label: 'Short side',
    },
  ],

  // A forest is already three trees, and they are three different heights.
  forest: [
    {
      id: 'small-tree',
      path: 'M 22 100 L 8 62 L 16 62 L 22 40 L 28 62 L 36 62 Z',
      box: [8, 40, 28, 60],
      label: 'Small tree',
    },
    {
      id: 'tall-tree',
      path: 'M 52 100 L 34 52 L 44 52 L 52 22 L 60 52 L 70 52 Z',
      box: [34, 22, 36, 78],
      label: 'Tall tree',
    },
    {
      id: 'other-tree',
      path: 'M 80 100 L 66 64 L 74 64 L 80 44 L 86 64 L 94 64 Z',
      box: [66, 44, 28, 56],
      label: 'Other tree',
    },
  ],

  'forest:cypress': [
    {
      id: 'small-tree',
      path: 'M 26 100 Q 18 52 26 26 Q 34 52 26 100 Z',
      box: [18, 26, 16, 74],
      label: 'Small tree',
    },
    {
      id: 'tall-tree',
      path: 'M 50 100 Q 41 44 50 14 Q 59 44 50 100 Z',
      box: [41, 14, 18, 86],
      label: 'Tall tree',
    },
    {
      id: 'other-tree',
      path: 'M 74 100 Q 66 56 74 32 Q 82 56 74 100 Z',
      box: [66, 32, 16, 68],
      label: 'Other tree',
    },
  ],

  // A leaning tower is drawn ROTATED about its base, so a crop of the upright
  // box would take the wrong pixels. Rather than fake a cut that does not fit
  // the drawing, it is simply not a puzzle subject.
  'tower:leaning': [],

  // Ground treatments are never the puzzle's subject; they stay on the board.
  hill: [],
  water: [],
  field: [],
};

/**
 * The colours a picture's parts are painted, in order.
 *
 * CHOSEN BY MEASUREMENT, NOT BY EYE, and the difference mattered.
 *
 * Colour is this game's instruction, so "these are obviously different" is a
 * claim about whether the game is playable at all — and for the ~8% of boys
 * with a red-green deficiency, a palette that looks vivid and distinct to the
 * author can be two shades of one thing. The first palette here was picked by
 * eye and measured catastrophically: under protanopia a red piece sat 2.0
 * (CIEDE2000) from the YELLOW socket and 18.5 from its own. The child would
 * have been asked to match colours they cannot tell apart.
 *
 * These are the output of a search that maximised the worst-case separation
 * across normal, protan, deutan and tritan vision — for every piece against
 * every other piece AND against every other piece's socket — then softened
 * under a hard floor. Hand-tuning them afterwards for prettiness dropped the
 * worst case from 24 to 12, so they are left as the search returned them.
 *
 * figureParts.test.ts pins the floor. Do not adjust these by eye.
 */
export const PART_COLOURS = [
  '#E21266', // raspberry
  '#73EDE3', // mint
  '#1412CA', // deep blue
  '#EDEB0D', // yellow
  '#A068F3', // violet
] as const;

/**
 * The table above with a colour attached to each part by position.
 *
 * Assigned rather than hand-authored: by construction no two parts of the same
 * picture can be given the same colour, and that is the one property the whole
 * design rests on.
 */
const COLOURED: Record<string, readonly FigurePart[]> = Object.fromEntries(
  Object.entries(FIGURE_PARTS).map(([key, parts]) => [
    key,
    parts.map((part, i) => ({ ...part, colour: PART_COLOURS[i % PART_COLOURS.length] })),
  ]),
);

/**
 * The parts for a drawing, or an empty list if it is not a subject.
 *
 * The variant is looked up first: a lattice tower and a clock tower are the
 * same `kind` and share no geometry at all, so cutting them the same way put
 * empty pieces in a child's hands.
 */
export function partsFor(
  kind: StaticPrimitiveKind,
  variant?: string,
): readonly FigurePart[] {
  const key = variant && FIGURE_PARTS[`${kind}:${variant}`] ? `${kind}:${variant}` : kind;
  return COLOURED[key] ?? [];
}

/** Drawings that can be the subject of a puzzle. */
export function isPuzzleSubject(kind: StaticPrimitiveKind, variant?: string): boolean {
  return partsFor(kind, variant).length >= 2;
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
