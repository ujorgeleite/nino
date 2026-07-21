// e2e/puzzle.spec.ts
// The jigsaw, driven end to end.
//
// This game replaced Memory. The interaction is a drag, so the tests are shaped
// like Shape Fit's: real pointer gestures, and "placed" is a POSITION rather
// than a class or an opacity.

import { test, expect, type Page } from '@playwright/test';

/**
 * Parts differ per country — a castle has four masses, a mountain three — so
 * the ids are read from the live DOM rather than hardcoded.
 */
async function partIds(page: Page): Promise<string[]> {
  return page.$$eval('[data-testid^="piece-"]', (nodes) =>
    nodes.map((n) => (n.getAttribute('data-testid') || '').replace('piece-', '')),
  );
}

async function openPuzzle(page: Page, code = 'nl') {
  await page.goto(`/games/puzzle/${code}`);
  await expect(page.getByTestId('puzzle-board')).toBeVisible({ timeout: 25_000 });
}

async function centre(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`${testId} has no box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Is a piece sitting in its cell? Detected by position. */
async function isPlaced(page: Page, id: string): Promise<boolean> {
  const piece = await page.getByTestId(`piece-${id}`).boundingBox();
  const cell = await page.getByTestId(`hole-${id}`).boundingBox();
  if (!piece || !cell) return false;
  const pc = { x: piece.x + piece.width / 2, y: piece.y + piece.height / 2 };
  const cc = { x: cell.x + cell.width / 2, y: cell.y + cell.height / 2 };
  return Math.hypot(pc.x - cc.x, pc.y - cc.y) < Math.max(cell.width, 40) / 1.5;
}

async function drag(page: Page, id: string, to: { x: number; y: number }) {
  const from = await centre(page, `piece-${id}`);
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
  await page.waitForTimeout(420);
}

test.describe('Puzzle', () => {
  test('lays out a board and one piece per part of the drawing', async ({ page }) => {
    await openPuzzle(page);
    const ids = await partIds(page);
    expect(ids.length).toBeGreaterThanOrEqual(3);
    for (const id of ids) {
      await expect(page.getByTestId(`hole-${id}`)).toBeVisible();
      await expect(page.getByTestId(`piece-${id}`)).toBeVisible();
    }
  });

  test('every piece is a legal tap target and on screen', async ({ page, viewport }) => {
    await openPuzzle(page);
    for (const id of await partIds(page)) {
      const box = await page.getByTestId(`piece-${id}`).boundingBox();
      expect(box).not.toBeNull();
      // CLAUDE.md rule 3.
      expect(box!.width).toBeGreaterThanOrEqual(90);
      expect(box!.height).toBeGreaterThanOrEqual(90);
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
    }
  });

  test('dragging a piece onto its own place puts it there', async ({ page }) => {
    await openPuzzle(page);
    const [first] = await partIds(page);
    expect(await isPlaced(page, first)).toBe(false);

    await drag(page, first, await centre(page, `hole-${first}`));

    expect(await isPlaced(page, first)).toBe(true);
  });

  test('a piece only fits its OWN place', async ({ page }) => {
    // The whole design: a part's outline follows the drawing, so it belongs in
    // exactly one socket.
    await openPuzzle(page);
    const ids = await partIds(page);
    const [first] = ids;
    const other = ids[ids.length - 1];

    await drag(page, first, await centre(page, `hole-${other}`));

    expect(await isPlaced(page, first)).toBe(false);
    expect(await isPlaced(page, other)).toBe(false);

    // And the same piece still works afterwards — a miss costs nothing.
    await drag(page, first, await centre(page, `hole-${first}`));
    expect(await isPlaced(page, first)).toBe(true);
  });

  test('assembles the picture and wins', async ({ page }) => {
    await openPuzzle(page);

    for (const id of await partIds(page)) {
      await drag(page, id, await centre(page, `hole-${id}`));
    }

    const overlay = page.getByTestId('win-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('You built it!');
  });

  test('finishing offers the NEXT place, not a replay', async ({ page }) => {
    // The old button replayed the same board, which for a child who just
    // succeeded is the least interesting possible next thing.
    await openPuzzle(page, 'nl');
    for (const id of await partIds(page)) {
      await drag(page, id, await centre(page, `hole-${id}`));
    }
    await expect(page.getByTestId('win-overlay')).toBeVisible();

    await page.getByRole('button', { name: 'Next place' }).click();

    await expect(page.getByTestId('puzzle-board')).toBeVisible();
    expect(page.url()).not.toContain('/puzzle/nl');
    expect(page.url()).toContain('/games/puzzle/');
  });

  test('the new board is laid out, not flown into', async ({ page }) => {
    // THE BUG THIS GUARDS: restarting reshuffles the tray, so a piece may land
    // in a different slot. Springing to the new slot from an offset measured
    // against the old one sent every piece flying diagonally to the wrong
    // place. A fresh board must simply BE.
    await openPuzzle(page);
    const ids = await partIds(page);
    await drag(page, ids[0], await centre(page, `hole-${ids[0]}`));
    expect(await isPlaced(page, ids[0])).toBe(true);

    await page.getByRole('button', { name: 'Start again' }).click();
    // Deliberately short: if pieces were animating home, they would still be
    // in flight here and nowhere near their slots.
    await page.waitForTimeout(120);

    for (const id of ids) {
      expect(await isPlaced(page, id), `${id} should be home already`).toBe(false);
      const box = await page.getByTestId(`piece-${id}`).boundingBox();
      expect(box, `${id} vanished`).not.toBeNull();
    }
  });

  test('nothing a pre-reader has to read in order to play', async ({ page }) => {
    // RULE 1 IS ABOUT DEPENDENCE, NOT ABOUT INK.
    //
    // The board carries a small title ("Build the house") and the tray is
    // labelled "pieces". Both are for whoever is sitting next to the child,
    // and the game is fully playable with neither: the instruction is the
    // dashed hole, which is a shape.
    //
    // What must never appear is a word the child NEEDS — a direction, a
    // choice, a number they have to act on. This asserts the labels are the
    // only text and that they say what they are allowed to say.
    await openPuzzle(page);
    const boardText = (await page.getByTestId('puzzle-board').innerText()).trim();

    expect(boardText.split('\n').filter(Boolean).length).toBe(1);
    expect(boardText).toMatch(/^Build the /);

    // No counts, scores or timers anywhere on the screen.
    const screen = await page.locator('body').innerText();
    expect(screen).not.toMatch(/\b\d+\s*\/\s*\d+\b/);
    expect(screen.toLowerCase()).not.toMatch(/score|time|left|wrong|try again/);
  });
});
