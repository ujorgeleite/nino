#!/usr/bin/env node
// scripts/check-bundle.js
// Guards the shipped size.
//
// The app is 100% offline (CLAUDE.md rule 7), so every country's scene data,
// sound effect and music loop ships inside it. That is fine — until it isn't.
// This makes the budget explicit and fails when it creeps.
//
// Run: node scripts/check-bundle.js   (or `make check-bundle`)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** Budgets in MB. Raise deliberately, with a reason, never to make CI pass. */
const BUDGETS = {
  // 22 loops: eleven countries × two game arrangements. Doubling the count was
  // a deliberate feature (music personalised per game), not creep — the budget
  // was raised to match, once, with this note.
  'assets/music': 10,
  'assets/sounds': 1, //    10 interface cues
  'assets/sounds/items': 0.8, // 21 item voices, now at 22.05 kHz for formants
  'assets/mascot': 0.1, //  2 SVGs
};

function dirSize(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    total += fs.statSync(path.join(full, entry.name)).size;
  }
  return total / 1024 / 1024;
}

let failed = false;
console.log('asset budgets\n');
for (const [dir, budget] of Object.entries(BUDGETS)) {
  const mb = dirSize(dir);
  const ok = mb <= budget;
  if (!ok) failed = true;
  console.log(
    `  ${ok ? '✓' : '✖'} ${dir.padEnd(16)} ${mb.toFixed(2)} MB / ${budget} MB`,
  );
}

const total = Object.keys(BUDGETS).reduce((sum, d) => sum + dirSize(d), 0);
console.log(`\n  total assets: ${total.toFixed(2)} MB`);

if (failed) {
  console.error('\n✖ asset budget exceeded — see scripts/check-bundle.js\n');
  process.exit(1);
}
process.exit(0);
