#!/usr/bin/env node
// scripts/check-offline.js
// The app promises parents it never touches the network. This holds it to it.
//
// WHY A SCRIPT AND NOT A CODE REVIEW
//
// components/screens/ParentPanel.tsx tells a parent, in writing, "100% offline",
// "No ads ever" and "Data stays on device", and components/screens/PrivacyNotice.tsx
// repeats it as a privacy policy. Those are promises to a person about their
// child, and CLAUDE.md rule 7 makes it a product rule as well.
//
// It is true today. The risk is later: the moment in-app purchase work starts,
// the natural first step is to add RevenueCat or a store SDK, and several of
// those bundle analytics that phone home by default. Nobody would edit the
// panel copy while doing it, so the app would quietly start collecting data
// while still promising it does not. That is the failure this prevents — not a
// developer typing `fetch`, but a dependency doing it out of sight.
//
// Scope is deliberately the app's own source. node_modules is not scanned:
// this cannot prove a transitive dependency is silent, and pretending to would
// be worse than being clear about what it does check.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = ['app', 'components', 'hooks', 'constants', 'utils'];

/** Networking the app must never reach for. */
const CALLS = [
  { pattern: /\bfetch\s*\(/, what: 'fetch()' },
  { pattern: /\bXMLHttpRequest\b/, what: 'XMLHttpRequest' },
  { pattern: /\bnew\s+WebSocket\b/, what: 'WebSocket' },
  { pattern: /\bnavigator\.sendBeacon\b/, what: 'sendBeacon' },
  { pattern: /\bEventSource\b/, what: 'EventSource' },
];

/** Packages that talk to a network, or bring something that does. */
const PACKAGES = [
  'axios',
  'react-native-purchases',
  'expo-in-app-purchases',
  'react-native-iap',
  '@sentry/',
  'firebase',
  '@react-native-firebase/',
  'amplitude',
  'mixpanel',
  'posthog',
  'segment',
  '@segment/',
  'react-native-google-mobile-ads',
  'expo-updates',
  'expo-tracking-transparency',
];

function sourceFiles(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  const out = [];
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

const findings = [];

for (const file of DIRS.flatMap(sourceFiles)) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    // A line that is only a comment cannot call anything.
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;

    for (const { pattern, what } of CALLS) {
      if (pattern.test(line)) findings.push(`${file}:${i + 1}  ${what}`);
    }

    const imported = line.match(/from\s+['"]([^'"]+)['"]/);
    if (imported) {
      const pkg = imported[1];
      for (const banned of PACKAGES) {
        if (pkg === banned || pkg.startsWith(banned)) {
          findings.push(`${file}:${i + 1}  imports ${pkg}`);
        }
      }
    }
  });
}

// The same packages must not be dependencies at all: one in package.json is
// one that will be imported eventually.
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
for (const dep of Object.keys(pkg.dependencies ?? {})) {
  for (const banned of PACKAGES) {
    if (dep === banned || dep.startsWith(banned)) {
      findings.push(`package.json  depends on ${dep}`);
    }
  }
}

if (findings.length > 0) {
  console.error('\n✖ This app promises parents it is 100% offline.\n');
  for (const finding of findings) console.error(`  ${finding}`);
  console.error(
    '\n  ParentPanel.tsx and PrivacyNotice.tsx say, in writing, that nothing\n' +
      '  leaves the device. Either this network access goes, or that copy and\n' +
      "  the App Store privacy declaration have to change first — a child's\n" +
      '  data is not something to get wrong quietly.\n',
  );
  process.exit(1);
}

console.log('✓ no network access — the offline promise holds');
