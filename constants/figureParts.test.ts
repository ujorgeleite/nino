// constants/figureParts.test.ts
// The cut has to be a real cut: parts that tile the drawing, do not overlap,
// and are each big enough for a 2-year-old to grab.
//
// These read like geometry but every one is a play claim. Overlapping parts
// mean two sockets accept the same drop; a tiny part means a piece nobody can
// pick up.

import {
  FIGURE_PARTS,
  MIN_PIECE_SHARE,
  PART_COLOURS,
  isPuzzleSubject,
  partsFor,
} from './figureParts';
import { VISIONS, distanceAs } from '../test-utils/colour';
import { COUNTRIES } from './countries';
import type { StaticPrimitiveKind } from '../components/scene/primitives';

type Box = readonly [number, number, number, number];

const area = (b: Box) => b[2] * b[3];

const SUBJECTS = (Object.keys(FIGURE_PARTS) as StaticPrimitiveKind[]).filter((k) =>
  isPuzzleSubject(k),
);

describe('the cut', () => {
  it('has subjects to cut', () => {
    expect(SUBJECTS.length).toBeGreaterThanOrEqual(8);
  });

  it.each(SUBJECTS)('%s comes apart into a few graspable parts', (kind) => {
    const parts = partsFor(kind);
    // Two to five. Two is the gentlest puzzle there is and some subjects have
    // exactly two masses — a bridge is a long span and a short one, and
    // inventing a third piece would mean cutting through the drawing to hit a
    // number. Six is a wall of fragments at this age.
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts.length).toBeLessThanOrEqual(5);
  });

  it.each(SUBJECTS)('%s gives every part a unique id and a label', (kind) => {
    const parts = partsFor(kind);
    expect(new Set(parts.map((p) => p.id)).size).toBe(parts.length);
    for (const p of parts) expect(p.label.length).toBeGreaterThan(2);
  });

  it.each(SUBJECTS)('%s keeps every part inside the drawing box', (kind) => {
    const outside = partsFor(kind)
      .filter((p) => {
        const [x, y, w, h] = p.box;
        return x < 0 || y < 0 || x + w > 100 || y + h > 100;
      })
      .map((p) => p.id);
    expect(outside).toEqual([]);
  });

  it.each(SUBJECTS)('%s keeps its sockets far enough apart to aim at', (kind) => {
    // WHAT ACTUALLY DECIDES A DROP is the distance from the finger to a
    // socket's CENTRE (usePuzzle.tryPlace, PUZZLE_SNAP_RADIUS) — so that is
    // what this measures.
    //
    // It used to compare bounding-box overlap, which quietly failed the moment
    // a part stopped being a rectangle: the castle's base wraps around its
    // right tower, so its box overlaps the keep's enormously while the two
    // shapes do not touch at all. The box was never the thing that mattered.
    const parts = partsFor(kind);
    const centre = (b: Box) => ({ x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 });
    const tooClose: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = centre(parts[i].box);
        const b = centre(parts[j].box);
        const gap = Math.hypot(a.x - b.x, a.y - b.y);
        // 18 of 100 units. At the smallest board this app renders, that is
        // comfortably wider than the snap radius.
        if (gap < 18) tooClose.push(`${parts[i].id}/${parts[j].id} ${gap.toFixed(1)}`);
      }
    }
    expect(tooClose).toEqual([]);
  });

  it.each(SUBJECTS)('%s covers a real share of the drawing', (kind) => {
    // Parts that cover almost nothing would leave a ghost with a few chips
    // taken out of it, not a picture being assembled.
    //
    // The floor is low because a subject may legitimately be narrow: a plain
    // tower is a 28-wide column, and its parts cover the whole of it while
    // occupying under a fifth of the 100x100 box.
    const total = partsFor(kind).reduce((sum, p) => sum + area(p.box), 0);
    expect(total).toBeGreaterThan(1500); // of a 10 000 unit box
  });

  it.each(SUBJECTS)('%s has every part path start with a move', (kind) => {
    for (const p of partsFor(kind)) {
      expect(p.path.trim().startsWith('M ')).toBe(true);
      expect(p.path.trim().endsWith('Z')).toBe(true);
    }
  });

  it('leaves ground treatments uncut — they are scenery, not the subject', () => {
    expect(partsFor('water')).toHaveLength(0);
    expect(partsFor('hill')).toHaveLength(0);
    expect(partsFor('field')).toHaveLength(0);
    expect(isPuzzleSubject('water')).toBe(false);
  });

  it('gives EVERY country something to assemble', () => {
    // A country whose scene has no cuttable subject would open an empty game.
    const barren = COUNTRIES.filter(
      (c) =>
        !c.scene.some((p) => {
          const kind = (p.kind === 'windmill' ? 'tower' : p.kind) as StaticPrimitiveKind;
          return isPuzzleSubject(kind);
        }),
    ).map((c) => c.code);
    expect(barren).toEqual([]);
  });

  it('sets a touch floor big enough to matter', () => {
    // A part can be a quarter of the drawing's height; the hit box is sized
    // from this instead, so no piece is too small to pick up.
    expect(MIN_PIECE_SHARE).toBeGreaterThan(0.15);
  });
});

describe('every part of a picture has its own shape', () => {
  // WHY THIS IS A TEST AND NOT A REVIEW NOTE
  //
  // The first cut split symmetric subjects down the middle: a castle's two
  // turrets were the same rectangle, a mountain's two slopes were mirror
  // images. That silently undoes the whole design — a child who picks up a
  // turret cannot tell from its shape which side it belongs to, so shape stops
  // being information and the piece becomes a guess.
  //
  // Symmetry is the natural thing to draw, so it will be drawn again. This
  // catches it.

  /** The path's points, moved to the origin so position never masks a match. */
  function normalize(path: string): string {
    const nums = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const pts: [number, number][] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    const minX = Math.min(...pts.map((p) => p[0]));
    const minY = Math.min(...pts.map((p) => p[1]));
    return pts.map(([x, y]) => `${x - minX},${y - minY}`).join(' ');
  }

  /** The same outline flipped left-to-right. */
  function mirrored(path: string): string {
    const nums = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const pts: [number, number][] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    const maxX = Math.max(...pts.map((p) => p[0]));
    const minY = Math.min(...pts.map((p) => p[1]));
    const flipped = pts.map(([x, y]): [number, number] => [maxX - x, y - minY]);
    const minX = Math.min(...flipped.map((p) => p[0]));
    return flipped.map(([x, y]) => `${x - minX},${y}`).join(' ');
  }

  for (const [kind, parts] of Object.entries(FIGURE_PARTS)) {
    if (parts.length < 2) continue;

    it(`${kind}: no two parts share an outline`, () => {
      const seen = new Map<string, string>();
      for (const part of parts) {
        const key = normalize(part.path);
        const twin = seen.get(key);
        expect(twin ?? null).toBeNull();
        seen.set(key, part.id);
      }
    });

    it(`${kind}: no part is another part mirrored`, () => {
      // A mirrored twin is just as ambiguous to a 2-year-old as an identical
      // one: both read as "that shape", and either side looks right.
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const clash =
            normalize(parts[i].path) === mirrored(parts[j].path)
              ? `${parts[i].id} mirrors ${parts[j].id}`
              : null;
          expect(clash).toBeNull();
        }
      }
    });

    it(`${kind}: no two parts share a bounding box`, () => {
      // Equal boxes mean equal-sized pieces in the tray, which is the same
      // ambiguity arriving by a different route.
      const boxes = parts.map((p) => `${p.box[2]}x${p.box[3]}`);
      expect(new Set(boxes).size).toBe(boxes.length);
    });
  }
});

describe('the colours a child has to tell apart', () => {
  // THE BUG THIS PINS DOWN made the game unplayable for a colour-blind child
  // while looking perfectly fine to everyone who tested it.
  //
  // Colour is this game's instruction, so a pair of piece colours that a
  // dichromat cannot separate is not a polish issue — it is the child being
  // asked to match two things that look identical to them. The original
  // palette put a red piece 2.0 (CIEDE2000) from the YELLOW socket and 18.5
  // from its own under protanopia.
  //
  // The floor below is what the current palette achieves, so any edit that
  // makes any pair harder to tell apart — in any of the four visions, whether
  // piece-to-piece or piece-to-wrong-socket — fails here.

  const FLOOR = 22;

  /** The socket floor for a colour, matching PuzzleFigure's SOCKET_SHADE. */
  function socketFloor(colour: string): string {
    const n = parseInt(colour.slice(1), 16);
    const shade = (c: number) =>
      Math.round(c * 0.9)
        .toString(16)
        .padStart(2, '0');
    return `#${shade((n >> 16) & 255)}${shade((n >> 8) & 255)}${shade(n & 255)}`;
  }

  it.each(VISIONS)('%s: no two pieces look alike', (vision) => {
    const tooClose: string[] = [];
    for (let i = 0; i < PART_COLOURS.length; i++) {
      for (let j = i + 1; j < PART_COLOURS.length; j++) {
        const d = distanceAs(PART_COLOURS[i], PART_COLOURS[j], vision);
        if (d < FLOOR) {
          tooClose.push(`${PART_COLOURS[i]}~${PART_COLOURS[j]} = ${d.toFixed(1)}`);
        }
      }
    }
    expect(tooClose).toEqual([]);
  });

  it.each(VISIONS)('%s: no piece resembles the WRONG socket', (vision) => {
    // The one that actually broke: a piece has to be nearer its own hole than
    // anyone else's, or matching by colour leads the child to the wrong place.
    const confusable: string[] = [];
    for (const piece of PART_COLOURS) {
      for (const other of PART_COLOURS) {
        if (other === piece) continue;
        const d = distanceAs(piece, socketFloor(other), vision);
        if (d < FLOOR) confusable.push(`${piece} → socket ${other} = ${d.toFixed(1)}`);
      }
    }
    expect(confusable).toEqual([]);
  });

  it.each(VISIONS)('%s: every piece is nearest to its OWN socket', (vision) => {
    const wrong: string[] = [];
    for (const piece of PART_COLOURS) {
      const own = distanceAs(piece, socketFloor(piece), vision);
      const nearestOther = Math.min(
        ...PART_COLOURS.filter((c) => c !== piece).map((c) =>
          distanceAs(piece, socketFloor(c), vision),
        ),
      );
      if (own >= nearestOther) {
        wrong.push(`${piece}: own ${own.toFixed(1)} vs other ${nearestOther.toFixed(1)}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
