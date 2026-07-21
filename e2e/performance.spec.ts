// e2e/performance.spec.ts
// Performance budgets and cross-screen navigation.
//
// The budgets are deliberately generous — this runs in headless Chromium on a
// dev machine, not on an iPad. They are regression guards ("did something get
// 3x slower"), not a claim about device performance. Real frame timing has to
// be measured on hardware.

import { test, expect, type Page } from '@playwright/test';

/** Parts differ per country, so ids are read from the live DOM. */
async function partIds(page: Page): Promise<string[]> {
  return page.$$eval('[data-testid^="piece-"]', (nodes) =>
    nodes.map((n) => (n.getAttribute('data-testid') || '').replace('piece-', '')),
  );
}

/** Is a piece sitting in its socket? Detected by position — see shapefit.spec. */
async function isSeated(page: Page, itemId: string): Promise<boolean> {
  const piece = await page.getByTestId(`piece-${itemId}`).boundingBox();
  const socket = await page.getByTestId(`socket-${itemId}`).boundingBox();
  if (!piece || !socket) return false;
  const pc = { x: piece.x + piece.width / 2, y: piece.y + piece.height / 2 };
  const sc = { x: socket.x + socket.width / 2, y: socket.y + socket.height / 2 };
  return Math.hypot(pc.x - sc.x, pc.y - sc.y) < socket.width / 3;
}

const ITEMS = ['tulip', 'cheese', 'bicycle', 'boat', 'cow'] as const;

async function toMenu(page: Page) {
  await page.goto('/');
  const play = page.getByRole('button', { name: 'Play' });
  await expect(play).toBeVisible({ timeout: 20_000 });
  return play;
}

test.describe('performance', () => {
  test('reaches an interactive menu quickly', async ({ page }) => {
    const t0 = Date.now();
    await toMenu(page);
    const elapsed = Date.now() - t0;

    // Splash holds ~1.6s by design, so anything under 6s means the bundle
    // parsed and the first screen mounted without a stall.
    expect(elapsed, `menu took ${elapsed}ms`).toBeLessThan(6000);
  });

  test('a piece responds to a drag within the feedback budget', async ({ page }) => {
    const play = await toMenu(page);
    await play.click({ force: true });
    await page.getByTestId('game-puzzle-nl').click();
    await expect(page.getByTestId('puzzle-board')).toBeVisible();

    const centre = async (id: string) => {
      const b = await page.getByTestId(id).boundingBox();
      return { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
    };

    // Time from grabbing a piece to it sitting in its cell. Rule 4 wants
    // feedback inside 100ms; the settle spring adds a little on top.
    const [first] = await partIds(page);
    const from = await centre(`piece-${first}`);
    const to = await centre(`hole-${first}`);
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
        async () => {
          const p = await page.getByTestId(`piece-${first}`).boundingBox();
          const c = await page.getByTestId(`hole-${first}`).boundingBox();
          if (!p || !c) return false;
          return (
            Math.hypot(
              p.x + p.width / 2 - (c.x + c.width / 2),
              p.y + p.height / 2 - (c.y + c.height / 2),
            ) < Math.max(c.width, 40) / 1.5
          );
        },
        { timeout: 3000, intervals: [16, 16, 32] },
      )
      .toBe(true);

    const elapsed = Date.now() - t0;
    expect(elapsed, `place took ${elapsed}ms`).toBeLessThan(2000);
  });

  test('navigating between every screen leaves no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`);
    });

    const play = await toMenu(page);
    await play.click({ force: true });
    await expect(page.getByTestId('game-puzzle-nl')).toBeVisible();

    await page.getByTestId('game-puzzle-nl').click();
    await expect(page.getByTestId('puzzle-board')).toBeVisible();
    await page.getByRole('button', { name: 'Home' }).click();

    await page.getByTestId('game-shapefit-nl').click();
    await expect(page.getByTestId('socket-tulip')).toBeVisible();
    await page.getByRole('button', { name: 'Home' }).click();

    await expect(page.getByTestId('game-puzzle-nl')).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a full Shape Fit game stays responsive throughout', async ({ page }) => {
    const play = await toMenu(page);
    await play.click({ force: true });
    await page.getByTestId('game-shapefit-nl').click();
    await expect(page.getByTestId('socket-tulip')).toBeVisible();

    const centre = async (id: string) => {
      const b = await page.getByTestId(id).boundingBox();
      return { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
    };

    const durations: number[] = [];
    for (const item of ITEMS) {
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
      // Seated is a POSITION now: the piece travels into the socket and stays
      // visible, rather than fading out while a copy is drawn there.
      await expect.poll(() => isSeated(page, item), { timeout: 3000 }).toBe(true);
      durations.push(Date.now() - t0);
    }

    await expect(page.getByTestId('win-overlay')).toBeVisible();

    // No drag should get dramatically slower as the board fills up — that
    // would signal a leak or an accumulating listener.
    const slowest = Math.max(...durations);
    const fastest = Math.min(...durations);
    expect(slowest, `slowest drag ${slowest}ms`).toBeLessThan(2500);
    expect(slowest / fastest, 'later drags must not degrade').toBeLessThan(3);
  });

  test('restarting many times does not leak DOM nodes', async ({ page }) => {
    const play = await toMenu(page);
    await play.click({ force: true });
    await page.getByTestId('game-puzzle-nl').click();
    await expect(page.getByTestId('puzzle-board')).toBeVisible();

    const count = () => page.evaluate(() => document.querySelectorAll('*').length);
    const before = await count();

    for (let i = 0; i < 8; i++) {
      await page.getByRole('button', { name: 'Start again' }).click();
      await page.waitForTimeout(120);
    }

    const after = await count();
    expect(after, `nodes ${before} -> ${after}`).toBeLessThan(before * 1.25);
  });
});
