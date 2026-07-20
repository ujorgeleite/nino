// e2e/memory.spec.ts
// Memory (Netherlands) driven end to end through the real UI.
//
// The card testIDs are `card-<itemId>-<n>`, so a pair is discoverable from the
// DOM. That makes the shuffled deck deterministic to test without reaching
// into app state.

import { test, expect, type Page } from '@playwright/test';

const FLIP_SETTLE_MS = 600; // flipOpen 380ms + margin
const MISMATCH_MS = 900;

async function openMemory(page: Page) {
  await page.goto('/');

  // The Play button breathes forever by design (§5b), so Playwright's
  // "wait until the element stops moving" check never passes. `force` skips
  // only that stability wait — visibility is still asserted first, so a
  // genuinely broken or covered button would still fail the test.
  const play = page.getByRole('button', { name: 'Play' });
  await expect(play).toBeVisible({ timeout: 20_000 });
  await play.click({ force: true });

  // One flat grid of games. This spec covers the reference country in depth;
  // e2e/countries.spec.ts sweeps all eleven.
  await page.getByTestId('game-memory-nl').click();
  await expect(page.getByTestId('memory-board')).toBeVisible();
}

/** Every card's instanceId, read from the live DOM. */
async function cardIds(page: Page): Promise<string[]> {
  return page.$$eval('[data-testid^="card-"]', (nodes) =>
    nodes
      .map((n) => n.getAttribute('data-testid') || '')
      .filter((id) => !id.endsWith('-front') && !id.endsWith('-back'))
      .map((id) => id.replace(/^card-/, '')),
  );
}

/** Computed opacity of a card's two faces. */
async function faceOpacities(page: Page, instanceId: string) {
  const read = async (suffix: string) =>
    Number(
      await page
        .getByTestId(`card-${instanceId}-${suffix}`)
        .evaluate((el) => getComputedStyle(el).opacity),
    );
  return { front: await read('front'), back: await read('back') };
}

const itemOf = (instanceId: string) => instanceId.replace(/-\d+$/, '');

function findPair(ids: string[]): [string, string] {
  const byItem = new Map<string, string[]>();
  for (const id of ids) {
    const list = byItem.get(itemOf(id)) ?? [];
    list.push(id);
    byItem.set(itemOf(id), list);
  }
  for (const [, list] of byItem) if (list.length === 2) return [list[0], list[1]];
  throw new Error('no pair found in deck');
}

function findMismatch(ids: string[]): [string, string] {
  const a = ids[0];
  const b = ids.find((id) => itemOf(id) !== itemOf(a));
  if (!b) throw new Error('no mismatched pair found');
  return [a, b];
}

test.describe('Memory NL', () => {
  test('deals ten cards, all face down and visible', async ({ page }) => {
    await openMemory(page);
    const ids = await cardIds(page);
    expect(ids).toHaveLength(10);

    // THE REGRESSION THAT SHIPPED TWICE: cards rendered blank, then rendered
    // the face that was turned away. Assert the back is actually showing.
    for (const id of ids) {
      const { front, back } = await faceOpacities(page, id);
      expect(back, `card ${id} back should be visible`).toBe(1);
      expect(front, `card ${id} front should be hidden`).toBe(0);
    }
  });

  test('every card is a legal tap target and on screen', async ({ page }) => {
    await openMemory(page);
    for (const id of await cardIds(page)) {
      const box = await page.getByTestId(`card-${id}`).boundingBox();
      expect(box, `card ${id} has no box`).not.toBeNull();
      // CLAUDE.md rule 3 — 90pt floor.
      expect(box!.width).toBeGreaterThanOrEqual(90);
      expect(box!.height).toBeGreaterThanOrEqual(90);
      // Fully inside the viewport.
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(1180);
      expect(box!.y + box!.height).toBeLessThanOrEqual(820);
    }
  });

  test('tapping a card flips it face up', async ({ page }) => {
    await openMemory(page);
    const [id] = await cardIds(page);

    await page.getByTestId(`card-${id}`).click();
    await page.waitForTimeout(FLIP_SETTLE_MS);

    const { front, back } = await faceOpacities(page, id);
    expect(front, 'the item face must be showing after a tap').toBe(1);
    expect(back).toBe(0);
  });

  test('a matching pair stays up and lights the progress rail', async ({ page }) => {
    await openMemory(page);
    const [a, b] = findPair(await cardIds(page));

    await page.getByTestId(`card-${a}`).click();
    await page.getByTestId(`card-${b}`).click();
    await page.waitForTimeout(FLIP_SETTLE_MS);

    expect((await faceOpacities(page, a)).front).toBe(1);
    expect((await faceOpacities(page, b)).front).toBe(1);

    // The rail token for that item must now read as found.
    const token = page.getByTestId(`rail-${itemOf(a)}`);
    await expect(token).toHaveAttribute('aria-label', /: found$/);
  });

  test('a mismatch flips back and costs nothing', async ({ page }) => {
    await openMemory(page);
    const [a, b] = findMismatch(await cardIds(page));

    await page.getByTestId(`card-${a}`).click();
    await page.getByTestId(`card-${b}`).click();
    await page.waitForTimeout(FLIP_SETTLE_MS);

    expect((await faceOpacities(page, a)).front).toBe(1);

    // Rule 2: no fail state. Both must return to playable.
    await page.waitForTimeout(MISMATCH_MS + FLIP_SETTLE_MS);
    expect((await faceOpacities(page, a)).back).toBe(1);
    expect((await faceOpacities(page, b)).back).toBe(1);

    // And the same card can still be played afterwards.
    await page.getByTestId(`card-${a}`).click();
    await page.waitForTimeout(FLIP_SETTLE_MS);
    expect((await faceOpacities(page, a)).front).toBe(1);
  });

  test('plays through to the win overlay', async ({ page }) => {
    await openMemory(page);
    const ids = await cardIds(page);

    const byItem = new Map<string, string[]>();
    for (const id of ids) {
      const list = byItem.get(itemOf(id)) ?? [];
      list.push(id);
      byItem.set(itemOf(id), list);
    }

    for (const [, [a, b]] of byItem) {
      await page.getByTestId(`card-${a}`).click();
      await page.getByTestId(`card-${b}`).click();
      await page.waitForTimeout(FLIP_SETTLE_MS);
    }

    const overlay = page.getByTestId('win-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('You found them all!');
    // A perfect game is 5 attempts.
    await expect(overlay).toContainText('in 5 tries');

    // Every rail token is lit.
    for (const item of byItem.keys()) {
      await expect(page.getByTestId(`rail-${item}`)).toHaveAttribute('aria-label', /: found$/);
    }
  });

  test('play again deals a fresh face-down board', async ({ page }) => {
    await openMemory(page);
    const ids = await cardIds(page);
    const byItem = new Map<string, string[]>();
    for (const id of ids) {
      const list = byItem.get(itemOf(id)) ?? [];
      list.push(id);
      byItem.set(itemOf(id), list);
    }
    for (const [, [a, b]] of byItem) {
      await page.getByTestId(`card-${a}`).click();
      await page.getByTestId(`card-${b}`).click();
      await page.waitForTimeout(FLIP_SETTLE_MS);
    }
    await expect(page.getByTestId('win-overlay')).toBeVisible();

    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByTestId('win-overlay')).toBeHidden();
    await page.waitForTimeout(FLIP_SETTLE_MS);

    for (const id of await cardIds(page)) {
      expect((await faceOpacities(page, id)).back).toBe(1);
    }
  });

  test('restart mid-game clears the board', async ({ page }) => {
    await openMemory(page);
    const [a] = await cardIds(page);
    await page.getByTestId(`card-${a}`).click();
    await page.waitForTimeout(FLIP_SETTLE_MS);

    await page.getByRole('button', { name: 'Start again' }).click();
    await page.waitForTimeout(FLIP_SETTLE_MS);

    for (const id of await cardIds(page)) {
      expect((await faceOpacities(page, id)).back).toBe(1);
    }
  });

  test('the mute toggle flips state and persists across a reload', async ({ page }) => {
    await openMemory(page);

    await page.getByRole('button', { name: 'Turn sound off' }).click();
    await expect(page.getByRole('button', { name: 'Turn sound on' })).toBeVisible();

    // expo-router puts the game in the URL, so a reload comes back here
    // directly rather than to the menu.
    await page.reload();
    await expect(page.getByTestId('memory-board')).toBeVisible({ timeout: 20_000 });

    // Persisted through AsyncStorage → localStorage.
    await expect(page.getByRole('button', { name: 'Turn sound on' })).toBeVisible();
  });

  test('shows no text a pre-reader would need to read', async ({ page }) => {
    await openMemory(page);
    const boardText = await page.getByTestId('memory-board').innerText();
    // Emoji only — no words, no digits (CLAUDE.md rule 1).
    expect(boardText).not.toMatch(/[a-zA-Z0-9]/);
  });
});
