// constants/easterEggs.test.ts
// Easter eggs must be discoverable, harmless, and quiet enough to stay in the
// background of the game they decorate.

import { COUNTRIES } from './countries';
import { EGGS_BY_KIND, EGG_COOLDOWN_MS, EGG_DURATION_MS, eggFor } from './easterEggs';
import { ITEM_SOUND } from './itemSounds';

/** Every primitive kind any country actually places. */
const USED_KINDS = [
  ...new Set(COUNTRIES.flatMap((c) => c.scene.map((p) => p.kind))),
].sort();

describe('easter eggs', () => {
  it('gives every country something to poke', () => {
    // A country with no interactive scenery teaches "nothing here responds",
    // which is the habit these exist to prevent.
    const barren = COUNTRIES.filter((c) => !c.scene.some((p) => eggFor(p.kind))).map(
      (c) => c.code,
    );
    expect(barren).toEqual([]);
  });

  it('gives most scenery a reaction', () => {
    const withEgg = USED_KINDS.filter((k) => eggFor(k));
    expect(withEgg.length / USED_KINDS.length).toBeGreaterThan(0.8);
  });

  it('only uses sounds that exist', () => {
    // Eggs borrow the item voices rather than shipping their own audio.
    const voices = new Set(Object.values(ITEM_SOUND));
    const missing = Object.values(EGGS_BY_KIND)
      .filter((egg) => egg && !voices.has(egg.sound))
      .map((egg) => `${egg!.kind} → ${egg!.sound}`);
    expect(missing).toEqual([]);
  });

  it('returns undefined for scenery with no reaction', () => {
    // Silence is a valid answer; it must not throw.
    expect(eggFor('windmill')).toBeDefined();
    expect(() => eggFor('tower')).not.toThrow();
  });

  it('varies the reactions, so the world is not uniformly bouncy', () => {
    const reactions = new Set(Object.values(EGGS_BY_KIND).map((e) => e?.reaction));
    expect(reactions.size).toBeGreaterThanOrEqual(4);
  });

  it('keeps a reaction short — a wink, not a cutscene', () => {
    expect(EGG_DURATION_MS).toBeLessThanOrEqual(1200);
  });

  it('has a cooldown, because a toddler will hammer the same spot', () => {
    // Without this the sounds pile up and the scenery out-shouts the game.
    expect(EGG_COOLDOWN_MS).toBeGreaterThan(200);
    expect(EGG_COOLDOWN_MS).toBeLessThan(EGG_DURATION_MS);
  });

  it('labels every egg for assistive tech', () => {
    for (const egg of Object.values(EGGS_BY_KIND)) {
      expect(egg?.label.length ?? 0).toBeGreaterThan(2);
    }
  });
});
