// utils/nextChallenge.test.ts
// Finishing must always lead somewhere. A button that does nothing is worse
// than any ordering imperfection.

import { nextChallenge, type Challenge } from './nextChallenge';

const make = (codes: string[], done: string[] = []): Challenge[] =>
  codes.map((code) => ({ code, completed: done.includes(code) }));

const ALL = ['nl', 'be', 'de', 'fr', 'gb'];

describe('nextChallenge', () => {
  it('offers the next country in order', () => {
    expect(nextChallenge(make(ALL), 'nl')).toBe('be');
  });

  it('skips countries already finished', () => {
    expect(nextChallenge(make(ALL, ['be', 'de']), 'nl')).toBe('fr');
  });

  it('wraps around the end of the list', () => {
    expect(nextChallenge(make(ALL), 'gb')).toBe('nl');
  });

  it('wraps and still skips finished ones', () => {
    expect(nextChallenge(make(ALL, ['nl', 'be']), 'gb')).toBe('de');
  });

  it('never returns the country just finished when others remain', () => {
    for (const code of ALL) {
      expect(nextChallenge(make(ALL, [code]), code)).not.toBe(code);
    }
  });

  it('still returns something when everything is finished', () => {
    // A dead button is the one outcome that is not acceptable.
    const next = nextChallenge(make(ALL, ALL), 'de');
    expect(next).toBe('fr');
  });

  it('handles a single country', () => {
    expect(nextChallenge(make(['nl']), 'nl')).toBe('nl');
  });

  it('handles an unknown current code without throwing', () => {
    expect(ALL).toContain(nextChallenge(make(ALL), 'zz'));
  });

  it('handles an empty list', () => {
    expect(nextChallenge([], 'nl')).toBe('nl');
  });
});
