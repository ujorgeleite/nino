// constants/easterEggs.ts
// Things in the scenery that answer back when touched.
//
// WHY THESE EXIST
//
// A 2-year-old's instinct is to poke everything. In a game where only the
// pieces respond, every other tap teaches "that does nothing" — and a screen
// full of dead pixels is a screen they stop exploring.
//
// An easter egg is a small reward for curiosity: the windmill spins faster,
// the church bell rings, the cow moos from the field. It changes no state,
// wins nothing, and cannot be got wrong. It exists so that touching the world
// is never a mistake.
//
// RULES THESE MUST OBEY:
//   - never interrupt the game — no modal, no navigation, no pause
//   - never a fail state; there is nothing here to get wrong (rule 2)
//   - always both seen AND heard, within the usual 100ms (rule 4)
//   - stay in the background: an egg must not out-shout the game itself

import type { ItemSoundKey } from './itemSounds';
import type { PrimitiveKind } from './countries';

/** What the touched thing does, visually. */
export type EggReaction =
  | 'spin' //    the windmill sails whirl up, then ease back
  | 'swing' //   a bell-like rock, left-right-left
  | 'bounce' //  a squash-and-stretch hop
  | 'shimmer' // a bright pulse, for water and snow
  | 'wobble'; //  a soft lean and recover, for trees

export type EasterEgg = {
  /** Which scene primitive responds. */
  kind: PrimitiveKind;
  reaction: EggReaction;
  /** Its voice, drawn from the item sounds already synthesized. */
  sound: ItemSoundKey;
  /** Parent-facing; never rendered. */
  label: string;
};

/**
 * Default reactions by primitive. A country can override, but most scenery
 * behaves the same wherever it stands: a forest rustles in Sweden and in
 * Germany alike.
 */
export const EGGS_BY_KIND: Partial<Record<PrimitiveKind, EasterEgg>> = {
  windmill: { kind: 'windmill', reaction: 'spin', sound: 'skiSwish', label: 'Windmill' },
  tower: { kind: 'tower', reaction: 'swing', sound: 'bicycleBell', label: 'Tower' },
  castle: { kind: 'castle', reaction: 'bounce', sound: 'boatHorn', label: 'Castle' },
  dome: { kind: 'dome', reaction: 'swing', sound: 'bicycleBell', label: 'Bell tower' },
  columns: { kind: 'columns', reaction: 'bounce', sound: 'crunch', label: 'Ruins' },
  bridge: { kind: 'bridge', reaction: 'bounce', sound: 'watchTick', label: 'Bridge' },
  forest: { kind: 'forest', reaction: 'wobble', sound: 'wind', label: 'Trees' },
  mountain: { kind: 'mountain', reaction: 'shimmer', sound: 'wind', label: 'Mountain' },
  house: { kind: 'house', reaction: 'bounce', sound: 'meow', label: 'House' },
  water: { kind: 'water', reaction: 'shimmer', sound: 'splash', label: 'Water' },
  field: { kind: 'field', reaction: 'wobble', sound: 'moo', label: 'Field' },
  hill: { kind: 'hill', reaction: 'wobble', sound: 'deerCall', label: 'Hill' },
  arch: { kind: 'arch', reaction: 'bounce', sound: 'carHorn', label: 'Gate' },
};

/** The egg for a scene primitive, or undefined if that thing is inert. */
export function eggFor(kind: PrimitiveKind): EasterEgg | undefined {
  return EGGS_BY_KIND[kind];
}

/** How long a reaction runs. Short — this is a wink, not a cutscene. */
export const EGG_DURATION_MS = 900;

/**
 * Minimum gap between two eggs firing.
 *
 * A toddler will hammer the same windmill twenty times. Without a floor the
 * sounds pile into noise and the scene becomes the loudest thing on screen,
 * which is exactly backwards.
 */
export const EGG_COOLDOWN_MS = 420;
