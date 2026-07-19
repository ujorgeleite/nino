---
name: verify
description: Quality gate for Pedrinho Travels — runs typecheck, lint and tests, fixes what breaks, and refuses to report success on a red suite. Use at the end of ANY code change, before telling the user something is done. Every other skill in this project ends by invoking this one.
---

# verify — the quality gate

This is the single place that decides whether a change is done. If this skill has
not passed, the work is not finished, regardless of how correct the code looks.

## The command

```bash
npm run verify   # tsc --noEmit && eslint . && jest
```

Run it from `pedrinho-travels/`. It short-circuits: a typecheck failure means lint
and tests never ran, so a "clean" tail of output can be misleading — always read
which stages actually executed.

Individual stages when iterating:

```bash
npm run typecheck
npm run lint
npm run test              # npm run test:watch while writing tests
npx jest hooks/useMemoryGame.test.ts   # single file
```

## The loop

1. Run `npm run verify`.
2. If it fails, read the **first** error. Later errors are often downstream of it.
3. Fix the cause, not the symptom (see "Fixing honestly" below).
4. Re-run. Repeat until clean.
5. Only then report the change as done.

## Fixing honestly

The purpose of this gate is to catch real defects. These moves defeat it and are
not allowed:

- Deleting, renaming, or `.skip`-ing a test to make the suite green.
- Loosening an assertion until it passes (`toBeDefined()` where the old test
  checked a value).
- Adding `@ts-ignore`, `@ts-expect-error`, `any`, or a non-null `!` to silence a
  type error that reflects a genuine gap.
- Adding an `eslint-disable` comment for a rule that just found a real bug.

Every one of these is legitimate *sometimes* — but only with a comment stating why
the rule is wrong here, never as a way past a red bar. When a suppression is
genuinely right, say so explicitly in your report to the user.

If a test fails and you believe the **test** is wrong rather than the code, do not
quietly rewrite it. State the case to the user and let them decide.

## Reporting

Report what actually happened:

- Clean: say so plainly. "`npm run verify` passes: typecheck, lint, 15 tests."
- Still failing: show the failing output. Do not describe a change as complete
  with a red suite, and do not bury the failure at the end of a long summary.
- Skipped a stage (e.g. could not install a dep): say which and why.

## Known-good baseline

As of the harness setup, `npm run verify` is clean with 0 lint errors and 0
warnings. **Any** new warning is therefore a regression introduced by the current
change — treat it as a finding, not as background noise.

## Beyond the gate

`verify` proves the code compiles, conforms and passes unit tests. It does **not**
prove the app runs. For changes to native modules (Skia, Reanimated, Lottie,
expo-audio, haptics), navigation, or anything visual, also confirm the app boots:

```bash
npx expo start
```

and tell the user what you did or did not verify on a real device. Jest mocks the
native layer (see `jest.setup.ts`) — a green suite says nothing about whether a
Skia canvas or a haptic actually fires on an iPad.
