// e2e/performance-countries.spec.ts
// Performance budgets across the whole country set.
//
// The requirement was explicit: the games must not stall or feel slow. These
// are regression guards, generous because they run in headless Chromium on a
// dev machine rather than on an iPad. What they genuinely prove is that no
// country is dramatically worse than the others, and that nothing degrades as
// the app is used — which is where real stalls come from.

import { test, expect, type Page } from '@playwright/test';

const COUNTRIES = ['nl', 'be', 'de', 'fr', 'gb', 'dk', 'se', 'no', 'ch', 'at', 'it'] as const;

/** Time from opening a route to the board being interactive. */
async function timeToBoard(page: Page, code: string): Promise<number> {
  const t0 = Date.now();
  await page.goto(`/games/memory/${code}`);
  await expect(page.getByTestId('memory-board')).toBeVisible({ timeout: 25_000 });
  return Date.now() - t0;
}

/** Time from tapping a card to its front face actually being shown. */
async function flipLatency(page: Page): Promise<number> {
  const id = (
    await page.$$eval('[data-testid^="card-"]', (nodes) =>
      nodes
        .map((n) => n.getAttribute('data-testid') || '')
        .filter((v) => !v.endsWith('-front') && !v.endsWith('-back')),
    )
  )[0].replace('card-', '');

  const t0 = Date.now();
  await page.getByTestId(`card-${id}`).click();
  await expect
    .poll(
      async () =>
        Number(
          await page
            .getByTestId(`card-${id}-front`)
            .evaluate((el) => getComputedStyle(el).opacity),
        ),
      { timeout: 4000, intervals: [16, 16, 16, 32] },
    )
    .toBe(1);
  return Date.now() - t0;
}

test.describe('performance across countries', () => {
  test('every country opens and responds within budget', async ({ page }) => {
    const opens: number[] = [];
    const flips: number[] = [];

    for (const code of COUNTRIES) {
      opens.push(await timeToBoard(page, code));
      flips.push(await flipLatency(page));
    }

    const worstOpen = Math.max(...opens);
    const worstFlip = Math.max(...flips);

    // Absolute ceilings.
    expect(worstOpen, `slowest open ${worstOpen}ms`).toBeLessThan(6000);
    expect(worstFlip, `slowest flip ${worstFlip}ms`).toBeLessThan(1200);

    // No country may be an outlier: the heaviest scene must not cost several
    // times the lightest. This is what catches "someone added 40 mountains".
    const ratio = Math.max(...opens) / Math.min(...opens);
    expect(ratio, `open-time spread ${ratio.toFixed(1)}x`).toBeLessThan(4);
  });

  test('visiting every country in a row does not degrade', async ({ page }) => {
    // A leak shows up as the eleventh country being much slower than the
    // first, even though the scenes are comparable.
    const timings: number[] = [];
    for (const code of COUNTRIES) {
      timings.push(await timeToBoard(page, code));
    }

    const firstThree = timings.slice(0, 3).reduce((a, b) => a + b) / 3;
    const lastThree = timings.slice(-3).reduce((a, b) => a + b) / 3;

    expect(
      lastThree,
      `first three avg ${firstThree.toFixed(0)}ms, last three ${lastThree.toFixed(0)}ms`,
    ).toBeLessThan(firstThree * 2.5 + 400);
  });

  test('touring every country does not leak DOM nodes', async ({ page }) => {
    await page.goto(`/games/memory/${COUNTRIES[0]}`);
    await expect(page.getByTestId('memory-board')).toBeVisible({ timeout: 25_000 });
    const count = () => page.evaluate(() => document.querySelectorAll('*').length);
    const baseline = await count();

    for (const code of COUNTRIES) {
      await page.goto(`/games/memory/${code}`);
      await expect(page.getByTestId('memory-board')).toBeVisible();
    }

    const after = await count();
    // Scenes differ in size, so allow real variation — but not growth that
    // scales with how many countries were visited.
    expect(after, `nodes ${baseline} → ${after} after touring 11 countries`).toBeLessThan(
      baseline * 1.8,
    );
  });

  test('a full Shape Fit game is responsive in the heaviest country', async ({ page }) => {
    // Norway has three snow-capped mountains plus a wide water band — the
    // busiest scene in the set.
    await page.goto('/games/shapefit/no');
    await expect(page.locator('[data-testid^="piece-"]').first()).toBeVisible({
      timeout: 25_000,
    });

    const items = await page.$$eval('[data-testid^="piece-"]', (nodes) =>
      nodes.map((n) => (n.getAttribute('data-testid') || '').replace('piece-', '')),
    );

    const centre = async (id: string) => {
      const b = await page.getByTestId(id).boundingBox();
      return { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
    };

    const durations: number[] = [];
    for (const item of items) {
      const from = await centre(`piece-${item}`);
      const to = await centre(`socket-${item}`);
      const t0 = Date.now();
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
      durations.push(Date.now() - t0);
    }

    const slowest = Math.max(...durations);
    expect(slowest, `slowest drag ${slowest}ms`).toBeLessThan(2500);
    // Later drags must not get worse as the board fills.
    expect(slowest / Math.min(...durations), 'drag degradation').toBeLessThan(3.5);
  });
});
