// e2e/shapefit-layout.spec.ts
// Shape Fit has to fit too.
//
// THE BUG THIS GUARDS: the board and the pieces were both sized from
// `Math.min(width, height)`, which ignores the height the HUD, the padding and
// the board's own frame have already spent. On iPhone landscape the board
// needed 136pt and had 117pt, so the wood panel was squeezed and its sockets
// clipped — on the smaller of the two target devices, which is exactly where
// nobody was looking.
//
// The puzzle has e2e/layout-fits.spec.ts for the same reason. This is its twin.

import { test, expect, type Page } from '@playwright/test';

const COUNTRIES = ['nl', 'de', 'dk', 'ch', 'it'] as const;

async function openShapeFit(page: Page, code: string) {
  await page.goto(`/games/shapefit/${code}`);
  await expect(page.getByTestId(`socket-${await firstItem(page)}`)).toBeVisible({
    timeout: 25_000,
  });
}

async function firstItem(page: Page): Promise<string> {
  await page.waitForSelector('[data-testid^="socket-"]', { timeout: 25_000 });
  const ids = await page.$$eval('[data-testid^="socket-"]', (nodes) =>
    nodes.map((n) => (n.getAttribute('data-testid') || '').replace('socket-', '')),
  );
  return ids[0];
}

async function itemIds(page: Page): Promise<string[]> {
  return page.$$eval('[data-testid^="socket-"]', (nodes) =>
    nodes.map((n) => (n.getAttribute('data-testid') || '').replace('socket-', '')),
  );
}

test.describe('Shape Fit fits the screen', () => {
  for (const code of COUNTRIES) {
    test(`${code}: every socket is fully on screen`, async ({ page, viewport }) => {
      await openShapeFit(page, code);

      for (const id of await itemIds(page)) {
        const box = await page.getByTestId(`socket-${id}`).boundingBox();
        expect(box, `${code}/${id} has no box`).not.toBeNull();
        expect(box!.y, `${code}/${id} clipped at the top`).toBeGreaterThanOrEqual(-1);
        expect(
          box!.y + box!.height,
          `${code}/${id} clipped at the bottom`,
        ).toBeLessThanOrEqual(viewport!.height + 1);
        expect(
          box!.x + box!.width,
          `${code}/${id} off the right`,
        ).toBeLessThanOrEqual(viewport!.width + 1);
      }
    });

    test(`${code}: every piece is a legal tap target and on screen`, async ({
      page,
      viewport,
    }) => {
      await openShapeFit(page, code);

      for (const id of await itemIds(page)) {
        const box = await page.getByTestId(`piece-${id}`).boundingBox();
        expect(box, `${code}/${id} has no box`).not.toBeNull();
        // CLAUDE.md rule 3 — the piece is what a finger has to catch.
        expect(box!.width, `${code}/${id} width`).toBeGreaterThanOrEqual(90);
        expect(box!.height, `${code}/${id} height`).toBeGreaterThanOrEqual(90);
        expect(
          box!.y + box!.height,
          `${code}/${id} runs off the bottom`,
        ).toBeLessThanOrEqual(viewport!.height + 1);
      }
    });

    test(`${code}: the tray never sits under the board`, async ({ page }) => {
      await openShapeFit(page, code);
      const ids = await itemIds(page);

      const sockets = await Promise.all(
        ids.map((id) => page.getByTestId(`socket-${id}`).boundingBox()),
      );
      const pieces = await Promise.all(
        ids.map((id) => page.getByTestId(`piece-${id}`).boundingBox()),
      );

      const overlaps: string[] = [];
      for (const [i, piece] of pieces.entries()) {
        for (const [j, socket] of sockets.entries()) {
          if (!piece || !socket) continue;
          const hit =
            piece.x < socket.x + socket.width &&
            socket.x < piece.x + piece.width &&
            piece.y < socket.y + socket.height &&
            socket.y < piece.y + piece.height;
          if (hit) overlaps.push(`piece ${ids[i]} over socket ${ids[j]}`);
        }
      }
      expect(overlaps).toEqual([]);
    });
  }
});
