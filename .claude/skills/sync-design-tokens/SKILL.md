---
name: sync-design-tokens
description: Keeps constants/nino.ts (the primary design system), constants/theme.ts, cards.ts and sounds.ts in sync with docs/DESIGN_SYSTEM.md and docs/ANIMATION_GUIDELINES.md. Use when changing a design token, adding a color or timing, or when docs and code appear to disagree about a value.
---

# sync-design-tokens — docs and code tell the same story

`constants/nino.ts` is the source of truth for all visual tokens;
`docs/DESIGN_SYSTEM.md` describes it. Design systems do not fail loudly — they
erode one unremarked value at a time until nobody trusts the docs and everyone
reads the code.

## The two token files

| File | Role |
|---|---|
| `constants/nino.ts` | **Primary.** All visual tokens for the Nino / "There & Back" system |
| `constants/theme.ts` | Wood sub-system — only the Skia wood-card ramp |

New tokens go in `nino.ts`. Only add to `theme.ts` if it draws wood grain.

## Standing divergence to preserve

`nino.ts` sets `LAYOUT.touchMin: 90`. The **delivered** source tokens shipped
`touchMin: 64`. This is a deliberate, documented override — CLAUDE.md rule 3
declares 90pt non-negotiable, and a 2-year-old's finger lands 15–20pt off target.

**Do not "fix" this back to 64** if you ever see the original token drop again.
If it is genuinely revisited, change it in `constants/nino.ts`,
`docs/DESIGN_SYSTEM.md` and CLAUDE.md rule 3 together, and record why.

## The pairs to check

| Code | Doc |
|---|---|
| `constants/nino.ts` → `COLORS` | `docs/DESIGN_SYSTEM.md` → color tables |
| `constants/nino.ts` → `TYPE` | `docs/DESIGN_SYSTEM.md` → typography |
| `constants/nino.ts` → `SPACING`, `RADII` | `docs/DESIGN_SYSTEM.md` → spacing & radii |
| `constants/nino.ts` → `LAYOUT` | `docs/DESIGN_SYSTEM.md` → layout · CLAUDE.md rule 3 |
| `constants/nino.ts` → `SHADOWS` | `docs/DESIGN_SYSTEM.md` → shadows |
| `constants/nino.ts` → `MOTION` | `docs/ANIMATION_GUIDELINES.md` → timing table |
| `constants/theme.ts` → wood ramp | `docs/DESIGN_SYSTEM.md` → wood sub-system |
| `constants/cards.ts` → `TRAVEL_CARDS` | `docs/PRODUCT.md` → card pair table |
| `constants/sounds.ts` → `SoundKey` | `assets/sounds/README.md` → required files |

## Procedure

1. Read both sides of each pair.
2. List every divergence: name mismatches, value mismatches, tokens in one and not
   the other.
3. Decide which side is right (below).
4. Fix **both** sides so they agree.
5. If a token changed value, grep for direct consumers — a renamed token that
   still compiles may be a token nothing uses anymore.

## Which side wins

**Default: the code wins.** Tokens in active use are load-bearing; a doc is a
description. Update the doc to match.

**The doc wins when** it states a deliberate design decision the code has drifted
from — a specified minimum tap target, a required shadow, a mandated timing curve.
These are requirements, not descriptions.

Example of the doc being right: `ANIMATION_GUIDELINES.md` specifies that wood
cards get an inner shadow for depth and a drop shadow for elevation.
`WoodCard.tsx` renders neither. That is a code gap, not a stale doc — but it is a
**visual change**, so raise it with the user rather than silently adding shadows.

**When genuinely unsure, ask.** A wrong guess here propagates into every screen
built afterward.

## Adding a new token

1. Add to `constants/theme.ts` with `as const`.
2. Document it in the matching doc **in the same change**.
3. Follow the existing naming: descriptive and role-based (`successGreen`,
   `textBrown`, `pedroOrange`), never raw hex at a call site.

Before adding: check whether an existing token already covers the need. Twelve
near-identical browns is how a palette dies.

## Never bypass the tokens

A hex literal or a magic number in a component is the failure this skill prevents.
If a value is needed in more than one place, it is a token. See the `ui-component`
skill for the pixel rule (`CLAUDE.md` rule 9).

## Finish

Run the `verify` skill — a renamed token is a compile error in every consumer, and
typecheck will find them all.
