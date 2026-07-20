// constants/itemSounds.ts
// The voice of a thing.
//
// When a pair is matched or a piece is seated, the item says what it IS — the
// duck quacks, the horse neighs, the bicycle rings. For a child who cannot
// read, this is the whole naming mechanism: emoji shows it, sound names it.
//
// Only items with a real-world sound appear here. A waffle has no voice, and
// inventing one would teach nothing. Those items just get the normal reward
// cue and no more.
//
// All audio is synthesized (`node scripts/generate-item-sounds.js`), so there
// is no sampled or licensed material anywhere in this app.

export type ItemSoundKey =
  // Animals
  | 'moo'
  | 'meow'
  | 'bark'
  | 'quack'
  | 'crow'
  | 'neigh'
  | 'growl'
  | 'deerCall'
  // Things
  | 'bicycleBell'
  | 'carHorn'
  | 'busHorn'
  | 'boatHorn'
  | 'watchTick'
  | 'violinNote'
  | 'balloonPop'
  | 'splash'
  | 'crunch'
  | 'skiSwish'
  | 'kettle'
  | 'rain'
  | 'wind';

/**
 * Item id → its voice. Keys are the `id` field in constants/countries/*.ts.
 *
 * Ids repeat across countries on purpose (a cow is a cow in the Netherlands
 * and in Switzerland), so one entry covers every country that uses it.
 */
export const ITEM_SOUND: Record<string, ItemSoundKey> = {
  // --- Animals ------------------------------------------------------------
  cow: 'moo',
  cat: 'meow',
  dog: 'bark',
  duck: 'quack',
  rooster: 'crow',
  horse: 'neigh',
  bear: 'growl',
  deer: 'deerCall',
  reindeer: 'deerCall',

  // --- Vehicles and objects -----------------------------------------------
  bicycle: 'bicycleBell',
  car: 'carHorn',
  bus: 'busHorn',
  boat: 'boatHorn',
  ship: 'boatHorn',
  gondola: 'splash',
  fish: 'splash',
  watch: 'watchTick',
  violin: 'violinNote',
  balloon: 'balloonPop',
  apple: 'crunch',
  ski: 'skiSwish',
  tea: 'kettle',
  umbrella: 'rain',
  snow: 'wind',
};

/** The voice for an item, or undefined when the thing makes no sound. */
export function soundForItem(itemId: string): ItemSoundKey | undefined {
  return ITEM_SOUND[itemId];
}

export const ITEM_SOUNDS: Record<ItemSoundKey, number> = {
  moo: require('../assets/sounds/items/moo.wav'),
  meow: require('../assets/sounds/items/meow.wav'),
  bark: require('../assets/sounds/items/bark.wav'),
  quack: require('../assets/sounds/items/quack.wav'),
  crow: require('../assets/sounds/items/crow.wav'),
  neigh: require('../assets/sounds/items/neigh.wav'),
  growl: require('../assets/sounds/items/growl.wav'),
  deerCall: require('../assets/sounds/items/deerCall.wav'),
  bicycleBell: require('../assets/sounds/items/bicycleBell.wav'),
  carHorn: require('../assets/sounds/items/carHorn.wav'),
  busHorn: require('../assets/sounds/items/busHorn.wav'),
  boatHorn: require('../assets/sounds/items/boatHorn.wav'),
  watchTick: require('../assets/sounds/items/watchTick.wav'),
  violinNote: require('../assets/sounds/items/violinNote.wav'),
  balloonPop: require('../assets/sounds/items/balloonPop.wav'),
  splash: require('../assets/sounds/items/splash.wav'),
  crunch: require('../assets/sounds/items/crunch.wav'),
  skiSwish: require('../assets/sounds/items/skiSwish.wav'),
  kettle: require('../assets/sounds/items/kettle.wav'),
  rain: require('../assets/sounds/items/rain.wav'),
  wind: require('../assets/sounds/items/wind.wav'),
};
