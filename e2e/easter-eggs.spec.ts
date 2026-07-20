// e2e/easter-eggs.spec.ts
// Poking the world must reward curiosity without ever getting in the way.
//
// The risk here is not that eggs fail to fire — it is that they interfere:
// stealing a tap meant for a card, blocking a drag, or firing so freely that
// the scenery drowns out the game.

import { test, expect, type Page } from '@playwright/test';

const COUNTRIES = ['nl', 'be', 'de', 'fr', 'gb', 'dk', 'se', 'no', 'ch', 'at', 'it'] as const;

async function openPuzzle(page: Page, code = 'nl') {
  await page.goto(`/games/puzzle/${code}`);
  await expect(page.getByTestId('puzzle-board')).toBeVisible({ timeout: 25_000 });
}

const eggs = (page: Page) => page.locator('[data-testid^="egg-"]');

test.describe('easter eggs', () => {
  test('every country has something to poke', async ({ page }) => {
    for (const code of COUNTRIES) {
      await openPuzzle(page, code);
      const count = await eggs(page).count();
      expect(count, `${code} has no interactive scenery`).toBeGreaterThan(0);
    }
  });

  test('poking scenery does not crash or navigate away', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await openPuzzle(page);
    const url = page.url();

    const count = await eggs(page).count();
    for (let i = 0; i < Math.min(count, 6); i++) {
      await eggs(page).nth(i).click({ force: true });
      await page.waitForTimeout(120);
    }

    // Still in the game, still playable, no errors.
    expect(page.url()).toBe(url);
    await expect(page.getByTestId('puzzle-board')).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('hammering one spot stays stable', async ({ page }) => {
    // The realistic toddler input pattern. The cooldown should absorb it.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await openPuzzle(page);
    const first = eggs(page).first();
    for (let i = 0; i < 25; i++) await first.click({ force: true });

    await expect(page.getByTestId('puzzle-board')).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('scenery never steals a drag meant for a piece', async ({ page }) => {
    // This is the failure that would matter: eggs sit over the whole scene,
    // and if their hit zones swallowed piece drags the game would be unplayable.
    await openPuzzle(page);

    const centre = async (id: string) => {
      const b = await page.getByTestId(id).boundingBox();
      return { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
    };
    const from = await centre('piece-r0c0');
    const to = await centre('cell-r0c0');

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
      .poll(async () => {
        const p = await page.getByTestId('piece-r0c0').boundingBox();
        const c = await page.getByTestId('cell-r0c0').boundingBox();
        if (!p || !c) return false;
        return (
          Math.hypot(
            p.x + p.width / 2 - (c.x + c.width / 2),
            p.y + p.height / 2 - (c.y + c.height / 2),
          ) < Math.max(c.width, 40) / 1.5
        );
      }, { timeout: 4000 })
      .toBe(true);
  });

  test('scenery never blocks a drag in Shape Fit', async ({ page }) => {
    await page.goto('/games/shapefit/nl');
    await expect(page.getByTestId('socket-tulip')).toBeVisible({ timeout: 25_000 });

    const centre = async (id: string) => {
      const b = await page.getByTestId(id).boundingBox();
      return { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
    };
    const from = await centre('piece-tulip');
    const to = await centre('socket-tulip');

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
      .poll(async () => {
        const p = await page.getByTestId('piece-tulip').boundingBox();
        const s = await page.getByTestId('socket-tulip').boundingBox();
        if (!p || !s) return false;
        return (
          Math.hypot(
            p.x + p.width / 2 - (s.x + s.width / 2),
            p.y + p.height / 2 - (s.y + s.height / 2),
          ) < s.width / 3
        );
      }, { timeout: 4000 })
      .toBe(true);
  });
});
