---
name: game-logic-hook
description: Rules for writing and changing hooks in hooks/ — where all game logic lives in Pedrinho Travels. Use when creating or editing any useX hook, especially game state machines. Guarantees the logic stays testable without a device and the app stays scalable as games are added.
---

# game-logic-hook — logic that stays testable

`CLAUDE.md` says: *"hooks/ — business logic, never put logic in components."* This
skill is what makes that rule hold as the app grows past one game.

The payoff is concrete: `useMemoryGame` has 11 tests that run in 0.3s with no
simulator, because the hook never touches a native module. Every new hook must
keep that property.

## The contract

A hook in `hooks/` must:

1. **Never import from `components/` or `app/`.** Dependencies point one way.
   Logic knows nothing about what renders it.

2. **Never call native side effects directly** — no `expo-haptics`, no
   `expo-audio`, no navigation. Instead expose an **event channel** the component
   reacts to. This is the existing pattern:

   ```ts
   // hooks/useMemoryGame.ts — the hook only reports what happened
   lastEvent: 'match' | 'mismatch' | 'flip' | null;
   ```

   ```tsx
   // app/games/memory.tsx — the component decides what that feels like
   useEffect(() => {
     if (lastEvent === 'match') Haptics.notificationAsync(Success).catch(() => {});
   }, [lastEvent]);
   ```

   Follow it. A hook that calls `Haptics` directly cannot be tested without
   mocking, and mixes "what the game means" with "how the device responds".

3. **Never call `Math.random()` inline.** Use `utils/shuffle.ts`, or accept a seed
   as a parameter. Randomness reached through a seam can be pinned in a test;
   randomness inline cannot. (`components/cards/WoodCard.tsx` already does this
   with its seeded Lehmer RNG for grain — same reasoning.)

4. **Derive, don't duplicate.** State that can be computed from other state is a
   `useMemo`, not a second `useState`:

   ```ts
   const isWon = useMemo(
     () => cards.length > 0 && cards.every((c) => c.status === 'matched'),
     [cards],
   );
   ```
   Two sources of truth drift; one derived value cannot.

5. **Export its types.** `export type BoardCard`, `export type MemoryGame`.
   Components import them with `import type`.

6. **Return a stable shape.** Callbacks wrapped in `useCallback`, so consuming
   components do not re-render on every tick.

7. **Never write to a shared value inside `useMemo`.** `useMemo` must stay pure —
   it may run more than once per commit. Side effects go in `useEffect`. (This was
   a real bug in `useCardFlip.ts`, caught by `react-hooks/immutability`.)

## Toddler-UX constraints, encoded in the state machine

These are not UI concerns — they are shape-of-the-state decisions, so they belong
here (see `docs/TODDLER_UX.md`, `CLAUDE.md` rules 2 and 5):

- **No score, no lives, no timer.** If you are adding one of these fields, stop:
  it violates rule 2. `useMemoryGame` has a test asserting their absence.
- **No terminal fail state.** Every wrong move must return the board to a playable
  state. Mismatch → brief lock → flip back down. Never a dead end.
- **Locks must always release.** Any `setLocked(true)` needs a guaranteed path to
  `setLocked(false)`. A stuck lock is an unplayable app for a 2-year-old who
  cannot understand why tapping stopped working.

## Every hook ships with its test

Same commit, no exceptions. `hooks/useMemoryGame.test.ts` is the reference —
copy its structure. Test through the public API only.

```ts
import { act, renderHook } from '@testing-library/react-native';

const { result } = renderHook(() => useMyGame());
act(() => result.current.doThing());
expect(result.current.someState).toBe(...);
```

Cover at minimum:

- **Initial state** — correct size, everything in the starting position.
- **Each event type** the hook can emit.
- **The full win path** — play the game to completion, assert `isWon` flips only
  at the very end (not one move early).
- **Recovery from a wrong move** — the no-fail-state guarantee.
- **Guard conditions** — taps while locked, taps on an already-consumed item,
  double taps. Toddlers tap fast and repeatedly; these are the real cases.
- **`reset()`** — returns to a genuine initial state, clears the event channel.

Use fake timers for anything on a delay:

```ts
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
act(() => jest.advanceTimersByTime(900));
```

## File shape

```ts
// hooks/useMyGame.ts
// One line on what this owns.
// Toddler UX rules (docs/TODDLER_UX.md): no fail state, no score, no timer.

import { useCallback, useMemo, useState } from 'react';

export type MyGameEvent = 'hit' | 'miss' | null;
export type MyGame = { /* ... */ };

export function useMyGame(): MyGame { /* ... */ }
```

## Finish

Run the `verify` skill. A hook without a passing test file is not done.
