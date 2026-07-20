# DESIGN_SYSTEM.md — Nino · "There & Back"

**Source of truth: `constants/nino.ts`.** This document explains the system;
the code defines it. When they disagree, run the `sync-design-tokens` skill.

---

## The two systems

| | `constants/nino.ts` | `constants/theme.ts` |
|---|---|---|
| Role | **Primary.** Everything visual | Wood sub-system |
| Scope | backgrounds, buttons, type, spacing, shadows, motion | the Skia wood card only |
| New code | import from here | only if drawing wood grain |

The wood ramp is kept because `components/cards/WoodCard.tsx` renders procedural
grain from it and the Nino palette has no equivalent. Everything else in the app
moves to Nino.

---

## Color

### Character palette — LOCKED
Nino's likeness. **Never recolor these.** They are baked into the mascot SVGs
(`assets/mascot/nino-head.svg`, `nino-full.svg`).

| Token | Hex | Use |
|---|---|---|
| `ninoSkin` | `#F4C39A` | face, hands |
| `ninoBlush` | `#F49B78` | cheeks |
| `ninoHair` | `#4A3327` | hair |
| `ninoHairHi` | `#5A3E2B` | hair highlight |
| `ninoInk` | `#33241C` | **universal outline** — every stroke in the art |
| `ninoTongue` | `#F4756B` | open-mouth expressions |

### Brand primaries

| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| `blue` | `#2E7FDF` | | `sand` | `#EADBC2` |
| `blueDark` | `#1F63B4` | | `green` | `#2E9E6B` |
| `blue500` | `#5AA0EC` | | `greenLight` | `#5CB878` |
| `blue100` | `#EAF3FF` | | `sun` | `#FFD95C` |
| `orange` | `#F68A2E` | | `sunDeep` | `#F6C445` |
| `orangeLight` | `#FFA24E` | | | |
| `orangeDark` | `#D96F14` | | | |

Orange is the action color. Blue is the world.

### Two-mode system — "there" and "back"

The product's core metaphor: the outbound journey (day) and the return (night).

| Mode | Sky top | Sky bottom | Accent |
|---|---|---|---|
| `there` | `thereSkyTop` `#8EC9F5` | `thereSkyBot` `#BCE0FA` | `thereAccent` `#FFD95C` |
| `back` | `backSkyTop` `#22304F` | `backSkyBot` `#0F1B36` | `backAccent` `#B9A9E0` |

Use via `GRADIENTS.there` / `GRADIENTS.back` with `expo-linear-gradient`:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../constants/nino';

<LinearGradient colors={GRADIENTS.there} style={StyleSheet.absoluteFill} />
```

> **Open item.** `app.json` sets `userInterfaceStyle: "light"`. The two modes are
> a *narrative* device (where you are in the journey), not an OS light/dark
> setting — so today they must be driven by app state, not `useColorScheme()`.
> Decide deliberately if that ever changes.

### The modes are a behaviour contract, not just a palette

**This is the rule that makes the two modes mean something.** Colour is the
smallest part of it.

| | **There** ☀️ (outbound) | **Back** 🌙 (return) |
|---|---|---|
| Intent | play, energy, exploration | wind-down, calm, order |
| Layout | **scattered** — elements sit off-grid, lightly rotated, playful | **aligned** — clean grid, no rotation, even spacing |
| Motion | fuller amplitude, springier | reduced amplitude, slower, softer easing |
| Mascot | `happy` — normal bob | `sleepy` — slower, shallower bob |
| Density | can feel busy | deliberately quieter |

**Why:** Back mode is meant to sit at the start of a bedtime routine. Visual
disorder is stimulating; alignment is calming. A scattered board asks a child to
search, an aligned one lets them settle. Same game, different arousal level.

**Applying it:** any new screen or board that lays elements out must read the
mode and respond. Scatter must be *deterministic* — seeded from a stable id, so
positions never jump between renders — and must never push a tap target off
screen or below the 90pt floor.

Reference implementation: `components/memory/MemoryBoard.tsx` (`scatterFor`).

> Never claim in copy that Back mode makes a child sleep. It lowers stimulation;
> it does not cause sleep. See `components/screens/ParentPanel.tsx`.

### Neutrals — warm, never cold gray

`paper` `#FFFFFF` · `cream` `#FFF4E4` · `bg` `#EFEDE7` · `surface` `#F7F3EA` ·
`border` `#D9C49E` · `borderSoft` `#EDF0F3` · `muted` `#9A938A` ·
`mutedInk` `#8A6A3B` · `locked` `#C9C2B4`

`locked` is for content behind the IAP — visible, clearly inert, never sad.

### Semantic

`textStrong` `#33241C` · `textBody` `#4A4237` · `actionPrimary` `#F68A2E` ·
`actionPrimaryInk` `#FFFFFF` · `focusRing` `#F6C445`

---

## Typography

Two families, both bundled locally via `@expo-google-fonts` — **this does not
break the offline rule**, the `.ttf` files ship inside the app.

| Token | Family | Use |
|---|---|---|
| `fontDisplay` | `Baloo2_800ExtraBold` | logo, titles |
| `fontBody` | `Nunito_600SemiBold` | body |
| `fontBodyBold` | `Nunito_800ExtraBold` | emphasis |

Sizes: `logo` 88 · `display` 44 · `title` 28 · `heading` 22 · `body` 17 ·
`label` 14 · `caption` 13

`lineHeight` is a **multiplier** here, but React Native expects absolute points:

```tsx
fontSize: TYPE.sizes.body,
lineHeight: TYPE.sizes.body * TYPE.lineHeight.body,
```

`trackingLogo: 3` is the `letterSpacing` for the "THERE & BACK" lockup.

**All in-game text is parent-facing.** The child cannot read (CLAUDE.md rule 1).
Child-facing UI is illustration, motion, haptics and sound.

Fonts load in `app/_layout.tsx`; the splash stays up until they are ready, so
nothing renders in a fallback face.

---

## Spacing & radii

Spacing: `s1` 4 · `s2` 8 · `s3` 12 · `s4` 16 · `s5` 24 · `s6` 32 · `s7` 44 · `s8` 64

Radii: `sm` 12 · `md` 18 · `lg` 26 · `xl` 34 · `pill` 999 · `round` 9999

Generous radii are part of the voice — nothing in this app is sharp.

---

## Layout — toddler ergonomics

| Token | Value | Meaning |
|---|---|---|
| `touchMin` | **90** | absolute floor for any tap target (pt) |
| `touchComfortable` | 110 | preferred, for a primary action |
| `touchGap` | 8 | minimum gap between adjacent targets |
| `tabletBreakpoint` | 700 | at/above this width, iPad layout |

> **Adaptation from the source tokens.** The delivered `nino.ts` shipped
> `touchMin: 64`. That is 29% below the floor CLAUDE.md rule 3 calls
> non-negotiable — a 2-year-old's finger lands 15–20pt off target, so 64pt
> produces taps that miss. **Rule 3 wins: the value here is 90.**
> If this is ever revisited, change it in both `constants/nino.ts` and
> CLAUDE.md rule 3, and record why.

Never hardcode a pixel (rule 9). Every number comes from a token,
`useWindowDimensions()`, or a ratio of the two.

---

## Shadows — the "chunky" signature

A hard navy offset with **zero blur**. This is the most recognizable trait of the
visual language; a soft blur reads as generic.

| Token | Offset Y | Opacity | Elevation |
|---|---|---|---|
| `chunkSm` | 6 | 0.18 | 6 |
| `chunk` | 8 | 0.20 | 8 |
| `chunkLg` | 10 | 0.20 | 10 |
| `soft` | 6 | 0.14 (blur 24) | 4 |

`soft` is the exception — for overlays and modals, where a hard edge would read
as an error. Shadow color is `#1F4F8C` for all chunk variants.

Spread them; they carry iOS `shadow*` and Android `elevation` together:

```tsx
<View style={[styles.card, SHADOWS.chunk]} />
```

---

## Motion

Two registers, and the distinction matters:

**Ambient** — calm, slow, never frantic. `bob` 3200ms (mascot float,
amplitude 12pt) · `pulse` 1900ms (attention on the primary action) ·
`drift` 10000ms (background) · `press` 250ms

**Interaction** — immediate and exaggerated. `flipOpen` 380ms ·
`flipClose` 320ms · `matchPulse` 120ms · `winDelay` 400ms

All animation runs on the UI thread via Reanimated. Full patterns —
flip, pulse, spring snap, the haptic map — live in `docs/ANIMATION_GUIDELINES.md`.

Feedback budget: **haptic first, sound within 50ms (`HAPTICS_DELAY_MS`), the
whole response under 100ms** (rule 4).

---

## Mascot art

`assets/mascot/nino-head.svg` (viewBox 100×100) and `nino-full.svg`
(viewBox 10 10 165 220). Imported as components via
`react-native-svg-transformer` (configured in `metro.config.js`):

```tsx
import NinoHead from '../../assets/mascot/nino-head.svg';

<NinoHead width={120} height={120} />
```

The art uses hardcoded hex matching the LOCKED character palette. To theme any
part of it, replace the fill with a `COLORS.*` reference — but the character
colors themselves stay fixed.

---

## Card geometry

Width 90pt · height 120pt · radius `RADII.sm` (12) · margin `SPACING.s2` (8) ·
4 columns on iPad, 3 on iPhone (`LAYOUT.tabletBreakpoint`).

### Wood card sub-system (`constants/theme.ts`)

Ramp: `woodLight` `#D4956A` → `woodMid` `#C07840` → `woodDark` `#8B4513` →
`woodDarker` `#6B3A2A`, grain `woodGrainRgba` `rgba(60, 20, 0, 0.09)`.

Grain is seeded deterministically from `instanceId` — never `Math.random()`, or
it shimmers on every render.

> **Known gap.** `ANIMATION_GUIDELINES.md` specifies an inner highlight
> (dy −1, blur 3, `rgba(255,200,120,0.3)`) and a drop shadow (dy 5, blur 10,
> `rgba(40,15,0,0.4)`) on wood cards. `WoodCard.tsx` currently renders neither.
> Adding them is a visual change — decide deliberately, especially now that the
> Nino system prefers zero-blur shadows.
