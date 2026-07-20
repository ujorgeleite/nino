// constants/itemSounds.test.ts
// The mapping from item to voice, checked against the real country data.
//
// The risk this guards is quiet: an item whose sound file is missing, or a
// country item that silently never speaks because of an id typo.

import { COUNTRIES } from './countries';
import { ITEM_SOUND, ITEM_SOUNDS, soundForItem } from './itemSounds';

/** Every distinct item id used anywhere in the app. */
const ALL_ITEM_IDS = [
  ...new Set(COUNTRIES.flatMap((c) => c.items.map((i) => i.id))),
].sort();

describe('item voices', () => {
  it('maps only to voices that actually exist', () => {
    // A typo here would be a silent no-op at runtime.
    // Jest's expect takes no message argument, so the assertion carries the
    // context in its value instead.
    const missing = Object.entries(ITEM_SOUND)
      .filter(([, key]) => ITEM_SOUNDS[key] === undefined)
      .map(([itemId, key]) => `${itemId} → ${key}`);
    expect(missing).toEqual([]);
  });

  it('only maps ids that a country actually uses', () => {
    // A mapping for an item nobody ships is dead weight and a sign the data
    // and the audio have drifted apart.
    const orphans = Object.keys(ITEM_SOUND).filter((id) => !ALL_ITEM_IDS.includes(id));
    expect(orphans).toEqual([]);
  });

  it('gives every animal a voice', () => {
    // An animal that does not make its sound is the one case a child would
    // definitely notice.
    const animals = COUNTRIES.flatMap((c) =>
      c.items.filter((i) => i.role === 'animal').map((i) => i.id),
    );
    const voiceless = [...new Set(animals)].filter((id) => !soundForItem(id));
    expect(voiceless).toEqual([]);
  });

  it('returns undefined for things that make no sound', () => {
    // Silence is data, not a gap. A waffle does not need a noise invented.
    expect(soundForItem('waffle')).toBeUndefined();
    expect(soundForItem('castle')).toBeUndefined();
    expect(soundForItem('tulip')).toBeUndefined();
    expect(soundForItem('pizza')).toBeUndefined();
  });

  it('returns undefined for an unknown id instead of throwing', () => {
    expect(soundForItem('not-a-real-item')).toBeUndefined();
  });

  it('reuses one voice across countries that share an item', () => {
    // A cow is a cow in the Netherlands and in Switzerland.
    expect(soundForItem('cow')).toBe('moo');
    const cowCountries = COUNTRIES.filter((c) => c.items.some((i) => i.id === 'cow'));
    expect(cowCountries.length).toBeGreaterThan(1);
  });

  it('covers a good share of all items', () => {
    // Not everything speaks, but if almost nothing did, the feature would be
    // invisible in play.
    const withVoice = ALL_ITEM_IDS.filter((id) => soundForItem(id));
    expect(withVoice.length / ALL_ITEM_IDS.length).toBeGreaterThan(0.4);
  });
});
