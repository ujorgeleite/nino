#!/usr/bin/env node
// scripts/check-worklets.js
// Fails when a worklet body calls a project function that is not itself a
// worklet.
//
// WHY THIS EXISTS: `useAnimatedStyle` and friends run on the UI thread, where
// only worklets exist. Calling a plain JS helper from there fails on device —
// and is COMPLETELY INVISIBLE on web, where React Native Web has no second
// thread. The memory-card flip shipped broken exactly this way: unit tests
// green, web E2E green, blank cards on a real iPad.
//
// Static analysis is the only cheap way to catch this without a device.
//
// Run: node scripts/check-worklets.js   (or `make check-worklets`)

const fs = require('fs');
const path = require('path');

const ROOTS = ['components', 'app', 'hooks'];

// Reanimated built-ins and language globals are always safe inside a worklet.
const SAFE = new Set([
  'withTiming', 'withSpring', 'withSequence', 'withRepeat', 'withDelay', 'withDecay',
  'runOnJS', 'runOnUI', 'interpolate', 'interpolateColor', 'Extrapolate', 'Easing',
  'useAnimatedStyle', 'useDerivedValue', 'useSharedValue', 'useAnimatedReaction',
  'cancelAnimation', 'measure', 'scrollTo',
  'Math', 'Number', 'String', 'Boolean', 'Array', 'Object', 'JSON',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
]);

const WORKLET_CTX =
  /(useAnimatedStyle|useDerivedValue|useAnimatedReaction|\.onStart|\.onUpdate|\.onEnd|\.onBegin|\.onFinalize|'worklet';)/;
const CALL = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) out.push(full);
  }
  return out;
}

/**
 * True if the named function is declared with a 'worklet' directive.
 *
 * The directive is looked for in the first few *statements*, skipping leading
 * comments — a generous window, because an explanatory comment above the
 * directive is normal and must not read as a missing directive.
 */
function isWorklet(src, name) {
  const decl = new RegExp(
    `(?:function\\s+${name}\\s*\\([^)]*\\)[^{]*\\{|const\\s+${name}\\s*=[^;]*?=>\\s*\\{)([\\s\\S]{0,900})`,
  );
  const m = src.match(decl);
  if (!m) return false;

  // Strip comments, then require the directive to be among the first lines.
  const head = m[1]
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .split('\n')
    .filter((l) => l.trim())
    .slice(0, 3)
    .join('\n');

  return /['"]worklet['"]\s*;/.test(head);
}

const problems = [];

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;

  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');

    lines.forEach((line, i) => {
      if (!WORKLET_CTX.test(line)) return;

      // Take a bounded window as the callback body.
      let depth = 0;
      const body = [];
      for (let j = i; j < Math.min(i + 40, lines.length); j++) {
        body.push(lines[j]);
        depth +=
          (lines[j].match(/[{(]/g) || []).length - (lines[j].match(/[})]/g) || []).length;
        if (j > i && depth <= 0) break;
      }
      const text = body.join('\n');

      for (const [, name] of text.matchAll(CALL)) {
        if (SAFE.has(name)) continue;

        // Only care about functions this project defines or imports locally.
        const declaredHere = new RegExp(`(function\\s+${name}\\b|const\\s+${name}\\s*=)`).test(src);
        const importedLocally = new RegExp(
          `import[^;]*\\b${name}\\b[^;]*from\\s+'\\.\\.?/`,
        ).test(src);
        if (!declaredHere && !importedLocally) continue;

        if (declaredHere && isWorklet(src, name)) continue;

        problems.push({
          file,
          line: i + 1,
          name,
          imported: importedLocally && !declaredHere,
        });
      }
    });
  }
}

// De-duplicate per (file, name).
const seen = new Set();
const unique = problems.filter((p) => {
  const key = `${p.file}:${p.name}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

if (unique.length === 0) {
  console.log('✓ no worklet boundary violations');
  process.exit(0);
}

console.error('\n✖ worklet boundary violations\n');
for (const p of unique) {
  console.error(`  ${p.file}:${p.line}`);
  console.error(`    calls ${p.name}() from a worklet, but it is not a worklet.`);
  console.error(
    p.imported
      ? `    It is imported from another module — add 'worklet'; there, or inline the logic.`
      : `    Add "'worklet';" as the first statement of ${p.name}.`,
  );
  console.error('');
}
console.error('This breaks on device while looking fine on web. See the motion skill.\n');
process.exit(1);
