---
name: toddler-ux-review
description: Audits changed code in Pedrinho Travels against the 10 non-negotiable rules in CLAUDE.md and docs/TODDLER_UX.md — tap target sizes, hardcoded pixels, missing feedback, fail states, text in the play area. Use before considering any feature done, or when asked to review UX for the 2-year-old target user.
---

# toddler-ux-review — audit against the 2-year-old

The target user is **2 years old**. `CLAUDE.md` calls this non-negotiable: every
decision is validated against a 2-year-old, not a 5-year-old.

This skill reports findings. It **does not rewrite code on its own** — it hands
the user a list with `file:line` so they decide. (Exception: if the user asked for
the fixes, apply them and re-run.)

## Scope

Review the current change. `git diff`, or the files just written. Reviewing the
whole codebase every time buries the new problems under the known ones.

## The checklist

Walk all ten. For each finding record `file:line`, the rule, and what breaks
**for the child** — not the abstract violation.

### 1. No text instructions in-game
The child cannot read. Search the play area for rendered strings. Emoji and icons
are fine. `label` fields in `constants/` are parent-facing and must not reach the
screen. Numbers count as text.

### 2. No fail punishment
No lives removed, no sad faces for mistakes, no dead ends, no "game over". A wrong
move gets a gentle animation and an immediate retry. Check the hook's state
machine, not just the visuals — is every wrong path recoverable?

### 3. Tap targets ≥ 90×90pt
Recommended 110×110. Toddler fingers land 15–20pt off target. Check computed sizes,
not just style literals — a `Pressable` sized by a flex parent can collapse below
the minimum on a small iPad. `hitSlop` extends the touch area and counts toward
the effective target. Minimum 8pt spacing between targets.

### 4. Haptic + sound within 100ms of every tap
Currently the most-violated rule: haptics fire, **audio does not exist**
(`constants/sounds.ts` is all `null`, `expo-audio` imported nowhere). Flag every
tap handler with no sound path. Haptic must come first, sound within 50ms
(`HAPTICS_DELAY_MS`).

### 5. Sessions 3–5 minutes
Count the moves to completion. A 12-card memory game fits; a 24-card one does not.
Longer than five minutes means the child leaves mid-game and the app has no way to
welcome them back.

### 6. Landscape only
`app.json` sets `orientation: "landscape"`. Flag any layout assuming portrait, and
any `height > width` assumption.

### 7. 100% offline
No `fetch`, no network imports, no remote assets or fonts. The app must work on a
plane — which is the entire premise in `docs/PRODUCT.md`.

### 8. No purchases visible to the child
IAP lives behind a parental gate in a "Parents" section. Nothing purchase-shaped
may be reachable from a game screen. (Apple Kids category requirement, not just a
preference.)

### 9. `useWindowDimensions()` — never hardcoded pixels
Must scale from iPad mini to iPad Pro. Every style number should come from
`constants/theme.ts` (`SPACING`, `CARD`, `ANIMATION`), from `useWindowDimensions()`,
or from a ratio of those. Flag raw literals. Also flag `Dimensions.get()` — it does
not update on rotation or split view.

**Known existing violations** (pre-existing, not caused by new work — report as
context, not as regressions): `HomeScreen.tsx` and `WinScreen.tsx` hardcode
160/110/80/72/56/52; `GameBoard.tsx` hardcodes the `width >= 700` breakpoint.

### 10. Celebration louder than failure
Win animations 3–5 seconds minimum. Compare the success and failure responses
side by side — if failure is the more elaborate of the two, it is wrong.

## Beyond the ten — from docs/TODDLER_UX.md

- **Exactly one primary action per screen.** Two competing buttons is one too many.
  This is the rule most likely to break as games are added to `HomeScreen`.
- **The character reacts to everything.** Pedro responds to every tap, not only to
  correct ones. Silence reads as "broken" to a toddler.
- **No wrong answers, "yes and…"** — the Sago Mini principle. Exploration is
  always rewarded.
- **No timers, no scores, no leaderboards.** Meaningless at this age, and they
  manufacture a fail state through the back door.

## Reporting

Group by severity, most severe first:

- **Blocker** — breaks a non-negotiable rule for the child. Unreachable tap
  target, a fail state, text the child must read to proceed.
- **Regression** — introduced by this change.
- **Pre-existing** — already in the codebase. Report separately so it is not
  confused with new damage.

For each: `file:line`, which rule, and the concrete consequence.

> `components/screens/HomeScreen.tsx:34` — rule 9. Play button hardcoded to
> 160×160pt. On an iPad Pro at 1366pt wide it renders visually small relative to
> the screen; on a narrow split-view it can overflow. Should derive from
> `useWindowDimensions()`.

Do not pad the list. If a rule passes cleanly, say nothing about it. A review of
"everything looks fine" for a change that genuinely is fine is a valid result.
