#!/usr/bin/env node
// scripts/check-jest-expect.js
// Catches `expect(value, 'message')` in Jest tests.
//
// WHY THIS EXISTS: Playwright's expect takes a message as a second argument;
// Jest's does not — it throws "Expect takes at most one argument" at runtime.
// The two APIs look identical and this project uses BOTH, so the mistake is
// easy to make and only shows up when that specific test runs.
//
// It has now been made three separate times in this repo. A linter is cheaper
// than a fourth.
//
// Run: node scripts/check-jest-expect.js   (or via `make verify`)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
/** Jest lives everywhere except e2e/, which is Playwright's. */
const SEARCH = ['components', 'hooks', 'constants', 'utils', 'app'];

/** expect( ... , '...' )  — a second argument that is a string literal. */
const OFFENDER = /\bexpect\(([^()]|\([^()]*\))*,\s*[`'"]/;

function walk(dir, out = []) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.test\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const problems = [];
for (const dir of SEARCH) {
  for (const file of walk(dir)) {
    const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (OFFENDER.test(line)) problems.push({ file, line: i + 1, text: line.trim() });
    });
  }
}

if (problems.length === 0) {
  console.log('✓ no Playwright-style expect() in Jest tests');
  process.exit(0);
}

console.error('\n✖ Jest expect() called with a message argument\n');
for (const p of problems) {
  console.error(`  ${p.file}:${p.line}`);
  console.error(`    ${p.text}`);
}
console.error(
  '\n  Jest expect() takes ONE argument. That signature is Playwright\'s.',
);
console.error('  Put the context in the compared value instead.\n');
process.exit(1);
