// utils/arrangeGames.test.ts
// The variety rules, which exist so a child does not replay one game forever.

import { RECENT_LIMIT, arrangeGames, recordPlay } from './arrangeGames';

type G = { id: string; countryCode: string };

const CODES = ['nl', 'be', 'de', 'fr', 'gb', 'dk', 'se', 'no', 'ch', 'at', 'it'];
const ALL: G[] = CODES.flatMap((c) => [
  { id: `memory-${c}`, countryCode: c },
  { id: `shapefit-${c}`, countryCode: c },
]);

describe('arrangeGames', () => {
  it('shows every game, never dropping one', () => {
    const out = arrangeGames(ALL, [], 42);
    expect(out).toHaveLength(ALL.length);
    expect(new Set(out.map((g) => g.id)).size).toBe(ALL.length);
  });

  it('is stable for a given seed', () => {
    // The order must not change while the child is looking at it.
    expect(arrangeGames(ALL, [], 7)).toEqual(arrangeGames(ALL, [], 7));
  });

  it('differs between seeds, so sessions are not identical', () => {
    const a = arrangeGames(ALL, [], 1).map((g) => g.id);
    const b = arrangeGames(ALL, [], 2).map((g) => g.id);
    expect(a).not.toEqual(b);
  });

  it('does not always open with the same game', () => {
    // The whole point: with a fixed order, tile one is always memory-nl.
    const firsts = new Set(
      Array.from({ length: 20 }, (_, i) => arrangeGames(ALL, [], i + 1)[0].id),
    );
    expect(firsts.size).toBeGreaterThan(3);
  });

  it('does not always open with the same country', () => {
    const countries = new Set(
      Array.from({ length: 20 }, (_, i) => arrangeGames(ALL, [], i + 1)[0].countryCode),
    );
    expect(countries.size).toBeGreaterThan(3);
  });

  it('pushes a recently played game to the back', () => {
    const out = arrangeGames(ALL, ['memory-nl'], 5);
    expect(out[out.length - 1].id).toBe('memory-nl');
  });

  it('orders several recent games with the newest last of all', () => {
    // Most recent first in the input; it should end up furthest from the top.
    const out = arrangeGames(ALL, ['memory-fr', 'shapefit-de', 'memory-nl'], 9);
    const tail = out.slice(-3).map((g) => g.id);
    expect(tail).toEqual(['memory-nl', 'shapefit-de', 'memory-fr']);
  });

  it('never lets a recent game outrank a fresh one', () => {
    const recent = ['memory-nl', 'shapefit-nl', 'memory-be'];
    const out = arrangeGames(ALL, recent, 3);
    const firstRecent = out.findIndex((g) => recent.includes(g.id));
    const lastFresh = out.map((g) => recent.includes(g.id)).lastIndexOf(false);
    expect(firstRecent).toBeGreaterThan(lastFresh);
  });

  it('keeps two games from the same country apart', () => {
    // The grid should read as many places, not as pairs.
    const out = arrangeGames(ALL, [], 11);
    const adjacent = out.filter(
      (g, i) => i > 0 && out[i - 1].countryCode === g.countryCode,
    );
    expect(adjacent).toEqual([]);
  });

  it('still shows everything when spreading is impossible', () => {
    // One country only: the rule cannot hold, and correctness wins.
    const single: G[] = [
      { id: 'memory-nl', countryCode: 'nl' },
      { id: 'shapefit-nl', countryCode: 'nl' },
    ];
    expect(arrangeGames(single, [], 1)).toHaveLength(2);
  });

  it('handles an empty catalogue', () => {
    expect(arrangeGames([], [], 1)).toEqual([]);
  });

  it('handles every game having been played', () => {
    const allIds = ALL.map((g) => g.id);
    const out = arrangeGames(ALL, allIds, 1);
    expect(out).toHaveLength(ALL.length);
  });
});

describe('recordPlay', () => {
  it('puts the newest play first', () => {
    expect(recordPlay(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('moves a replayed game to the front instead of duplicating it', () => {
    expect(recordPlay(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('forgets beyond the limit, so old games become fresh again', () => {
    // Without this the child would eventually have "played everything" and
    // the ordering would stop helping.
    let history: string[] = [];
    for (let i = 0; i < RECENT_LIMIT + 4; i++) history = recordPlay(history, `g${i}`);
    expect(history).toHaveLength(RECENT_LIMIT);
    expect(history).not.toContain('g0');
  });
});
