---
name: sync-design-tokens
description: Keeps constants/theme.ts, constants/cards.ts and constants/sounds.ts in sync with docs/DESIGN_SYSTEM.md and docs/ANIMATION_GUIDELINES.md. Use when changing a design token, adding a color or timing, or when docs and code appear to disagree about a value.
---

# sync-design-tokens — docs and code tell the same story

`docs/DESIGN_SYSTEM.md` claims to be the source of truth for `constants/theme.ts`.
The project is one commit old and they have **already diverged**. Design systems
do not fail loudly — they erode one unremarked value at a time until nobody trusts
the docs and everyone reads the code.

## Known divergences (fix these on first run)

| Doc says | Code says | Resolution |
|---|---|---|
| `woodGrain` | `woodGrainRgba` in `theme.ts` | Code wins — the name states the format. Update the doc. |
| *(absent)* | `errorRed: '#FF5252'` in `theme.ts` | Code wins — the token is in use. Add it to the doc. |

## The pairs to check

| Code | Doc |
|---|---|
| `constants/theme.ts` → `COLORS` | `docs/DESIGN_SYSTEM.md` → color tokens |
| `constants/theme.ts` → `SPACING` | `docs/DESIGN_SYSTEM.md` → spacing scale |
| `constants/theme.ts` → `CARD` | `docs/DESIGN_SYSTEM.md` → card dimensions |
| `constants/theme.ts` → `ANIMATION` | `docs/ANIMATION_GUIDELINES.md` → timing table |
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
