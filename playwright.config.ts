// playwright.config.ts
// End-to-end tests against the app running for real — real rendering, real
// layout, real gestures.
//
// WHY WEB: true E2E needs the app running, and that means a simulator or a
// device. This machine has no Xcode, so neither Detox nor Maestro can run. The
// app does bundle for web (nothing in the live tree needs a native-only
// module), so Playwright drives the real thing in a browser instead.
//
// WHAT THIS DOES AND DOES NOT PROVE:
//   ✓ screen wiring, navigation, game rules end to end
//   ✓ elements actually render, are visible, and are hit-testable
//   ✓ the flip actually shows a face — the bug class that shipped twice
//   ✗ iPad-specific layout, real touch, haptics, native audio, on-device perf
// A green run here is necessary, not sufficient. Device testing still matters.

import { defineConfig, devices } from '@playwright/test';

const PORT = 8099;

export default defineConfig({
  testDir: './e2e',
  // Animations make timing-sensitive assertions flaky if run in parallel with
  // a shared server; the suite is small enough to keep serial and stable.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],

  use: {
    baseURL: `http://localhost:${PORT}`,
    // iPad landscape — the primary target device.
    viewport: { width: 1180, height: 820 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    // The primary target. iPad Pro 11" in landscape.
    {
      name: 'ipad-landscape',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 } },
    },
    // The tight case: iPhone in landscape. Five cards across 844pt is where
    // the 90pt tap floor is hardest to hold, so the layout tests matter most
    // here. Spec §0: "must also work on iPhone landscape".
    {
      name: 'iphone-landscape',
      use: { ...devices['Desktop Chrome'], viewport: { width: 844, height: 390 } },
    },
  ],

  // Build once, then serve the static export. Deterministic, and much faster
  // than booting the Metro dev server per run.
  webServer: {
    command: `npx expo export --platform web --output-dir dist >/dev/null 2>&1 && npx http-server dist -p ${PORT} -s --proxy http://localhost:${PORT}?`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
