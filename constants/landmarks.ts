// constants/landmarks.ts
// What each country's block puzzle builds.
//
// THE DESIGN
//
// A landmark is a small stack of soft toy blocks that add up to a building the
// child can name. The board shows the finished shape as a GHOST — filled pale
// and outlined in dashes — so the child is never guessing what goes where:
// they see a triangle-shaped hole and they have a triangle in their hands.
//
// That is a different mechanism from the version before it, and a better one
// for this age. Colour used to be the whole instruction, which meant the
// palette had to be measured against colour blindness before the game was
// playable at all. Now SHAPE carries it — a roof only looks like the roof hole
// — and colour is what makes the thing cosy rather than what makes it solvable.
//
// A NEW COUNTRY IS DATA, NOT CODE: a silhouette, its pieces, and their fills.
// Nothing here is drawn by hand anywhere else.

import { FIGURE_PARTS } from './figureParts';
import type { StaticPrimitiveKind } from '../components/scene/primitives';

/** Everything is drawn in a 100x100 box, the same convention as primitives. */
export type Block = {
  id: string;
  /** Outline in the 100x100 box. Also the shape of its hole in the ghost. */
  path: string;
  /** Bounding box [x, y, w, h] — declared, never parsed out of the path. */
  box: readonly [number, number, number, number];
  fill: string;
  /**
   * Painted details: windows, a doorknob. Drawn inside the block, never as
   * separate pieces — a 2-year-old gets three things to move, not seven.
   */
  details?: readonly { path: string; fill: string }[];
  /** Parent-facing. The child never sees text. */
  label: string;
};

export type Landmark = {
  /** Shown small on the board, for the adult sitting alongside. */
  title: string;
  blocks: readonly Block[];
};

/** The brand outline every block carries. */
export const BLOCK_INK = '#33241C';

/** The ghost target drawn on the board's cream panel. */
export const GHOST = {
  fill: '#DFC99C',
  fillOpacity: 0.55,
  stroke: '#B89A6A',
  dash: '9 9',
} as const;

/**
 * The board itself: a wooden tray, like the one Shape Fit uses.
 *
 * A plain tan square had no identity — it read as a background rather than as
 * an object with holes in it. Wood is a thing every toddler has already held.
 */
export const BOARD = {
  frameFrom: '#C79A5B',
  frameTo: '#B07E3D',
  border: '#9A6A2E',
  panelFrom: '#F3E7CF',
  panelTo: '#EAD9B6',
  title: '#9A7233',
} as const;

/**
 * Soft toy-block fills.
 *
 * Replaces a set of neon hues — hot pink, cyan, electric blue — that were
 * chosen when colour had to do all the work of telling pieces apart. They did
 * that job and clashed with everything else in the app. These are painted-wood
 * colours from the same family as the mascot and the boards.
 */
export const BLOCK_FILLS = {
  clay: '#CD7468',
  butter: '#E4B95C',
  denim: '#5B93D6',
  sage: '#7FA968',
  plum: '#A67BB5',
  /**
   * Lamplight, for painted details only — windows and a doorknob.
   *
   * A shade brighter than the roof's butter on purpose: a window has to read
   * as lit from inside rather than as more roof.
   */
  lamp: '#F2C24E',
} as const;

// ---------------------------------------------------------------------------
// The Netherlands: a canal house
// ---------------------------------------------------------------------------

const CANAL_HOUSE: Landmark = {
  title: 'Build the house',
  blocks: [
    {
      id: 'roof',
      path: 'M 12 46 L 50 10 L 88 46 Z',
      box: [12, 10, 76, 36],
      fill: BLOCK_FILLS.butter,
      label: 'Roof',
    },
    {
      id: 'body',
      // Rounded at the shoulders only, so it sits flat under the roof.
      path: 'M 18 46 L 82 46 L 82 94 Q 82 100 76 100 L 24 100 Q 18 100 18 94 Z',
      box: [18, 46, 64, 54],
      fill: BLOCK_FILLS.clay,
      details: [
        { path: 'M 27 56 h 17 v 15 h -17 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 56 56 h 17 v 15 h -17 Z', fill: BLOCK_FILLS.lamp },
      ],
      label: 'Walls',
    },
    {
      id: 'door',
      // An arched top, so it cannot be mistaken for a window or the body.
      path: 'M 41 100 L 41 84 Q 41 74 50 74 Q 59 74 59 84 L 59 100 Z',
      box: [41, 74, 18, 26],
      fill: BLOCK_FILLS.denim,
      details: [{ path: 'M 54 89 a 2.4 2.4 0 1 0 0.01 0 Z', fill: BLOCK_FILLS.lamp }],
      label: 'Door',
    },
  ],
};

// ---------------------------------------------------------------------------
// Everywhere else
// ---------------------------------------------------------------------------

/**
 * The remaining countries, built from the scene primitives they already use.
 *
 * ONLY THE NETHERLANDS IS HAND-DRAWN so far. The other ten are playable rather
 * than beautiful: their cuts come from constants/figureParts.ts, which follows
 * each primitive's real geometry, and they are repainted in the soft palette
 * above. That keeps every country working — they were all playable before this
 * change and breaking ten of them to redesign one would not be a trade — while
 * making it obvious which ones still want a hand.
 */
const FILL_ORDER = [
  BLOCK_FILLS.clay,
  BLOCK_FILLS.butter,
  BLOCK_FILLS.denim,
  BLOCK_FILLS.sage,
  BLOCK_FILLS.plum,
] as const;

function fromPrimitive(key: string, title: string): Landmark {
  const parts = FIGURE_PARTS[key] ?? [];
  return {
    title,
    blocks: parts.map((part, i) => ({
      id: part.id,
      path: part.path,
      box: part.box,
      fill: FILL_ORDER[i % FILL_ORDER.length],
      label: part.label,
    })),
  };
}

/**
 * Keyed exactly like FIGURE_PARTS — `kind` or `kind:variant` — because a
 * variant is not a detail: a lattice tower and a clock tower share nothing.
 */
const DERIVED: Record<string, Landmark> = {
  mountain: fromPrimitive('mountain', 'Build the mountain'),
  tower: fromPrimitive('tower', 'Build the tower'),
  'tower:lattice': fromPrimitive('tower:lattice', 'Build the tower'),
  'tower:spire': fromPrimitive('tower:spire', 'Build the tower'),
  'tower:clock': fromPrimitive('tower:clock', 'Build the clock tower'),
  castle: fromPrimitive('castle', 'Build the castle'),
  'castle:spired': fromPrimitive('castle:spired', 'Build the castle'),
  dome: fromPrimitive('dome', 'Build the dome'),
  arch: fromPrimitive('arch', 'Build the arch'),
  columns: fromPrimitive('columns', 'Build the arches'),
  house: fromPrimitive('house', 'Build the house'),
  'house:stepped': fromPrimitive('house:stepped', 'Build the house'),
  'house:flat': fromPrimitive('house:flat', 'Build the house'),
  bridge: fromPrimitive('bridge', 'Build the bridge'),
  forest: fromPrimitive('forest', 'Build the trees'),
  'forest:cypress': fromPrimitive('forest:cypress', 'Build the trees'),
};

/**
 * The landmark for a country.
 *
 * The Netherlands is special-cased because it is the one drawn to the spec;
 * everything else falls back to its primitive's cut.
 */
export function landmarkFor(
  countryCode: string,
  kind: StaticPrimitiveKind,
  variant?: string,
): Landmark | null {
  if (countryCode === 'nl') return CANAL_HOUSE;
  if (variant && DERIVED[`${kind}:${variant}`]) return DERIVED[`${kind}:${variant}`];
  return DERIVED[kind] ?? null;
}

/** Every landmark defined, for the tests to sweep. */
export const ALL_LANDMARKS: Record<string, Landmark> = { nl: CANAL_HOUSE, ...DERIVED };

/** How near a piece's centre must land, as a share of the board's size. */
export const SNAP_SHARE = 0.18;
