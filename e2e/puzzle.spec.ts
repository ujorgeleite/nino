// e2e/puzzle.spec.ts
// The jigsaw, driven end to end.
//
// This game replaced Memory. The interaction is a drag, so the tests are shaped
// like Shape Fit's: real pointer gestures, and "placed" is a POSITION rather
// than a class or an opacity.

import { test, expect, type Page } from '@playwright/test';

/** One piece per shape. Shape is what tells a child where it goes. */
const CELLS = ['circle', 'square', 'triangle', 'star'];

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
  const cell = await page.getByTestId(`cell-${id}`).boundingBox();
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
  test('lays out a board and four shaped pieces', async ({ page }) => {
    await openPuzzle(page);
    for (const id of CELLS) {
      await expect(page.getByTestId(`cell-${id}`)).toBeVisible();
      await expect(page.getByTestId(`piece-${id}`)).toBeVisible();
    }
  });

  test('every piece is a legal tap target and on screen', async ({ page, viewport }) => {
    await openPuzzle(page);
    for (const id of CELLS) {
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

  test('dragging a piece onto its own cell places it', async ({ page }) => {
    await openPuzzle(page);
    expect(await isPlaced(page, 'circle')).toBe(false);

    await drag(page, 'circle', await centre(page, 'cell-circle'));

    expect(await isPlaced(page, 'circle')).toBe(true);
  });

  test('dropping on the WRONG cell returns the piece', async ({ page }) => {
    await openPuzzle(page);

    await drag(page, 'circle', await centre(page, 'cell-star'));

    expect(await isPlaced(page, 'circle')).toBe(false);
    expect(await isPlaced(page, 'star')).toBe(false);

    // And the same piece still works afterwards — a miss costs nothing.
    await drag(page, 'circle', await centre(page, 'cell-circle'));
    expect(await isPlaced(page, 'circle')).toBe(true);
  });

  test('assembles the picture and wins', async ({ page }) => {
    await openPuzzle(page);

    for (const id of CELLS) {
      await drag(page, id, await centre(page, `cell-${id}`));
    }

    const overlay = page.getByTestId('win-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('You made the picture!');
  });

  test('finishing offers the NEXT place, not a replay', async ({ page }) => {
    // The old button replayed the same board, which for a child who just
    // succeeded is the least interesting possible next thing.
    await openPuzzle(page, 'nl');
    for (const id of CELLS) {
      await drag(page, id, await centre(page, `cell-${id}`));
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
    await drag(page, 'circle', await centre(page, 'cell-circle'));
    expect(await isPlaced(page, 'circle')).toBe(true);

    await page.getByRole('button', { name: 'Start again' }).click();
    // Deliberately short: if pieces were animating home, they would still be
    // in flight here and nowhere near their slots.
    await page.waitForTimeout(120);

    for (const id of CELLS) {
      expect(await isPlaced(page, id), `${id} should be home already`).toBe(false);
      const box = await page.getByTestId(`piece-${id}`).boundingBox();
      expect(box, `${id} vanished`).not.toBeNull();
    }
  });

  test('no text a pre-reader would need to read', async ({ page }) => {
    await openPuzzle(page);
    const boardText = await page.getByTestId('puzzle-board').innerText();
    expect(boardText).not.toMatch(/[a-zA-Z0-9]/);
  });
});
