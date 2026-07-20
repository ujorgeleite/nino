// e2e/countries.spec.ts
// Every country, both games, driven end to end.
//
// Eleven countries × two games is the whole surface of the app. Rather than
// hand-writing 22 specs, this sweeps the real registry — a country added to
// the data is automatically covered here.
//
// Runs in BOTH viewports (see playwright.config.ts): iPad landscape and the
// much tighter iPhone landscape.

import { test, expect, type Page } from '@playwright/test';

/** Is a piece sitting in its socket? Detected by position — see shapefit.spec. */
async function isSeated(page: Page, itemId: string): Promise<boolean> {
  const piece = await page.getByTestId(`piece-${itemId}`).boundingBox();
  const socket = await page.getByTestId(`socket-${itemId}`).boundingBox();
  if (!piece || !socket) return false;
  const pc = { x: piece.x + piece.width / 2, y: piece.y + piece.height / 2 };
  const sc = { x: socket.x + socket.width / 2, y: socket.y + socket.height / 2 };
  return Math.hypot(pc.x - sc.x, pc.y - sc.y) < socket.width / 3;
}

/**
 * Kept in step with constants/countries/index.ts. Duplicated deliberately:
 * the E2E suite must fail loudly if a country silently disappears from the
 * app, which importing the registry would hide.
 */
const COUNTRIES = ['nl', 'be', 'de', 'fr', 'gb', 'dk', 'se', 'no', 'ch', 'at', 'it'] as const;

async function goToMenu(page: Page) {
  await page.goto('/');
  const play = page.getByRole('button', { name: 'Play' });
  await expect(play).toBeVisible({ timeout: 25_000 });
  return play;
}

/** Deep-links straight into a game — far faster than clicking through. */
async function openGame(page: Page, game: 'puzzle' | 'shapefit', code: string) {
  await page.goto(`/games/${game}/${code}`);
}

test.describe('the game picker', () => {
  test('offers both games for every country, on one level', async ({ page }) => {
    const play = await goToMenu(page);
    await play.click({ force: true });

    for (const code of COUNTRIES) {
      // The grid scrolls, so tiles further down need scrolling into view.
      const puzzle = page.getByTestId(`game-puzzle-${code}`);
      const shapefit = page.getByTestId(`game-shapefit-${code}`);
      await puzzle.scrollIntoViewIfNeeded();
      await expect(puzzle).toBeVisible();
      await shapefit.scrollIntoViewIfNeeded();
      await expect(shapefit).toBeVisible();
    }
  });

  test('shows one tile per game — 22 in total', async ({ page }) => {
    const play = await goToMenu(page);
    await play.click({ force: true });

    const tiles = await page.$$eval('[data-testid^="game-"]', (n) => n.length);
    expect(tiles).toBe(COUNTRIES.length * 2);
  });

  test('a tile names its game and its place for assistive tech', async ({ page }) => {
    // The child navigates by flag and emblem; the label is for a parent.
    const play = await goToMenu(page);
    await play.click({ force: true });

    await expect(page.getByTestId('game-puzzle-fr')).toHaveAttribute(
      'aria-label',
      'Puzzle, France',
    );
    await expect(page.getByTestId('game-shapefit-it')).toHaveAttribute(
      'aria-label',
      'Shape Fit, Italy',
    );
  });

  test('tapping a tile opens that exact game', async ({ page }) => {
    const play = await goToMenu(page);
    await play.click({ force: true });

    const tile = page.getByTestId('game-shapefit-de');
    await tile.scrollIntoViewIfNeeded();
    await tile.click();

    await expect(page.locator('[data-testid^="socket-"]').first()).toBeVisible();
    expect(page.url()).toContain('/games/shapefit/de');
  });
});

// --- Memory, every country -------------------------------------------------

test.describe('Puzzle', () => {
  for (const code of COUNTRIES) {
    test(`${code}: assembles its picture and can be won`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto(`/games/puzzle/${code}`);
      await expect(page.getByTestId('puzzle-board')).toBeVisible({ timeout: 25_000 });

      const cells = ['circle', 'square', 'triangle', 'star'];
      for (const id of cells) {
        await expect(page.getByTestId(`cell-${id}`)).toBeVisible();
        await expect(page.getByTestId(`piece-${id}`)).toBeVisible();
      }

      const centre = async (testId: string) => {
        const b = await page.getByTestId(testId).boundingBox();
        if (!b) throw new Error(`${testId} has no box`);
        return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      };

      for (const id of cells) {
        const from = await centre(`piece-${id}`);
        const to = await centre(`cell-${id}`);
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        for (let i = 1; i <= 8; i++) {
          await page.mouse.move(
            from.x + ((to.x - from.x) * i) / 8,
            from.y + ((to.y - from.y) * i) / 8,
            { steps: 2 },
          );
        }
        await page.mouse.up();
        await page.waitForTimeout(320);
      }

      await expect(page.getByTestId('win-overlay')).toBeVisible();
      expect(errors, `${code} console errors: ${errors.join(' | ')}`).toEqual([]);
    });
  }
});

// --- Shape Fit, every country ----------------------------------------------

test.describe('Shape Fit', () => {
  for (const code of COUNTRIES) {
    test(`${code}: every piece seats and the game can be won`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await openGame(page, 'shapefit', code);
      await expect(page.locator('[data-testid^="piece-"]').first()).toBeVisible({
        timeout: 25_000,
      });

      const pieceIds = await page.$$eval('[data-testid^="piece-"]', (nodes) =>
        nodes.map((n) => (n.getAttribute('data-testid') || '').replace('piece-', '')),
      );
      expect(pieceIds, `${code} should have 5 pieces`).toHaveLength(5);

      const centre = async (testId: string) => {
        const box = await page.getByTestId(testId).boundingBox();
        if (!box) throw new Error(`${testId} has no box`);
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      };

      for (const item of pieceIds) {
        const from = await centre(`piece-${item}`);
        const to = await centre(`socket-${item}`);
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        for (let i = 1; i <= 8; i++) {
          await page.mouse.move(
            from.x + ((to.x - from.x) * i) / 8,
            from.y + ((to.y - from.y) * i) / 8,
            { steps: 2 },
          );
        }
        await page.mouse.up();

        // Seated is a POSITION now: the piece travels into the socket and
        // stays visible, rather than fading out while a copy is drawn there.
        await expect
          .poll(() => isSeated(page, item), { timeout: 4000 })
          .toBe(true);
      }

      await expect(page.getByTestId('win-overlay')).toBeVisible();
      expect(errors, `${code} console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// --- Layout, in both viewports ---------------------------------------------

test.describe('layout holds on every country', () => {
  for (const code of COUNTRIES) {
    test(`${code}: puzzle pieces meet the 90pt floor and stay on screen`, async ({
      page,
      viewport,
    }) => {
      await page.goto(`/games/puzzle/${code}`);
      await expect(page.getByTestId('puzzle-board')).toBeVisible({ timeout: 25_000 });

      for (const id of ['circle', 'square', 'triangle', 'star']) {
        const box = await page.getByTestId(`piece-${id}`).boundingBox();
        expect(box).not.toBeNull();
        // CLAUDE.md rule 3. The iPhone viewport is where this is tight.
        expect(box!.width, `${code}/${id} width`).toBeGreaterThanOrEqual(90);
        expect(box!.height, `${code}/${id} height`).toBeGreaterThanOrEqual(90);
        expect(box!.x).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
      }
    });
  }
});
