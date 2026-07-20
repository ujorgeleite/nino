// constants/figureParts.test.ts
// The cut has to be a real cut: parts that tile the drawing, do not overlap,
// and are each big enough for a 2-year-old to grab.
//
// These read like geometry but every one is a play claim. Overlapping parts
// mean two sockets accept the same drop; a tiny part means a piece nobody can
// pick up.

import { FIGURE_PARTS, MIN_PIECE_SHARE, isPuzzleSubject, partsFor } from './figureParts';
import { COUNTRIES } from './countries';
import type { StaticPrimitiveKind } from '../components/scene/primitives';

type Box = readonly [number, number, number, number];

const overlapArea = (a: Box, b: Box): number => {
  const x = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]));
  const y = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
  return x * y;
};

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
    // Three to five. Two is not a puzzle; six is a wall of fragments at this age.
    expect(parts.length).toBeGreaterThanOrEqual(3);
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

  it.each(SUBJECTS)('%s parts barely overlap — no socket steals another drop', (kind) => {
    // Bounding boxes of adjacent parts touch, but a large overlap would mean
    // two sockets sitting on top of each other.
    const parts = partsFor(kind);
    const bad: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const share =
          overlapArea(parts[i].box, parts[j].box) /
          Math.min(area(parts[i].box), area(parts[j].box));
        if (share > 0.3) bad.push(`${parts[i].id}/${parts[j].id} ${share.toFixed(2)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it.each(SUBJECTS)('%s covers a real share of the drawing', (kind) => {
    // Parts that cover almost nothing would leave a ghost with a few chips
    // taken out of it, not a picture being assembled.
    const total = partsFor(kind).reduce((sum, p) => sum + area(p.box), 0);
    expect(total).toBeGreaterThan(2000); // of a 10 000 unit box
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
