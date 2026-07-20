// e2e/shapefit.spec.ts
// Shape Fit (Netherlands) driven end to end.
//
// This is the game whose drag-and-drop had NEVER been exercised — only the
// snap maths was unit tested. Everything here is new ground: real pointer
// drags, real layout, real coordinate mapping.

import { test, expect, type Page, type Locator } from '@playwright/test';

const ITEMS = ['tulip', 'cheese', 'bicycle', 'boat', 'cow'] as const;
const SETTLE_MS = 500;

async function openShapeFit(page: Page) {
  await page.goto('/');
  const play = page.getByRole('button', { name: 'Play' });
  await expect(play).toBeVisible({ timeout: 20_000 });
  await play.click({ force: true });
  await page.getByTestId('game-shapefit-nl').click();
  await expect(page.getByTestId('socket-tulip')).toBeVisible();
}

async function centreOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Drags a piece onto a target point with a real multi-step pointer gesture.
 * Steps matter: gesture-handler needs movement events, not a teleport.
 */
async function dragTo(page: Page, pieceId: string, target: { x: number; y: number }) {
  const from = await centreOf(page.getByTestId(`piece-${pieceId}`));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // A few intermediate moves so the pan gesture activates and tracks.
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(
      from.x + ((target.x - from.x) * i) / 8,
      from.y + ((target.y - from.y) * i) / 8,
      { steps: 2 },
    );
  }
  await page.mouse.up();
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * Waits until an element stops moving. Needed because a rejected piece springs
 * back, and measuring a moving target gives a stale position.
 */
async function waitUntilStill(page: Page, testId: string, timeoutMs = 4000) {
  const start = Date.now();
  let last = await centreOf(page.getByTestId(testId));
  while (Date.now() - start < timeoutMs) {
    await page.waitForTimeout(60);
    const now = await centreOf(page.getByTestId(testId));
    if (Math.hypot(now.x - last.x, now.y - last.y) < 0.5) return Date.now() - start;
    last = now;
  }
  throw new Error(`${testId} never came to rest within ${timeoutMs}ms`);
}

/**
 * Is a piece sitting in its socket?
 *
 * Detected by POSITION, not opacity. A seated piece used to fade out of the
 * tray while a copy was drawn in the socket; it now travels into the board and
 * stays visible, which is both better to look at and closer to how a real
 * puzzle behaves. Overlap with its own socket is the honest test.
 */
async function isSeated(page: Page, itemId: string): Promise<boolean> {
  const piece = await page.getByTestId(`piece-${itemId}`).boundingBox();
  const socket = await page.getByTestId(`socket-${itemId}`).boundingBox();
  if (!piece || !socket) return false;
  const pc = { x: piece.x + piece.width / 2, y: piece.y + piece.height / 2 };
  const sc = { x: socket.x + socket.width / 2, y: socket.y + socket.height / 2 };
  // Within a third of the socket — comfortably "in it", not merely near it.
  return Math.hypot(pc.x - sc.x, pc.y - sc.y) < socket.width / 3;
}

test.describe('Shape Fit NL', () => {
  test('shows a board with five sockets and five tray pieces', async ({ page }) => {
    await openShapeFit(page);
    for (const item of ITEMS) {
      await expect(page.getByTestId(`socket-${item}`)).toBeVisible();
      await expect(page.getByTestId(`piece-${item}`)).toBeVisible();
    }
  });

  test('every piece is a legal tap target and on screen', async ({ page }) => {
    await openShapeFit(page);
    for (const item of ITEMS) {
      const box = await page.getByTestId(`piece-${item}`).boundingBox();
      expect(box, `piece ${item} has no box`).not.toBeNull();
      // CLAUDE.md rule 3.
      expect(box!.width).toBeGreaterThanOrEqual(90);
      expect(box!.height).toBeGreaterThanOrEqual(90);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(1180);
      expect(box!.y + box!.height).toBeLessThanOrEqual(820);
    }
  });

  test('sockets and pieces do not overlap', async ({ page }) => {
    // If the tray sat on top of the board, a drag could never leave the tray.
    await openShapeFit(page);
    const socket = await page.getByTestId('socket-tulip').boundingBox();
    const piece = await page.getByTestId('piece-tulip').boundingBox();
    const disjoint =
      socket!.y + socket!.height <= piece!.y || piece!.y + piece!.height <= socket!.y;
    expect(disjoint, 'the tray must not overlap the board').toBe(true);
  });

  test('dragging a piece onto its own socket seats it', async ({ page }) => {
    await openShapeFit(page);
    expect(await isSeated(page, 'tulip')).toBe(false);

    await dragTo(page, 'tulip', await centreOf(page.getByTestId('socket-tulip')));

    // Seated pieces fade out of the tray.
    expect(await isSeated(page, 'tulip')).toBe(true);
  });

  test('dropping on the WRONG socket returns the piece to the tray', async ({ page }) => {
    await openShapeFit(page);

    await dragTo(page, 'tulip', await centreOf(page.getByTestId('socket-cow')));

    // Nothing seats — and rule 2: nothing is lost either.
    expect(await isSeated(page, 'tulip')).toBe(false);
    expect(await isSeated(page, 'cow')).toBe(false);

    // The same piece can still be played correctly afterwards. This is the
    // core toddler loop — they miss constantly — so it must be reliable.
    await waitUntilStill(page, 'piece-tulip');
    await dragTo(page, 'tulip', await centreOf(page.getByTestId('socket-tulip')));
    expect(await isSeated(page, 'tulip')).toBe(true);
  });

  test('dropping on empty space returns the piece to the tray', async ({ page }) => {
    await openShapeFit(page);

    await dragTo(page, 'boat', { x: 1100, y: 120 });

    expect(await isSeated(page, 'boat')).toBe(false);
  });

  test('plays through to the win overlay', async ({ page }) => {
    await openShapeFit(page);

    for (const item of ITEMS) {
      await dragTo(page, item, await centreOf(page.getByTestId(`socket-${item}`)));
      expect(await isSeated(page, item), `${item} should have seated`).toBe(true);
    }

    const overlay = page.getByTestId('win-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('All in place!');
  });

  test('finishing offers the NEXT place, not a replay', async ({ page }) => {
    // The old button replayed the same board, which for a child who just
    // succeeded is the least interesting possible next thing.
    await openShapeFit(page);
    for (const item of ITEMS) {
      await dragTo(page, item, await centreOf(page.getByTestId(`socket-${item}`)));
    }
    await expect(page.getByTestId('win-overlay')).toBeVisible();

    await page.getByRole('button', { name: 'Next place' }).click();

    await expect(page.locator('[data-testid^="socket-"]').first()).toBeVisible();
    expect(page.url()).toContain('/games/shapefit/');
    expect(page.url()).not.toContain('/shapefit/nl');
  });

  test('restart mid-game returns seated pieces to the tray', async ({ page }) => {
    await openShapeFit(page);
    await dragTo(page, 'cheese', await centreOf(page.getByTestId('socket-cheese')));
    expect(await isSeated(page, 'cheese')).toBe(true);

    await page.getByRole('button', { name: 'Start again' }).click();
    await page.waitForTimeout(SETTLE_MS);

    expect(await isSeated(page, 'cheese')).toBe(false);
  });

  test('a rejected piece is back in place fast enough to retry', async ({ page }) => {
    // PERFORMANCE REGRESSION GUARD. This was 2698ms with the original spring
    // (damping 14 / stiffness 180) — far too slow for a child who misses
    // constantly, and it left a moving target for the retry. Now ~250ms.
    await openShapeFit(page);

    const rest = await centreOf(page.getByTestId('piece-tulip'));
    await dragTo(page, 'tulip', await centreOf(page.getByTestId('socket-cow')));

    const settleMs = await waitUntilStill(page, 'piece-tulip');
    expect(settleMs, 'spring-back must stay snappy').toBeLessThan(900);

    // And it really is back where it started, not parked somewhere else.
    const after = await centreOf(page.getByTestId('piece-tulip'));
    expect(Math.hypot(after.x - rest.x, after.y - rest.y)).toBeLessThan(4);
  });

  test('home returns to the picker', async ({ page }) => {
    await openShapeFit(page);
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByTestId('game-puzzle-nl')).toBeVisible();
  });
});
