// utils/shuffle.test.ts
// Seed test proving the Jest setup works, and pinning shuffle's two contracts:
// it never mutates, and it never loses or duplicates an element.

import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5];
    const snapshot = [...input];
    shuffle(input);
    expect(input).toEqual(snapshot);
  });

  it('returns a new array instance', () => {
    const input = [1, 2, 3];
    expect(shuffle(input)).not.toBe(input);
  });

  it('preserves every element exactly once', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f'];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(['only'])).toEqual(['only']);
  });

  it('actually reorders across repeated runs', () => {
    // Fisher-Yates on 10 elements returning identity 20 times in a row is
    // ~1 in 10^130 — a failure here means the shuffle is a no-op.
    const input = Array.from({ length: 10 }, (_, i) => i);
    const anyReordered = Array.from({ length: 20 }, () => shuffle(input)).some(
      (result) => result.some((v, i) => v !== input[i]),
    );
    expect(anyReordered).toBe(true);
  });
});
