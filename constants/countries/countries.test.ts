// constants/countries/countries.test.ts
// Data validation for every country.
//
// This is where the data-driven approach earns its keep: eleven countries are
// checked by one suite, and a badly authored country fails before anyone tries
// to render it. Performance budgets are enforced here too — a scene that would
// be slow cannot be committed.

import {
  COUNTRIES,
  COUNTRY_CODES,
  getCountry,
  DEFAULT_COUNTRY,
} from './index';
import {
  ITEM_ROLES,
  ITEMS_PER_COUNTRY,
  MAX_SCENE_PIECES,
  TEMPO_MAX,
  TEMPO_MIN,
  type PrimitiveKind,
} from './types';

const HEX = /^#[0-9A-Fa-f]{6}$/;

const VALID_KINDS: PrimitiveKind[] = [
  'tower', 'castle', 'dome', 'arch', 'columns', 'mountain', 'hill',
  'forest', 'house', 'windmill', 'bridge', 'water', 'field',
];

/**
 * Emoji introduced after Unicode 13 (2020) do not render on older iOS and show
 * as a blank box — invisible content for a child who cannot read anyway.
 * These are the ones most likely to be reached for; extend as needed.
 */
const TOO_NEW_EMOJI = [
  '🫎', // moose, Unicode 15.1
  '🫏', // donkey, 15.1
  '🪿', // goose, 15.0
  '🩷', // pink heart, 15.0
  '🫠', // melting face, 14.0
  '🪸', // coral, 14.0
];

describe('country registry', () => {
  it('ships eleven countries', () => {
    expect(COUNTRIES).toHaveLength(11);
  });

  it('has unique, lowercase, two-letter codes', () => {
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[a-z]{2}$/);
    }
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRIES.length);
  });

  it('looks a country up by code', () => {
    expect(getCountry('fr')?.name).toBe('France');
    expect(getCountry('zz')).toBeUndefined();
    expect(getCountry(undefined)).toBeUndefined();
  });

  it('has a default country that is in the registry', () => {
    expect(COUNTRIES).toContain(DEFAULT_COUNTRY);
  });

  it('keeps the first two countries free to play (business model)', () => {
    // CLAUDE.md: free download unlocks the first games; the rest sit behind
    // the one-time IAP.
    expect(COUNTRIES[0].locked).toBe(false);
    expect(COUNTRIES[1].locked).toBe(false);
  });
});

describe.each(COUNTRIES.map((c) => [c.code, c] as const))('country %s', (code, country) => {
  it('has a name and a flag', () => {
    expect(country.name.length).toBeGreaterThan(2);
    expect(country.flag.length).toBeGreaterThan(0);
  });

  // --- Items -------------------------------------------------------------

  it(`has exactly ${ITEMS_PER_COUNTRY} items`, () => {
    // Both games are built around this count.
    expect(country.items).toHaveLength(ITEMS_PER_COUNTRY);
  });

  it('covers every item role exactly once', () => {
    // Fixed roles mean each country teaches the same shape of world, so a
    // child can transfer what they learned from one to the next.
    const roles = country.items.map((i) => i.role).sort();
    expect(roles).toEqual([...ITEM_ROLES].sort());
  });

  it('gives every item a unique id within the country', () => {
    const ids = country.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every item a DISTINCT emoji', () => {
    // Two identical emoji in one memory deck would make a pair unmatchable.
    const emoji = country.items.map((i) => i.emoji);
    expect(new Set(emoji).size).toBe(emoji.length);
  });

  it('uses only emoji that render on older iOS', () => {
    for (const item of country.items) {
      // Jest's expect takes no message argument (that is Playwright); the
      // country and item are already in the test name via describe.each.
      expect({ item: item.id, emoji: item.emoji, tooNew: TOO_NEW_EMOJI.includes(item.emoji) })
        .toEqual({ item: item.id, emoji: item.emoji, tooNew: false });
      expect(item.emoji.length).toBeGreaterThan(0);
    }
  });

  it('gives every item a parent-facing label and a valid tint', () => {
    for (const item of country.items) {
      expect(item.label.length).toBeGreaterThan(1);
      expect(item.tint).toMatch(HEX);
    }
  });

  // --- Palette -----------------------------------------------------------

  it('has a complete, well-formed palette', () => {
    const p = country.palette;
    expect(p.skyThere).toHaveLength(2);
    expect(p.skyBack).toHaveLength(2);
    for (const colour of [
      ...p.skyThere, ...p.skyBack,
      p.ground, p.structure, p.structureAlt, p.accent,
    ]) {
      expect(colour).toMatch(HEX);
    }
  });

  it('has a night sky that is genuinely darker than the day sky', () => {
    // The Back mode must read as evening, or the whole calm-down premise fails.
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
    };
    const day = (lum(country.palette.skyThere[0]) + lum(country.palette.skyThere[1])) / 2;
    const night = (lum(country.palette.skyBack[0]) + lum(country.palette.skyBack[1])) / 2;
    expect(night).toBeLessThan(day - 0.3);
  });

  // --- Scene (performance budget) ----------------------------------------

  it(`stays within the ${MAX_SCENE_PIECES}-piece scene budget`, () => {
    // PERFORMANCE. Each piece expands to several SVG nodes, and node count is
    // the main driver of scene cost on device. Capping the data means a slow
    // scene cannot be authored at all.
    expect(country.scene.length).toBeLessThanOrEqual(MAX_SCENE_PIECES);
    expect(country.scene.length).toBeGreaterThan(0);
  });

  it('only uses known primitives', () => {
    for (const piece of country.scene) {
      expect(VALID_KINDS).toContain(piece.kind);
    }
  });

  it('positions every piece inside the scene', () => {
    for (const piece of country.scene) {
      expect(piece.x).toBeGreaterThanOrEqual(0);
      expect(piece.x).toBeLessThanOrEqual(1);
    }
  });

  it('keeps scales sane', () => {
    for (const piece of country.scene) {
      if (piece.scale === undefined) continue;
      expect(piece.scale).toBeGreaterThan(0.2);
      expect(piece.scale).toBeLessThan(3);
    }
  });

  it('uses valid hex for any explicit fill', () => {
    for (const piece of country.scene) {
      if (piece.fill) expect(piece.fill).toMatch(HEX);
    }
  });

  it('has at most one windmill (the only animated primitive)', () => {
    // PERFORMANCE: infinite loops are the expensive kind of animation.
    const windmills = country.scene.filter((p) => p.kind === 'windmill');
    expect(windmills.length).toBeLessThanOrEqual(1);
  });

  // --- Music -------------------------------------------------------------

  it('has music parameters in the calm range', () => {
    // TODDLER_UX.md: gentle looping music, never frantic.
    expect(country.music.tempo).toBeGreaterThanOrEqual(TEMPO_MIN);
    expect(country.music.tempo).toBeLessThanOrEqual(TEMPO_MAX);
    expect(country.music.key).toMatch(/^[A-G]#?$/);
  });
});

describe('cross-country properties', () => {
  it('gives every country a visually distinct day sky', () => {
    // Eleven countries that all look the same defeat the point of travel.
    const skies = COUNTRIES.map((c) => c.palette.skyThere.join(''));
    expect(new Set(skies).size).toBe(COUNTRIES.length);
  });

  it('varies the music so the app does not sound like one long track', () => {
    const signatures = COUNTRIES.map(
      (c) => `${c.music.key}-${c.music.mode}-${c.music.timbre}`,
    );
    // Not necessarily all unique, but the app must not be monotone.
    expect(new Set(signatures).size).toBeGreaterThanOrEqual(8);
  });

  it('reuses items across countries so a child meets old friends', () => {
    // Deliberate: recognising a cow in Switzerland after meeting it in the
    // Netherlands is a win, not a duplication bug.
    const all = COUNTRIES.flatMap((c) => c.items.map((i) => i.emoji));
    expect(all.length).toBeGreaterThan(new Set(all).size);
  });

  it('keeps the total scene budget affordable across the whole app', () => {
    const total = COUNTRIES.reduce((sum, c) => sum + c.scene.length, 0);
    expect(total).toBeLessThanOrEqual(COUNTRIES.length * MAX_SCENE_PIECES);
  });
});
