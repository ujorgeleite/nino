// constants/nino.ts
// Nino — "There & Back" design system. THE source of truth for all visual tokens.
// Documented in docs/DESIGN_SYSTEM.md; keep the two in sync (sync-design-tokens skill).
//
// Origin: delivered as a token bundle alongside the mascot art, adapted here
// for this project — see the ADAPTATION note under LAYOUT below. The original
// drop (raw nino.ts + integration README) is not kept in the repo; this file
// and docs/DESIGN_SYSTEM.md supersede it.

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

export const COLORS = {
  // --- Character palette — LOCKED. Nino's likeness. Never recolor. ---------
  ninoSkin:    '#F4C39A',
  ninoBlush:   '#F49B78',
  ninoHair:    '#4A3327',
  ninoHairHi:  '#5A3E2B',
  ninoInk:     '#33241C', // universal outline stroke
  ninoTongue:  '#F4756B',

  // --- Brand primaries ----------------------------------------------------
  blue:        '#2E7FDF',
  blueDark:    '#1F63B4',
  blue500:     '#5AA0EC',
  blue100:     '#EAF3FF',
  orange:      '#F68A2E',
  orangeLight: '#FFA24E',
  orangeDark:  '#D96F14',
  sand:        '#EADBC2',
  green:       '#2E9E6B',
  greenLight:  '#5CB878',
  sun:         '#FFD95C',
  sunDeep:     '#F6C445',

  // --- Two-mode system: "there" (day) / "back" (night) --------------------
  thereSkyTop: '#8EC9F5',
  thereSkyBot: '#BCE0FA',
  thereAccent: '#FFD95C',
  backSkyTop:  '#22304F',
  backSkyBot:  '#0F1B36',
  backAccent:  '#B9A9E0',
  dusk:        '#22304F',

  // --- Neutrals — warm. Never cold gray. ----------------------------------
  paper:       '#FFFFFF',
  cream:       '#FFF4E4',
  bg:          '#EFEDE7',
  surface:     '#F7F3EA',
  border:      '#D9C49E',
  borderSoft:  '#EDF0F3',
  muted:       '#9A938A',
  mutedInk:    '#8A6A3B',
  locked:      '#C9C2B4',

  // --- Semantic -----------------------------------------------------------
  textStrong:       '#33241C',
  textBody:         '#4A4237',
  actionPrimary:    '#F68A2E',
  actionPrimaryInk: '#FFFFFF',
  focusRing:        '#F6C445',
} as const;

/** Sky gradient pairs for expo-linear-gradient, by mode. */
export const GRADIENTS = {
  there: [COLORS.thereSkyTop, COLORS.thereSkyBot],
  back:  [COLORS.backSkyTop, COLORS.backSkyBot],
} as const;

export type NinoMode = keyof typeof GRADIENTS;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
// Loaded in app/_layout.tsx via expo-font. The @expo-google-fonts packages
// bundle the .ttf files into the app, so this does NOT break the offline rule.
//
// Reminder: all in-game text is parent-facing. The child cannot read — child
// UI is icons, illustration, motion and sound only.

export const TYPE = {
  fontDisplay:  'Baloo2_800ExtraBold',
  fontBody:     'Nunito_600SemiBold',
  fontBodyBold: 'Nunito_800ExtraBold',
  sizes: {
    logo:    88,
    display: 44,
    title:   28,
    heading: 22,
    body:    17,
    label:   14,
    caption: 13,
  },
  // Multipliers — in RN, lineHeight is absolute px, so compute:
  //   lineHeight: TYPE.sizes.body * TYPE.lineHeight.body
  lineHeight: { tight: 1.05, snug: 1.2, body: 1.5 },
  trackingLogo: 3, // letterSpacing for the "THERE & BACK" lockup
} as const;

// ---------------------------------------------------------------------------
// Spacing & radii
// ---------------------------------------------------------------------------

export const SPACING = {
  s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 44, s8: 64,
} as const;

export const RADII = {
  sm: 12, md: 18, lg: 26, xl: 34, pill: 999, round: 9999,
} as const;

// ---------------------------------------------------------------------------
// Layout — toddler ergonomics
// ---------------------------------------------------------------------------
//
// ADAPTATION FROM THE SOURCE TOKENS: the original nino.ts shipped
// `radii.touchMin: 64`. That is 29% below the 90pt floor that CLAUDE.md rule 3
// declares non-negotiable, and rule 3 wins — a 2-year-old's finger lands
// 15–20pt off target, so 64pt produces taps that miss.
//
// If you ever revisit this, change it in BOTH places (here and CLAUDE.md
// rule 3) and say why. Do not let them drift apart again.

export const LAYOUT = {
  /** Absolute minimum tap target (pt). CLAUDE.md rule 3. */
  touchMin: 90,
  /** Preferred tap target for a primary action. */
  touchComfortable: 110,
  /** Minimum gap between two adjacent tap targets. */
  touchGap: 8,
  /** Width at or above which the iPad (4-column) layout applies. */
  tabletBreakpoint: 700,
} as const;

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------
// The signature "chunky" look: a hard navy offset with ZERO blur. Spread these
// into a style — they carry both the iOS shadow* props and Android elevation.
//
//   <View style={[styles.card, SHADOWS.chunk]} />

export const SHADOWS = {
  chunk: {
    shadowColor: '#1F4F8C',
    shadowOpacity: 0.2,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  chunkSm: {
    shadowColor: '#1F4F8C',
    shadowOpacity: 0.18,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  chunkLg: {
    shadowColor: '#1F4F8C',
    shadowOpacity: 0.2,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  soft: {
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------
// Idle loops are calm and slow — never frantic. Drive with Reanimated.
// Interaction feedback is the opposite: immediate (<100ms) and exaggerated.
// See docs/ANIMATION_GUIDELINES.md and the `motion` skill.

export const MOTION = {
  // Idle / ambient loops (ms)
  bob:    3200, // mascot vertical float
  pulse:  1900, // attention pulse on the primary action
  drift: 10000, // slow background drift (clouds, stars)
  press:   250, // press-in / release

  // Card interaction (ms) — carried over from the Memory Match implementation
  flipOpen:   380,
  flipClose:  320,
  matchPulse: 120,
  winDelay:   400,

  // Mascot float amplitude (pt)
  bobAmplitude: 12,
} as const;

// ---------------------------------------------------------------------------
// Card geometry
// ---------------------------------------------------------------------------

export const CARD = {
  width:  90,
  height: 120,
  radius: RADII.sm,
  margin: SPACING.s2,
} as const;

/** Haptic fires first; the paired sound must follow within this window. */
export const HAPTICS_DELAY_MS = 50;
