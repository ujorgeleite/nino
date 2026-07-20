// e2e/puzzle-art.spec.ts
// Every piece must actually SHOW a piece of the picture.
//
// THE BUG THIS GUARDS
//
// The cuts in constants/figureParts.ts were authored as an idealised anatomy —
// a spire here, a base there — without checking where the primitives in
// components/scene/primitives.tsx actually draw. Sockets looked correct,
// because they are drawn from those same paths. But the artwork behind them
// was elsewhere, so a piece cropped to a region the drawing did not occupy
// came out COMPLETELY EMPTY: a child was handed an outline with nothing in it.
//
// Every unit test passed. The paths were valid, the boxes were inside the box,
// the shapes were unique, the sockets did not overlap. Nothing in the data can
// see this, because the defect is a disagreement between two files that never
// reference each other. Only rendering it shows it.
//
// So this renders each piece and counts its pixels.

import { test, expect, type Page } from '@playwright/test';

const COUNTRY_CODES = ['nl', 'be', 'de', 'fr', 'gb', 'dk', 'se', 'no', 'ch', 'at', 'it'] as const;

/** Parts differ per country, so ids are read from the live DOM. */
async function partIds(page: Page): Promise<string[]> {
  return page.$$eval('[data-testid^="piece-"]', (nodes) =>
    nodes.map((n) => (n.getAttribute('data-testid') || '').replace('piece-', '')),
  );
}

/**
 * How much of a piece's artwork differs from the backdrop it sits on.
 *
 * THE MEASUREMENT SAMPLES THE BACKDROP INSTEAD OF ASSUMING IT.
 *
 * Three colour-based versions of this failed, each on a different healthy
 * piece. Counting dark pixels scored an empty piece as high as a full one,
 * because a piece's outline is thick and so is every building behind it.
 * Counting saturated pixels failed a castle whose walls are cream. Measuring
 * distance from the backdrop's known greys failed the Eiffel tower, whose
 * beige sits just at the edge of the tolerance.
 *
 * Every one of those tried to describe what paint looks like, which depends on
 * the content and so will keep breaking as countries are added. What the test
 * actually needs to know is whether the piece STANDS OUT FROM ITS SURROUNDINGS
 * — so it reads the surroundings from the screenshot itself, as a ring of
 * pixels just outside the artwork, and asks how much of the inside differs
 * from that. No colour is hardcoded and no content is assumed.
 *
 * It is also the property the design is aiming at: a piece that does not
 * differ from its backdrop is a piece a child cannot see.
 */
async function paintedShare(page: Page, testId: string): Promise<number> {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`${testId} has no box`);

  const pad = 10;
  const buffer = await page.screenshot({
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    },
  });

  return page.evaluate(
    async ([bytes, padding]) => {
      const blob = new Blob([new Uint8Array(bytes as number[])], { type: 'image/png' });
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      const at = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return [data[i], data[i + 1], data[i + 2]] as const;
      };

      // The backdrop: the outermost ring, which is outside the artwork by
      // construction. Median per channel, so a cloud drifting through the ring
      // cannot drag the reference colour with it.
      const ring: (readonly [number, number, number])[] = [];
      for (let x = 0; x < width; x++) {
        ring.push(at(x, 0), at(x, height - 1));
      }
      for (let y = 0; y < height; y++) {
        ring.push(at(0, y), at(width - 1, y));
      }
      const median = (channel: 0 | 1 | 2) => {
        const values = ring.map((p) => p[channel]).sort((a, b) => a - b);
        return values[Math.floor(values.length / 2)];
      };
      const back = [median(0), median(1), median(2)] as const;

      // Everything inside the padding, compared with it.
      const p = padding as number;
      let differs = 0;
      let total = 0;
      for (let y = p; y < height - p; y++) {
        for (let x = p; x < width - p; x++) {
          const [r, g, b] = at(x, y);
          total++;
          if (Math.hypot(r - back[0], g - back[1], b - back[2]) > 40) differs++;
        }
      }
      return total === 0 ? 0 : differs / total;
    },
    [Array.from(buffer), pad] as [number[], number],
  );
}

test.describe('every puzzle piece shows part of the picture', () => {
  for (const code of COUNTRY_CODES) {
    test(`${code}: no piece is an empty outline`, async ({ page }) => {
      await page.goto(`/games/puzzle/${code}`);
      await expect(page.getByTestId('puzzle-board')).toBeVisible({ timeout: 25_000 });

      const ids = await partIds(page);
      expect(ids.length).toBeGreaterThanOrEqual(2);

      const empty: string[] = [];
      for (const id of ids) {
        const share = await paintedShare(page, `art-${id}`);
        // A piece that is only its own outline lands near 0.10. A piece with
        // artwork in it clears 0.25 comfortably. The threshold sits between,
        // near the outline end, so it catches "empty" without dictating how
        // much of its box any particular shape has to fill.
        if (share < 0.2) empty.push(`${id} (${(share * 100).toFixed(0)}% drawn)`);
      }
      expect(empty).toEqual([]);
    });
  }
});
