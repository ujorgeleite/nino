// constants/landmarks.test.ts
// The blocks have to be gettable, distinct, and few.
//
// These read like geometry and every one is a play claim: a block too small is
// a block a 2-year-old cannot pick up, two blocks the same shape make the ghost
// ambiguous, and a fifth block is one more than this age can hold.

import {
  ALL_LANDMARKS,
  BLOCK_FILLS,
  BLOCK_INK,
  HAND_DRAWN,
  landmarkFor,
  type Block,
} from './landmarks';

const ENTRIES = Object.entries(ALL_LANDMARKS);
const SOFT = Object.values(BLOCK_FILLS) as string[];

/** The path's points, moved to the origin so position never masks a match. */
function normalize(path: string): string {
  const nums = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  const minX = Math.min(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  return pts.map(([x, y]) => `${x - minX},${y - minY}`).join(' ');
}

const centre = (b: Block) => ({ x: b.box[0] + b.box[2] / 2, y: b.box[1] + b.box[3] / 2 });

describe('every landmark', () => {
  it('there is one to build', () => {
    expect(ENTRIES.length).toBeGreaterThanOrEqual(10);
  });

  it.each(ENTRIES)('%s: is two to four blocks', (_key, landmark) => {
    // Three or four is the brief for ages 2-5. Two is the gentlest puzzle
    // there is and some subjects genuinely have two masses; five is a wall of
    // fragments at this age.
    expect(landmark.blocks.length).toBeGreaterThanOrEqual(2);
    expect(landmark.blocks.length).toBeLessThanOrEqual(4);
  });

  it.each(ENTRIES)('%s: every block is painted from the soft palette', (_key, landmark) => {
    // The palette this replaced was neon — hot pink, cyan, electric blue —
    // chosen when colour had to do all the work of telling pieces apart. It
    // did that job and clashed with everything else in the app.
    for (const block of landmark.blocks) {
      expect(SOFT).toContain(block.fill);
      for (const detail of block.details ?? []) expect(SOFT).toContain(detail.fill);
    }
  });

  it.each(ENTRIES)('%s: no two blocks in one picture share a colour', (_key, landmark) => {
    const fills = landmark.blocks.map((b) => b.fill);
    expect(new Set(fills).size).toBe(fills.length);
  });

  it.each(ENTRIES)('%s: no two blocks share an outline', (_key, landmark) => {
    // The ghost is the instruction, so two identical holes would be two places
    // a block could honestly go — and only one of them counts.
    const seen = new Set<string>();
    for (const block of landmark.blocks) {
      const key = normalize(block.path);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it.each(ENTRIES)('%s: every block has a unique id and a label', (_key, landmark) => {
    const ids = landmark.blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const block of landmark.blocks) expect(block.label.length).toBeGreaterThan(2);
  });

  it.each(ENTRIES)('%s: every block stays inside the board', (_key, landmark) => {
    for (const block of landmark.blocks) {
      const [x, y, w, h] = block.box;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(100);
      expect(y + h).toBeLessThanOrEqual(100);
    }
  });

  it.each(ENTRIES)('%s: every path starts with a move', (_key, landmark) => {
    for (const block of landmark.blocks) expect(block.path.trim().startsWith('M ')).toBe(true);
  });

  it.each(ENTRIES)('%s: holes are far enough apart to aim at', (_key, landmark) => {
    // What decides a drop is the distance from the finger to a hole's CENTRE,
    // so that is what this measures. Two centres inside one snap radius mean
    // a child can be doing everything right and still land in the wrong hole.
    const tooClose: string[] = [];
    for (let i = 0; i < landmark.blocks.length; i++) {
      for (let j = i + 1; j < landmark.blocks.length; j++) {
        const a = centre(landmark.blocks[i]);
        const b = centre(landmark.blocks[j]);
        const gap = Math.hypot(a.x - b.x, a.y - b.y);
        if (gap < 12) {
          tooClose.push(`${landmark.blocks[i].id}/${landmark.blocks[j].id} ${gap.toFixed(1)}`);
        }
      }
    }
    expect(tooClose).toEqual([]);
  });

  it.each(ENTRIES)('%s: every block is big enough to grab', (_key, landmark) => {
    // As a share of the board. The screen also floors the touch target at an
    // absolute 90pt, but a block drawn as a sliver would still look wrong.
    for (const block of landmark.blocks) {
      const [, , w, h] = block.box;
      expect(Math.max(w, h)).toBeGreaterThanOrEqual(15);
    }
  });

  it.each(ENTRIES)('%s: has a title for the adult, not the child', (_key, landmark) => {
    expect(landmark.title).toMatch(/^Build the /);
  });
});

describe('the Netherlands canal house', () => {
  const nl = landmarkFor('nl', 'house');

  it('is the one drawn by hand', () => {
    expect(nl).not.toBeNull();
    expect(nl!.title).toBe('Build the house');
    expect(nl!.blocks.map((b) => b.id)).toEqual(['roof', 'body', 'door']);
  });

  it('is painted to the brief', () => {
    const byId = Object.fromEntries(nl!.blocks.map((b) => [b.id, b]));
    expect(byId.body.fill).toBe(BLOCK_FILLS.clay);
    expect(byId.roof.fill).toBe(BLOCK_FILLS.butter);
    expect(byId.door.fill).toBe(BLOCK_FILLS.denim);
  });

  it('paints its windows and doorknob ON the blocks, not as extra pieces', () => {
    // A 2-year-old gets three things to move. Windows are decoration.
    const byId = Object.fromEntries(nl!.blocks.map((b) => [b.id, b]));
    expect(byId.body.details).toHaveLength(2);
    expect(byId.door.details).toHaveLength(1);
    expect(nl!.blocks).toHaveLength(3);
  });

  it('ignores the primitive it would otherwise inherit', () => {
    // NL is special-cased; every other country falls back to its scene
    // primitive's cut. If that ever silently stopped, the canal house would
    // quietly become three stacked rectangles.
    const other = landmarkFor('de', 'house');
    expect(other!.blocks.map((b) => b.id)).not.toEqual(['roof', 'body', 'door']);
  });
});

describe('every country is drawn by hand', () => {
  const CODES = ['nl', 'be', 'de', 'fr', 'gb', 'dk', 'se', 'no', 'ch', 'at', 'it'];

  it('all eleven have a landmark of their own', () => {
    // The fallback — a cut derived from whichever scene primitive a country
    // happens to use — is a safety net for a country nobody has drawn yet, not
    // a place any of these should end up. A country quietly falling through to
    // it is a country whose puzzle is generic.
    expect(Object.keys(HAND_DRAWN).sort()).toEqual([...CODES].sort());
  });

  it.each(CODES)('%s: its puzzle uses its OWN drawing', (code) => {
    const drawn = HAND_DRAWN[code];
    // 'house' is passed as the primitive so that a country falling through to
    // the derived table would visibly return the generic house instead.
    expect(landmarkFor(code, 'house')).toBe(drawn);
  });

  it('no two countries build the same thing', () => {
    const titles = Object.values(HAND_DRAWN).map((l) => l.title);
    // Several countries legitimately build a castle, so the ids are what has
    // to differ — the drawings, not the words above them.
    const shapes = Object.values(HAND_DRAWN).map((l) =>
      l.blocks.map((b) => b.path).join('|'),
    );
    expect(new Set(shapes).size).toBe(shapes.length);
    expect(titles.length).toBe(11);
  });

  it.each(CODES)('%s: paints something on at least one block', (code) => {
    // What separates a drawing from a silhouette: windows, a doorknob, snow on
    // a peak. A landmark with no painted detail anywhere is three plain slabs.
    const painted = HAND_DRAWN[code].blocks.some((b) => (b.details?.length ?? 0) > 0);
    expect(painted).toBe(true);
  });
});

describe('the brand outline', () => {
  it('is the one every block carries', () => {
    // Stated here because it is a brand rule, not a drawing choice: every
    // shape in this app is outlined in the same ink.
    expect(BLOCK_INK).toBe('#33241C');
  });
});
