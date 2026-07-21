// e2e/puzzle-again.spec.ts
// Starting over must give a board that works a second time.
//
// THE BUG THIS GUARDS, reported from a real device: after winning and tapping
// "Again", the blocks flew to places they did not belong.
//
// The cause was a cached measurement. A placed block used to TRAVEL from its
// tray slot to its hole, which meant knowing where its slot was — recorded
// when the slot laid out, and stale the moment a restart reshuffled the tray,
// because the slots themselves never move or resize so nothing re-fires. Every
// block then carried the previous round's home and landed that far away: 559pt.
//
// Measuring at grab time instead cut it to one slot's height and made it
// INTERMITTENT, since `measureInWindow` is asynchronous and a quick drag beat
// its own callback. The travel turned out to be invisible anyway — the board
// draws placed blocks and the dragged view is hidden the instant it lands — so
// the measurement was removed rather than made fresher.

import { test, expect, type Page } from '@playwright/test';

async function ids(page: Page, prefix: string): Promise<string[]> {
  return page.$$eval(
    `[data-testid^="${prefix}-"]`,
    (nodes, p) =>
      nodes.map((n) => (n.getAttribute('data-testid') || '').replace(`${p}-`, '')),
    prefix,
  );
}

async function boxOf(page: Page, testId: string) {
  const b = await page.getByTestId(testId).boundingBox();
  if (!b) throw new Error(`${testId} has no box`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height };
}

async function build(page: Page) {
  for (const id of await ids(page, 'piece')) {
    const hole = await boxOf(page, `hole-${id}`);
    const piece = await boxOf(page, `piece-${id}`);
    await page.mouse.move(piece.x, piece.y);
    await page.mouse.down();
    await page.mouse.move(hole.x, hole.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(280);
  }
}

test.describe('starting over', () => {
  test('after a win, every block is back in the tray and on screen', async ({
    page,
    viewport,
  }) => {
    await page.goto('/games/puzzle/nl');
    await expect(page.getByTestId('puzzle-board')).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(600);

    // The tray sits to the RIGHT of the board — in one column on a tablet and
    // two on a phone, which is why this checks a region rather than a column.
    // Restarting also RESHUFFLES, so a block may legitimately come back to a
    // different slot; what must hold is that it comes back to the tray at all
    // and stays on the screen.
    const board = await boxOf(page, 'puzzle-board');
    const trayStarts = board.x + board.w / 2;

    await build(page);
    await expect(page.getByTestId('win-overlay')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('win-again').click();
    // Long enough for any animation to have finished. A block still travelling
    // after this is a block travelling somewhere wrong.
    await page.waitForTimeout(1200);

    for (const id of await ids(page, 'piece')) {
      const now = await boxOf(page, `piece-${id}`);
      expect(
        now.x,
        `${id} restarted at x=${Math.round(now.x)}, which is not in the tray (right of ${Math.round(trayStarts)})`,
      ).toBeGreaterThan(trayStarts);

      expect(now.x, `${id} off the left`).toBeGreaterThanOrEqual(-1);
      expect(now.y, `${id} off the top`).toBeGreaterThanOrEqual(-1);
      expect(now.x, `${id} off the right`).toBeLessThanOrEqual(viewport!.width + 1);
      expect(now.y, `${id} off the bottom`).toBeLessThanOrEqual(viewport!.height + 1);
    }
  });

  test('the picture can be built AGAIN, and won again', async ({ page }) => {
    // The assertion that matters, and the one the cached measurement broke: a
    // second round has to be winnable. If a block will not seat, the win never
    // comes and the child is stuck on a board they cannot finish.
    await page.goto('/games/puzzle/nl');
    await expect(page.getByTestId('puzzle-board')).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(600);

    await build(page);
    await expect(page.getByTestId('win-overlay')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('win-again').click();
    await page.waitForTimeout(900);
    await expect(page.getByTestId('win-overlay')).toBeHidden();

    await build(page);

    await expect(page.getByTestId('win-overlay')).toBeVisible({ timeout: 10_000 });
  });

  test('every placed block is drawn in its own hole', async ({ page }) => {
    // A placed block is drawn BY THE BOARD, inside the hole and at the hole's
    // size. That is what the child sees, so that is what gets measured.
    await page.goto('/games/puzzle/nl');
    await expect(page.getByTestId('puzzle-board')).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(600);

    await build(page);
    await page.waitForTimeout(600);

    for (const id of await ids(page, 'hole')) {
      const hole = await boxOf(page, `hole-${id}`);
      const drawn = await page
        .getByTestId(`hole-${id}`)
        .locator('svg')
        .first()
        .boundingBox();
      expect(drawn, `${id} has nothing drawn in it`).not.toBeNull();
      expect(
        Math.abs(drawn!.width - hole.w),
        `${id}: drawn ${Math.round(drawn!.width)}pt wide in a ${Math.round(hole.w)}pt hole`,
      ).toBeLessThan(hole.w * 0.2);
    }
  });
});
