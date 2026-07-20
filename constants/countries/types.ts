// constants/countries/types.ts
// A country is DATA, not code.
//
// Repeating NetherlandsScene.tsx ten times would be ~4,500 lines of hand-drawn
// SVG that cannot be verified without looking at it — the exact category of
// work that has already shipped broken twice in this project. Instead a country
// declares which tested scene primitives to place, and one renderer draws them.
//
// Everything here is validated by constants/countries/countries.test.ts.

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/**
 * The five item slots every country fills. Fixed roles, so each country teaches
 * the same shape of world and a child can transfer what they learned.
 *
 * Concrete things a 2-year-old can recognise — never abstractions.
 */
export type ItemRole = 'monument' | 'animal' | 'food' | 'symbol' | 'nature';

export const ITEM_ROLES: readonly ItemRole[] = [
  'monument',
  'animal',
  'food',
  'symbol',
  'nature',
] as const;

export type CountryItem = {
  id: string;
  role: ItemRole;
  /** Unicode <= 13 only, so it renders on older iOS. See the test. */
  emoji: string;
  /** Parent-facing label. The child never sees text (CLAUDE.md rule 1). */
  label: string;
  /** Soft card / tray tint behind the emoji. */
  tint: string;
};

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

/** The scene primitives available. Each is a tested component. */
export type PrimitiveKind =
  | 'tower' //     towers, spires, lattice towers, lighthouses
  | 'castle' //    keeps with turrets
  | 'dome' //      domed roofs, rotundas
  | 'arch' //      triumphal arches, gates
  | 'columns' //   classical facades, amphitheatres
  | 'mountain' //  peaks, optionally snow-capped
  | 'hill' //      soft rolling ground
  | 'forest' //    clustered conifers or broadleaf
  | 'house' //     gabled, pitched or flat-roofed
  | 'windmill' //  the only primitive with a moving part
  | 'bridge'
  | 'water' //     canal / fjord / sea band
  | 'field'; //    striped farmland

export type ScenePiece = {
  kind: PrimitiveKind;
  /** Horizontal position as a fraction of scene width (0 = left, 1 = right). */
  x: number;
  /** Size relative to the scene's base unit. 1 is the primitive's natural size. */
  scale?: number;
  /** Overrides the palette default for this piece. */
  fill?: string;
  /** Primitive-specific flavour, e.g. tower variant 'lattice' | 'spire'. */
  variant?: string;
  /** Draw order. Lower sits further back. Defaults to array order. */
  depth?: number;
};

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

export type CountryPalette = {
  /** Day sky gradient, top to bottom. */
  skyThere: readonly [string, string];
  /** Night sky gradient for Back mode. */
  skyBack: readonly [string, string];
  /** The ground band. */
  ground: string;
  /** Default fill for scene structures. */
  structure: string;
  /** A second structure tone for variety. */
  structureAlt: string;
  /** Small highlights — windows, flags, details. */
  accent: string;
};

// ---------------------------------------------------------------------------
// Music
// ---------------------------------------------------------------------------

export type MusicMode = 'major' | 'lydian' | 'dorian' | 'mixolydian';

/**
 * The instrument a country's music is played on.
 *
 * Chosen to BELONG somewhere, not just to sound different. Instrumentation
 * carries far more of "where am I" than key or mode ever could — a child who
 * cannot name Switzerland can still hear that an alphorn is not an accordion.
 *
 * Each is synthesized in scripts/generate-music.js; none is sampled.
 */
export type MusicInstrument =
  | 'carillon' //     bell towers — the Low Countries
  | 'accordion' //    musette — France
  | 'alphorn' //      a long natural horn across a valley — Switzerland
  | 'mandolin' //     paired courses, bright — Italy
  | 'bowedFolk' //    nyckelharpa / hardanger fiddle — Sweden, Norway
  | 'zither' //       the parlour instrument — Austria
  | 'glockenspiel' // bright struck metal — Germany
  | 'whistle' //      pennywhistle — the British Isles
  | 'musicBox' //     fragile and nostalgic — Denmark
  | 'marimba'; //     warm wood — Belgium

export type CountryMusic = {
  /** Tonic note name, e.g. 'C', 'D', 'F#'. */
  key: string;
  mode: MusicMode;
  instrument: MusicInstrument;
  /** 60–80. Slow on purpose — TODDLER_UX.md: calm, never frantic. */
  tempo: number;
};

// ---------------------------------------------------------------------------
// The country
// ---------------------------------------------------------------------------

export type CountryData = {
  /** ISO 3166-1 alpha-2, lowercase. Used in routes and asset filenames. */
  code: string;
  name: string;
  flag: string;
  /** Free to play, or behind the one-time IAP (CLAUDE.md business model). */
  locked: boolean;
  palette: CountryPalette;
  items: readonly CountryItem[];
  scene: readonly ScenePiece[];
  music: CountryMusic;
};

// ---------------------------------------------------------------------------
// Budgets — performance is a hard requirement, so it is encoded here
// ---------------------------------------------------------------------------

/**
 * Maximum scene pieces per country.
 *
 * Each primitive expands to several SVG nodes, and SVG node count is the main
 * driver of scene render cost on device. Capping the DATA means a slow scene
 * cannot be authored in the first place — the test fails before anyone renders
 * it. See countries.test.ts.
 */
export const MAX_SCENE_PIECES = 14;

/** Items per country. Both games depend on exactly this many. */
export const ITEMS_PER_COUNTRY = 5;

/** Ambient music tempo range. */
export const TEMPO_MIN = 60;
export const TEMPO_MAX = 80;
