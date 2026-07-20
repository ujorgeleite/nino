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

/**
 * Kept in step with constants/countries/index.ts. Duplicated deliberately:
 * the E2E suite must fail loudly if a country silently disappears from the
 * app, which importing the registry would hide.
 */
const COUNTRIES = ['nl', 'be', 'de', 'fr', 'gb', 'dk', 'se', 'no', 'ch', 'at', 'it'] as const;

const FLIP_MS = 600;

async function goToMenu(page: Page) {
  await page.goto('/');
  const play = page.getByRole('button', { name: 'Play' });
  await expect(play).toBeVisible({ timeout: 25_000 });
  return play;
}

/** Deep-links straight into a game — far faster than clicking through. */
async function openGame(page: Page, game: 'memory' | 'shapefit', code: string) {
  await page.goto(`/games/${game}/${code}`);
}

const itemOf = (instanceId: string) => instanceId.replace(/-\d+$/, '');

async function cardIds(page: Page): Promise<string[]> {
  return page.$$eval('[data-testid^="card-"]', (nodes) =>
    nodes
      .map((n) => n.getAttribute('data-testid') || '')
      .filter((id) => !id.endsWith('-front') && !id.endsWith('-back'))
      .map((id) => id.replace(/^card-/, '')),
  );
}

test.describe('the game picker', () => {
  test('offers both games for every country, on one level', async ({ page }) => {
    const play = await goToMenu(page);
    await play.click({ force: true });

    for (const code of COUNTRIES) {
      // The grid scrolls, so tiles further down need scrolling into view.
      const memory = page.getByTestId(`game-memory-${code}`);
      const shapefit = page.getByTestId(`game-shapefit-${code}`);
      await memory.scrollIntoViewIfNeeded();
      await expect(memory).toBeVisible();
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

    await expect(page.getByTestId('game-memory-fr')).toHaveAttribute(
      'aria-label',
      'Memory, France',
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

test.describe('Memory', () => {
  for (const code of COUNTRIES) {
    test(`${code}: deals a playable board and can be won`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await openGame(page, 'memory', code);
      await expect(page.getByTestId('memory-board')).toBeVisible({ timeout: 25_000 });

      const ids = await cardIds(page);
      expect(ids, `${code} should deal 10 cards`).toHaveLength(10);

      // The regression that shipped twice: a card showing neither face.
      for (const id of ids) {
        const back = await page
          .getByTestId(`card-${id}-back`)
          .evaluate((el) => getComputedStyle(el).opacity);
        expect(Number(back), `${code}/${id} back must be visible`).toBe(1);
      }

      // Play it out.
      const byItem = new Map<string, string[]>();
      for (const id of ids) {
        const list = byItem.get(itemOf(id)) ?? [];
        list.push(id);
        byItem.set(itemOf(id), list);
      }
      expect(byItem.size, `${code} should have 5 pairs`).toBe(5);

      for (const [, [a, b]] of byItem) {
        await page.getByTestId(`card-${a}`).click();
        await page.getByTestId(`card-${b}`).click();
        await page.waitForTimeout(FLIP_MS);
      }

      await expect(page.getByTestId('win-overlay')).toBeVisible();
      expect(errors, `${code} console errors:\n${errors.join('\n')}`).toEqual([]);
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

        await expect
          .poll(
            async () =>
              Number(
                await page
                  .getByTestId(`piece-${item}`)
                  .evaluate((el) => getComputedStyle(el).opacity),
              ),
            { timeout: 4000 },
          )
          .toBe(0);
      }

      await expect(page.getByTestId('win-overlay')).toBeVisible();
      expect(errors, `${code} console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// --- Layout, in both viewports ---------------------------------------------

test.describe('layout holds on every country', () => {
  for (const code of COUNTRIES) {
    test(`${code}: memory cards meet the 90pt floor and stay on screen`, async ({
      page,
      viewport,
    }) => {
      await openGame(page, 'memory', code);
      await expect(page.getByTestId('memory-board')).toBeVisible({ timeout: 25_000 });

      for (const id of await cardIds(page)) {
        const box = await page.getByTestId(`card-${id}`).boundingBox();
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
