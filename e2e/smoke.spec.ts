// e2e/smoke.spec.ts
// Proves the harness works and the app actually boots before anything else
// is worth asserting.

import { test, expect } from '@playwright/test';

test('the app boots and reaches the menu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/');

  // Splash holds ~1.6s, then the Menu's single primary action appears.
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: 20_000 });

  expect(errors, `console/page errors:\n${errors.join('\n')}`).toEqual([]);
});
