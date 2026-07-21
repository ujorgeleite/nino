// e2e/helpers/placed.ts
// What "this block is in its hole" means, in one place.
//
// It used to mean "the dragged piece has travelled to the hole", which was
// true of an older design and is not true of this one. A placed block is drawn
// BY THE BOARD, inside the hole; the piece the child dragged is hidden the
// instant it lands and stays in the tray. Tests that kept measuring the piece
// were measuring something that deliberately no longer moves.
//
// The observation lives here so the next change to how placement LOOKS has one
// place to update, rather than five specs quietly disagreeing.

import type { Page } from '@playwright/test';

/** Is this block sitting in its hole? Answered by what the board draws. */
export async function isPlaced(page: Page, id: string): Promise<boolean> {
  const drawn = await page.getByTestId(`hole-${id}`).locator('svg').first().count();
  return drawn > 0;
}

/** Every block id on the current board, read from the live DOM. */
export async function blockIds(page: Page): Promise<string[]> {
  return page.$$eval('[data-testid^="piece-"]', (nodes) =>
    nodes.map((n) => (n.getAttribute('data-testid') || '').replace('piece-', '')),
  );
}
