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
  /**
   * Snow. A detail colour like `lamp`, never a block's own fill.
   *
   * Off-white rather than pure white so it still reads as painted wood under
   * the same ink outline as everything else.
   */
  snow: '#F5F8FA',
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
// The rest, drawn by hand
// ---------------------------------------------------------------------------
//
// Each is the thing that country's own data already calls its landmark, cut
// into three blocks a 2-year-old can tell apart at a glance. The rules every
// one of them keeps, enforced by landmarks.test.ts:
//
//   - three blocks, never more at this age
//   - no two the same shape, so the ghost is never ambiguous
//   - hole centres well apart, so a drop is never a coin toss
//   - details painted ON a block, never handed over as extra pieces
//
// Where a building is symmetric — a palace with two wings — the cut is made
// asymmetric on purpose. Two identical wings would be two honest answers to
// one hole.

const BELGIAN_CASTLE: Landmark = {
  title: 'Build the castle',
  blocks: [
    {
      id: 'tower',
      path: 'M 12 100 L 12 46 L 6 46 L 26 18 L 46 46 L 40 46 L 40 100 Z',
      box: [6, 18, 40, 82],
      fill: BLOCK_FILLS.denim,
      details: [{ path: 'M 21 56 h 10 v 13 h -10 Z', fill: BLOCK_FILLS.lamp }],
      label: 'Tower',
    },
    {
      id: 'keep',
      path: 'M 40 56 L 40 46 L 50 46 L 50 56 L 62 56 L 62 46 L 72 46 L 72 56 L 90 56 L 90 100 L 40 100 Z',
      box: [40, 46, 50, 54],
      fill: BLOCK_FILLS.clay,
      details: [
        { path: 'M 47 66 h 11 v 13 h -11 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 74 66 h 11 v 13 h -11 Z', fill: BLOCK_FILLS.lamp },
      ],
      label: 'Keep',
    },
    {
      id: 'gate',
      path: 'M 52 100 L 52 88 Q 52 76 65 76 Q 78 76 78 88 L 78 100 Z',
      box: [52, 76, 26, 24],
      fill: BLOCK_FILLS.butter,
      label: 'Gate',
    },
  ],
};

const GERMAN_CASTLE: Landmark = {
  title: 'Build the castle',
  blocks: [
    {
      id: 'spire',
      path: 'M 30 100 L 30 40 L 22 40 L 40 6 L 58 40 L 50 40 L 50 100 Z',
      box: [22, 6, 36, 94],
      fill: BLOCK_FILLS.denim,
      details: [{ path: 'M 35 50 h 10 v 12 h -10 Z', fill: BLOCK_FILLS.lamp }],
      label: 'Tall tower',
    },
    {
      id: 'hall',
      path: 'M 56 60 L 56 50 L 66 50 L 66 60 L 78 60 L 78 50 L 88 50 L 88 100 L 56 100 Z',
      box: [56, 50, 32, 50],
      fill: BLOCK_FILLS.clay,
      details: [{ path: 'M 65 70 h 12 v 14 h -12 Z', fill: BLOCK_FILLS.lamp }],
      label: 'Hall',
    },
    {
      id: 'gate',
      path: 'M 4 100 L 4 78 Q 4 70 16 70 Q 28 70 28 78 L 28 100 Z',
      box: [4, 70, 24, 30],
      fill: BLOCK_FILLS.butter,
      label: 'Gate',
    },
  ],
};

const EIFFEL_TOWER: Landmark = {
  title: 'Build the tower',
  blocks: [
    {
      id: 'top',
      // WIDE ENOUGH TO SURVIVE ITS OWN OUTLINE. Drawn 16 units across first,
      // and with a 6-unit stroke on each edge there was almost no fill left:
      // it read as a dark lozenge rather than a red spire. Nothing narrower
      // than about four stroke widths keeps its colour.
      path: 'M 36 44 L 50 4 L 64 44 Z',
      box: [36, 4, 28, 40],
      fill: BLOCK_FILLS.clay,
      label: 'Top',
    },
    {
      id: 'middle',
      path: 'M 38 44 L 62 44 L 70 72 L 30 72 Z',
      box: [30, 44, 40, 28],
      fill: BLOCK_FILLS.butter,
      // The viewing platform, as one chunky band. Crossed lattice braces were
      // drawn here first and disappeared: at four units thick they were
      // thinner than the five-unit outline meant to define them, so the ink
      // ate them and left slivers of colour.
      details: [{ path: 'M 34 58 L 66 58 L 67 66 L 33 66 Z', fill: BLOCK_FILLS.clay }],
      label: 'Middle',
    },
    {
      id: 'legs',
      path: 'M 30 72 L 70 72 L 86 100 L 62 100 Q 50 82 38 100 L 14 100 Z',
      box: [14, 72, 72, 28],
      fill: BLOCK_FILLS.denim,
      label: 'Legs',
    },
  ],
};

const LONDON_BUS: Landmark = {
  title: 'Build the bus',
  blocks: [
    {
      id: 'top-deck',
      path: 'M 12 32 Q 12 22 24 22 L 84 22 Q 92 22 92 32 L 92 54 L 12 54 Z',
      box: [12, 22, 80, 32],
      fill: BLOCK_FILLS.clay,
      details: [
        { path: 'M 22 32 h 16 v 13 h -16 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 46 32 h 16 v 13 h -16 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 70 32 h 14 v 13 h -14 Z', fill: BLOCK_FILLS.lamp },
      ],
      label: 'Top deck',
    },
    {
      id: 'bottom-deck',
      path: 'M 12 54 L 92 54 L 92 82 L 12 82 Z',
      box: [12, 54, 80, 28],
      fill: BLOCK_FILLS.butter,
      details: [
        { path: 'M 22 60 h 18 v 15 h -18 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 66 60 h 18 v 15 h -18 Z', fill: BLOCK_FILLS.lamp },
      ],
      label: 'Bottom deck',
    },
    {
      id: 'wheels',
      path: 'M 14 82 L 90 82 L 90 92 Q 90 100 80 100 L 24 100 Q 14 100 14 92 Z',
      box: [14, 82, 76, 18],
      fill: BLOCK_FILLS.denim,
      // The wheels themselves, painted on. Without them the block was a plain
      // bar and the bus had nothing to stand on.
      details: [
        { path: 'M 20 90 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 68 90 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0 Z', fill: BLOCK_FILLS.lamp },
      ],
      label: 'Wheels',
    },
  ],
};

const LITTLE_MERMAID: Landmark = {
  title: 'Build the mermaid',
  blocks: [
    {
      id: 'body',
      // ONE CONTINUOUS SILHOUETTE, head and body together.
      //
      // Drawn as a separate circle for the head first, and the head vanished:
      // the brand outline is six units wide, and on a feature only eighteen
      // across it swallows almost the whole shape. Anything smaller than
      // roughly three stroke widths has to be part of a bigger outline, not a
      // shape of its own.
      path: 'M 50 6 Q 61 6 61 17 Q 61 23 57 27 L 61 31 L 65 54 L 35 54 L 39 31 L 43 27 Q 39 23 39 17 Q 39 6 50 6 Z',
      box: [35, 6, 30, 48],
      fill: BLOCK_FILLS.clay,
      // Hair over one shoulder. The face is left blank on purpose — a mascot
      // already owns the eyes in this app, and two faces compete.
      details: [
        { path: 'M 40 20 Q 35 34 40 46 L 47 44 Q 42 32 45 21 Z', fill: BLOCK_FILLS.butter },
      ],
      label: 'Head and body',
    },
    {
      id: 'tail',
      path: 'M 35 54 L 65 54 L 58 74 Q 72 80 78 94 Q 56 92 50 78 Q 44 92 22 94 Q 28 80 42 74 Z',
      box: [22, 54, 56, 40],
      fill: BLOCK_FILLS.sage,
      label: 'Tail',
    },
    {
      id: 'rock',
      path: 'M 10 100 L 20 86 L 80 86 L 90 100 Z',
      box: [10, 86, 80, 14],
      fill: BLOCK_FILLS.denim,
      label: 'Rock',
    },
  ],
};

const SWEDISH_COTTAGE: Landmark = {
  title: 'Build the cottage',
  blocks: [
    {
      id: 'roof',
      path: 'M 8 48 L 50 14 L 92 48 L 82 48 L 82 30 L 72 30 L 72 40 L 50 22 L 18 48 Z',
      box: [8, 14, 84, 34],
      fill: BLOCK_FILLS.denim,
      label: 'Roof',
    },
    {
      id: 'walls',
      path: 'M 14 48 L 86 48 L 86 100 L 14 100 Z',
      box: [14, 48, 72, 52],
      fill: BLOCK_FILLS.clay,
      details: [
        { path: 'M 24 58 h 16 v 15 h -16 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 60 58 h 16 v 15 h -16 Z', fill: BLOCK_FILLS.lamp },
      ],
      label: 'Walls',
    },
    {
      id: 'door',
      path: 'M 42 100 L 42 74 L 58 74 L 58 100 Z',
      box: [42, 74, 16, 26],
      fill: BLOCK_FILLS.butter,
      label: 'Door',
    },
  ],
};

const VIKING_SHIP: Landmark = {
  title: 'Build the ship',
  blocks: [
    {
      id: 'sail',
      // The mast comes down WITH the sail, so the two halves of the ship meet.
      // Drawn as a floating rectangle first, the sail hung in the air above a
      // boat it never touched.
      path: 'M 24 12 L 76 12 L 76 54 L 54 54 L 54 68 L 46 68 L 46 54 L 24 54 Z',
      box: [24, 12, 52, 56],
      fill: BLOCK_FILLS.clay,
      details: [
        { path: 'M 34 12 h 14 v 42 h -14 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 56 12 h 14 v 42 h -14 Z', fill: BLOCK_FILLS.lamp },
      ],
      label: 'Sail',
    },
    {
      id: 'hull',
      path: 'M 6 68 Q 50 60 94 68 L 84 92 Q 50 100 16 92 Z',
      box: [6, 60, 88, 40],
      fill: BLOCK_FILLS.butter,
      details: [
        { path: 'M 26 74 h 14 v 12 h -14 Z', fill: BLOCK_FILLS.clay },
        { path: 'M 60 74 h 14 v 12 h -14 Z', fill: BLOCK_FILLS.clay },
      ],
      label: 'Hull',
    },
    {
      id: 'prow',
      // A dragon head on its neck, and big enough to be one. At fourteen units
      // across it was thinner than its own outline and read as a splinter.
      path: 'M 60 68 L 60 46 Q 60 30 78 26 Q 96 22 98 40 L 84 42 Q 80 34 76 46 Q 74 58 76 68 Z',
      box: [60, 22, 38, 46],
      fill: BLOCK_FILLS.sage,
      label: 'Dragon head',
    },
  ],
};

const MATTERHORN: Landmark = {
  title: 'Build the mountain',
  blocks: [
    {
      id: 'peak',
      path: 'M 50 6 L 74 48 L 26 48 Z',
      box: [26, 6, 48, 42],
      fill: BLOCK_FILLS.denim,
      details: [
        { path: 'M 40 26 L 50 6 L 60 26 L 54 23 L 50 28 L 46 23 Z', fill: BLOCK_FILLS.snow },
      ],
      label: 'Peak',
    },
    {
      id: 'left-slope',
      path: 'M 26 48 L 54 48 L 40 100 L 2 100 Z',
      box: [2, 48, 52, 52],
      fill: BLOCK_FILLS.sage,
      label: 'Left slope',
    },
    {
      id: 'right-slope',
      path: 'M 54 48 L 74 48 L 98 100 L 40 100 Z',
      box: [40, 48, 58, 52],
      fill: BLOCK_FILLS.clay,
      label: 'Right slope',
    },
  ],
};

const AUSTRIAN_PALACE: Landmark = {
  title: 'Build the palace',
  blocks: [
    {
      id: 'centre',
      path: 'M 34 34 L 50 14 L 66 34 L 66 100 L 34 100 Z',
      box: [34, 14, 32, 86],
      fill: BLOCK_FILLS.butter,
      details: [{ path: 'M 43 44 h 14 v 15 h -14 Z', fill: BLOCK_FILLS.lamp }],
      label: 'Middle',
    },
    {
      id: 'left-wing',
      path: 'M 4 54 L 32 54 L 32 100 L 4 100 Z',
      box: [4, 54, 28, 46],
      fill: BLOCK_FILLS.clay,
      details: [{ path: 'M 12 64 h 12 v 14 h -12 Z', fill: BLOCK_FILLS.lamp }],
      label: 'Left wing',
    },
    {
      id: 'right-wing',
      path: 'M 68 54 L 80 54 L 80 40 L 90 40 L 90 54 L 96 54 L 96 100 L 68 100 Z',
      box: [68, 40, 28, 60],
      fill: BLOCK_FILLS.denim,
      details: [{ path: 'M 76 66 h 12 v 14 h -12 Z', fill: BLOCK_FILLS.lamp }],
      label: 'Right wing',
    },
  ],
};

const COLOSSEUM: Landmark = {
  title: 'Build the arches',
  blocks: [
    {
      id: 'top',
      // Broken away on the right, the way the real one is, and curved along
      // the top so the ring reads as round rather than as a stacked slab.
      path: 'M 16 46 L 16 30 Q 40 24 58 26 L 58 36 L 76 38 L 76 46 Z',
      box: [16, 24, 60, 22],
      fill: BLOCK_FILLS.butter,
      // ARCHES, not squares. Square windows made the whole thing read as a
      // tiered cake; a round-topped opening says Roman on sight.
      details: [
        { path: 'M 24 44 L 24 37 Q 24 32 30 32 Q 36 32 36 37 L 36 44 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 42 44 L 42 36 Q 42 31 48 31 Q 54 31 54 36 L 54 44 Z', fill: BLOCK_FILLS.lamp },
      ],
      label: 'Top ring',
    },
    {
      id: 'middle',
      path: 'M 10 46 L 90 46 L 92 72 L 8 72 Z',
      box: [8, 46, 84, 26],
      fill: BLOCK_FILLS.clay,
      details: [
        { path: 'M 18 70 L 18 60 Q 18 54 25 54 Q 32 54 32 60 L 32 70 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 43 70 L 43 60 Q 43 54 50 54 Q 57 54 57 60 L 57 70 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 68 70 L 68 60 Q 68 54 75 54 Q 82 54 82 60 L 82 70 Z', fill: BLOCK_FILLS.lamp },
      ],
      label: 'Middle ring',
    },
    {
      id: 'base',
      path: 'M 8 72 L 92 72 L 94 92 Q 94 100 84 100 L 16 100 Q 6 100 6 92 Z',
      box: [6, 72, 88, 28],
      fill: BLOCK_FILLS.denim,
      details: [
        { path: 'M 20 98 L 20 86 Q 20 79 28 79 Q 36 79 36 86 L 36 98 Z', fill: BLOCK_FILLS.lamp },
        { path: 'M 64 98 L 64 86 Q 64 79 72 79 Q 80 79 80 86 L 80 98 Z', fill: BLOCK_FILLS.lamp },
      ],
      label: 'Bottom ring',
    },
  ],
};

/** Hand-drawn, one per country. Everything here is somebody's real landmark. */
const BY_COUNTRY: Record<string, Landmark> = {
  nl: CANAL_HOUSE,
  be: BELGIAN_CASTLE,
  de: GERMAN_CASTLE,
  fr: EIFFEL_TOWER,
  gb: LONDON_BUS,
  dk: LITTLE_MERMAID,
  se: SWEDISH_COTTAGE,
  no: VIKING_SHIP,
  ch: MATTERHORN,
  at: AUSTRIAN_PALACE,
  it: COLOSSEUM,
};

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

/**
 * The safety net, for a country that has no drawing of its own yet.
 *
 * Every one of the eleven is hand-drawn now, so nothing reaches this in
 * practice. It stays because a twelfth country added tomorrow should get a
 * playable board rather than an empty one — a cut derived from the scene
 * primitive it already uses, repainted in the soft palette.
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
 * A country's own drawing wins; the primitive-derived cut is only a fallback
 * for a country nobody has drawn yet.
 */
export function landmarkFor(
  countryCode: string,
  kind: StaticPrimitiveKind,
  variant?: string,
): Landmark | null {
  const drawn = BY_COUNTRY[countryCode];
  if (drawn) return drawn;
  if (variant && DERIVED[`${kind}:${variant}`]) return DERIVED[`${kind}:${variant}`];
  return DERIVED[kind] ?? null;
}

/** Every landmark defined, for the tests to sweep. */
export const ALL_LANDMARKS: Record<string, Landmark> = { ...BY_COUNTRY, ...DERIVED };

/** The hand-drawn ones, keyed by country. */
export const HAND_DRAWN: Record<string, Landmark> = BY_COUNTRY;

/** How near a piece's centre must land, as a share of the board's size. */
export const SNAP_SHARE = 0.18;
