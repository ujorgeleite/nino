// e2e/layout-fits.spec.ts
// Nothing may overlap, and nothing may sit off screen.
//
// THE BUG THIS GUARDS: the puzzle board was sized from the viewport's short
// side, ignoring the space the HUD and tray had already taken. On iPhone
// landscape that overflowed by ~116pt — the tray ended up UNDERNEATH the
// board, so a touch aimed at a piece hit the board instead and the game could
// not be finished.
//
// It presented as flakiness: which countries failed depended on where each
// shuffled piece happened to land. A geometry assertion finds it immediately
// and in every viewport.

import { test, expect, type Page } from '@playwright/test';

/** One piece per shape. Shape is what tells a child where it goes. */
const CELLS = ['circle', 'square', 'triangle', 'star'];
const COUNTRIES = ['nl', 'de', 'dk', 'ch', 'it'] as const;

type Box = { x: number; y: number; width: number; height: number };

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function boxOf(page: Page, testId: string): Promise<Box> {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`${testId} has no box`);
  return box;
}

test.describe('puzzle layout fits the screen', () => {
  for (const code of COUNTRIES) {
    test(`${code}: the tray never sits under the board`, async ({ page }) => {
      await page.goto(`/games/puzzle/${code}`);
      await expect(page.getByTestId('puzzle-board')).toBeVisible({ timeout: 25_000 });

      const board = await boxOf(page, 'puzzle-board');

      for (const id of CELLS) {
        const piece = await boxOf(page, `piece-${id}`);
        expect(
          overlaps(piece, board),
          `${code}: piece ${id} overlaps the board — it would be untouchable`,
        ).toBe(false);
      }
    });

    test(`${code}: every piece is fully on screen`, async ({ page, viewport }) => {
      await page.goto(`/games/puzzle/${code}`);
      await expect(page.getByTestId('puzzle-board')).toBeVisible({ timeout: 25_000 });

      for (const id of CELLS) {
        const box = await boxOf(page, `piece-${id}`);
        expect(box.x, `${code}/${id} off the left`).toBeGreaterThanOrEqual(-1);
        expect(box.y, `${code}/${id} off the top`).toBeGreaterThanOrEqual(-1);
        expect(
          box.x + box.width,
          `${code}/${id} off the right`,
        ).toBeLessThanOrEqual(viewport!.width + 1);
        expect(
          box.y + box.height,
          `${code}/${id} off the bottom`,
        ).toBeLessThanOrEqual(viewport!.height + 1);
      }
    });

    test(`${code}: pieces do not overlap each other`, async ({ page }) => {
      // Overlapping pieces mean the top one steals every touch.
      await page.goto(`/games/puzzle/${code}`);
      await expect(page.getByTestId('puzzle-board')).toBeVisible({ timeout: 25_000 });

      const boxes = await Promise.all(CELLS.map((id) => boxOf(page, `piece-${id}`)));
      const collisions: string[] = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          if (overlaps(boxes[i], boxes[j])) collisions.push(`${CELLS[i]}/${CELLS[j]}`);
        }
      }
      expect(collisions).toEqual([]);
    });
  }
});
