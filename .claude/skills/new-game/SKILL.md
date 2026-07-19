---
name: new-game
description: Implements a new mini-game in Pedrinho Travels from a spec in docs/specs/. Use when asked to "implement the spec at docs/specs/GAME_X.md", to add a new game, or to create a game spec. Builds the vertical slice in dependency order — constants, tested hook, presentational components, thin route — reusing what already exists.
---

# new-game — implement a game from its spec

This executes the workflow described in prose in `CLAUDE.md` ("How to add a new
game"). `docs/specs/` is currently empty; the first game built through here sets
the pattern for every one after it.

## 1. Get a spec first

Never start from a one-line request. If `docs/specs/GAME_[NAME].md` does not
exist, create it from `docs/GAME_SPEC_TEMPLATE.md` and **ask the user** about
anything the template leaves blank. The template's required sections:

Summary · Target age · Reference app · Mechanic · Gestures used · Content table ·
Pedro reactions (correct / incorrect / complete, min 3s) · Screen layout ·
Unlock state (free or paid) · File to create · Components needed · Estimated time

Two questions matter most and are usually underspecified — ask them explicitly:

- **What does a wrong move do?** There is no fail state (rule 2). The answer must
  be a gentle recovery, never a loss.
- **What ends the game?** Sessions are 3–5 minutes (rule 5). It must be reachable
  by a 2-year-old without instruction.

If the spec implies a mechanic a 2-year-old cannot perform — dragging along a
path, long press, timing, sequencing more than two steps — flag it before writing
code. Check the mechanic against `docs/TODDLER_UX.md` first.

## 2. Read before writing

- The spec itself
- `docs/TODDLER_UX.md` — the user model
- `docs/DESIGN_SYSTEM.md` — tokens
- `docs/ANIMATION_GUIDELINES.md` — motion vocabulary
- The existing Memory Match slice as the reference implementation:
  `constants/cards.ts` → `hooks/useMemoryGame.ts` → `components/board/GameBoard.tsx`
  → `app/games/memory.tsx`

## 3. Reuse before creating

Search for an existing implementation before writing a new one. Already available:

| Need | Use |
|---|---|
| Mascot with moods | `components/mascot/PedroMascot.tsx` (`idle`/`celebrate`/`oops`) |
| Wooden face-down tile | `components/cards/WoodCard.tsx` |
| Face-up tile | `components/cards/CardFront.tsx` |
| Win celebration | `components/screens/WinScreen.tsx` |
| Card flip animation | `hooks/useCardFlip.ts` |
| Non-mutating shuffle | `utils/shuffle.ts` |
| Colors, spacing, timings | `constants/theme.ts` |

If a component needs to serve a second game, **generalize it via props** rather
than forking it. A `WoodCard2.tsx` is how this codebase would rot.

## 4. Build in dependency order

Bottom-up. Each layer is verifiable before the next one exists.

**a. Content — `constants/[game].ts`**
Data only, `as const`. Follow `constants/cards.ts`: exported types, and any
human-readable `label` marked parent-facing (the child never sees text).

**b. Logic — `hooks/use[Game].ts` + `hooks/use[Game].test.ts`**
The heart of the work. **Follow the `game-logic-hook` skill** — it defines the
contract (no native calls, event channel instead of direct haptics, no
`Math.random` inline, no score/lives/timer) and the required test coverage.

Write the hook and its tests together, before any UI exists. At this point
`npm run test` should already pass and the game should be fully playable in the
abstract.

**c. Presentation — `components/[domain]/`**
**Follow the `ui-component` skill.** Purely presentational: props in, elements
out. All state arrives from the hook.

**d. Motion and feedback**
**Follow the `motion` skill** for animations, haptics and sound.

**e. Route — `app/games/[name].tsx`**
Thin. Consume the hook, map `lastEvent` to feedback, render the screen.
`app/games/memory.tsx` (50 lines) is the ceiling for how much a route should do.

## 5. Wire it up

- Add navigation from `HomeScreen` — but respect **rule: one primary action per
  screen**. If home now needs several game buttons, that is a real design change:
  raise it with the user, do not quietly cram in a second button.
- Check the unlock state from the spec. Business model: first 2 games free, rest
  behind a one-time IAP. **There is no persistence layer installed yet** (no
  AsyncStorage, no MMKV, no IAP library). If the spec marks a game as paid, say so
  — that infrastructure is a separate, unbuilt piece of work.
- `expo-router` uses file-based routing with `typedRoutes: true`; the route type
  regenerates on `expo start`.

## 6. Verify

1. Run the `verify` skill — typecheck, lint, tests must be clean.
2. Run the `toddler-ux-review` skill against the new game.
3. `npx expo start` and confirm it actually plays on a device. Unit tests mock the
   entire native layer; they cannot tell you whether the game is playable.

Report honestly which of these three you completed.

## Definition of done

- Spec exists at `docs/specs/GAME_[NAME].md` and matches what was built
- Hook has a test file covering initial state, each event, the full win path,
  wrong-move recovery, and guard conditions
- Zero hardcoded pixel values; all sizing from tokens or `useWindowDimensions()`
- Every tap has haptic + sound feedback within 100ms
- No text in the play area, no fail state, no score, no timer
- `npm run verify` clean
- Confirmed running on device
