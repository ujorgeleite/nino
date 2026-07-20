// hooks/useMemoryNL.test.ts
// Full-cycle coverage of the Memory NL state machine, through the public API.

import { act, renderHook } from '@testing-library/react-native';
import { COUNTRIES, type CountryItem } from '../constants/countries';

import { MISMATCH_MS, useMemoryNL, type MemoryCard } from './useMemoryNL';

/** The reference country's items — the games default to these. */
const NL_ITEMS: readonly CountryItem[] = COUNTRIES[0].items;

function pairFor(cards: MemoryCard[], itemId: string): [string, string] {
  const ids = cards.filter((c) => c.itemId === itemId).map((c) => c.instanceId);
  expect(ids).toHaveLength(2);
  return [ids[0], ids[1]];
}

function mismatchedPair(cards: MemoryCard[]): [string, string] {
  const a = cards[0];
  const b = cards.find((c) => c.itemId !== a.itemId);
  expect(b).toBeDefined();
  return [a.instanceId, b!.instanceId];
}

describe('useMemoryNL', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('deals 10 cards — 5 pairs — all face down', () => {
    const { result } = renderHook(() => useMemoryNL());
    expect(result.current.cards).toHaveLength(10);
    expect(NL_ITEMS).toHaveLength(5);
    expect(result.current.cards.every((c) => c.status === 'down')).toBe(true);
    expect(result.current.isWon).toBe(false);
    expect(result.current.tries).toBe(0);
  });

  it('includes exactly two cards per item', () => {
    const { result } = renderHook(() => useMemoryNL());
    for (const item of NL_ITEMS) {
      expect(result.current.cards.filter((c) => c.itemId === item.id)).toHaveLength(2);
    }
  });

  it('gives every card a unique instanceId', () => {
    const { result } = renderHook(() => useMemoryNL());
    const ids = result.current.cards.map((c) => c.instanceId);
    expect(new Set(ids).size).toBe(10);
  });

  it('turns one card up and reports a flip', () => {
    const { result } = renderHook(() => useMemoryNL());
    const id = result.current.cards[0].instanceId;

    act(() => result.current.flipCard(id));

    expect(result.current.cards.find((c) => c.instanceId === id)?.status).toBe('up');
    expect(result.current.lastEvent).toBe('flip');
    expect(result.current.tries).toBe(0); // a single flip is not an attempt
  });

  it('keeps a matched pair face up and records the item as found', () => {
    const { result } = renderHook(() => useMemoryNL());
    const [a, b] = pairFor(result.current.cards, NL_ITEMS[0].id);

    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));

    expect(result.current.lastEvent).toBe('match');
    expect(result.current.foundItemIds).toEqual([NL_ITEMS[0].id]);
    expect(
      result.current.cards.filter((c) => c.status === 'matched'),
    ).toHaveLength(2);
    expect(result.current.tries).toBe(1);
  });

  it('flips a mismatch back down after the reveal window', () => {
    const { result } = renderHook(() => useMemoryNL());
    const [a, b] = mismatchedPair(result.current.cards);

    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));

    expect(result.current.lastEvent).toBe('mismatch');
    expect(result.current.locked).toBe(true);

    act(() => jest.advanceTimersByTime(MISMATCH_MS));

    // No fail state: everything returns to playable (CLAUDE.md rule 2).
    expect(result.current.cards.every((c) => c.status === 'down')).toBe(true);
    expect(result.current.locked).toBe(false);
    expect(result.current.foundItemIds).toEqual([]);
  });

  it('ignores taps while a mismatch is resolving', () => {
    const { result } = renderHook(() => useMemoryNL());
    const [a, b] = mismatchedPair(result.current.cards);
    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));

    const third = result.current.cards.find(
      (c) => c.instanceId !== a && c.instanceId !== b,
    )!.instanceId;
    act(() => result.current.flipCard(third));

    expect(result.current.cards.find((c) => c.instanceId === third)?.status).toBe('down');
    expect(result.current.tries).toBe(1); // the ignored tap is not an attempt
  });

  it('ignores a repeat tap on an already face-up card', () => {
    const { result } = renderHook(() => useMemoryNL());
    const id = result.current.cards[0].instanceId;

    act(() => result.current.flipCard(id));
    act(() => result.current.flipCard(id));

    expect(result.current.cards.filter((c) => c.status === 'up')).toHaveLength(1);
    expect(result.current.tries).toBe(0);
  });

  it('ignores taps on an already matched card', () => {
    const { result } = renderHook(() => useMemoryNL());
    const [a, b] = pairFor(result.current.cards, NL_ITEMS[0].id);
    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));

    act(() => result.current.flipCard(a));

    expect(result.current.cards.filter((c) => c.status === 'up')).toHaveLength(0);
    expect(result.current.tries).toBe(1);
  });

  it('fills the progress rail in board order as pairs are found', () => {
    const { result } = renderHook(() => useMemoryNL());

    // Find the third item first — the rail must still list items in NL_ITEMS
    // order, not discovery order, so the rail does not jump around.
    const [a, b] = pairFor(result.current.cards, NL_ITEMS[2].id);
    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));

    expect(result.current.foundItemIds).toEqual([NL_ITEMS[2].id]);

    const [c, d] = pairFor(result.current.cards, NL_ITEMS[0].id);
    act(() => result.current.flipCard(c));
    act(() => result.current.flipCard(d));

    expect(result.current.foundItemIds).toEqual([NL_ITEMS[0].id, NL_ITEMS[2].id]);
  });

  it('wins only after the last pair, and counts every attempt', () => {
    const { result } = renderHook(() => useMemoryNL());

    NL_ITEMS.forEach((item: CountryItem, index: number) => {
      const [a, b] = pairFor(result.current.cards, item.id);
      act(() => result.current.flipCard(a));
      act(() => result.current.flipCard(b));
      expect(result.current.isWon).toBe(index === NL_ITEMS.length - 1);
    });

    expect(result.current.tries).toBe(5); // a perfect game
    expect(result.current.foundItemIds).toHaveLength(5);
  });

  it('counts a miss as an attempt too', () => {
    const { result } = renderHook(() => useMemoryNL());
    const [a, b] = mismatchedPair(result.current.cards);

    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));
    act(() => jest.advanceTimersByTime(MISMATCH_MS));

    expect(result.current.tries).toBe(1);
  });

  it('bumps eventSeq so two identical events are distinguishable', () => {
    const { result } = renderHook(() => useMemoryNL());
    const [a, b] = pairFor(result.current.cards, NL_ITEMS[0].id);
    act(() => result.current.flipCard(a));
    const first = result.current.eventSeq;

    act(() => result.current.flipCard(b));

    expect(result.current.eventSeq).toBeGreaterThan(first);
  });

  it('reset deals a fresh board and clears the counters', () => {
    const { result } = renderHook(() => useMemoryNL());
    const [a, b] = pairFor(result.current.cards, NL_ITEMS[0].id);
    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));

    act(() => result.current.reset());

    expect(result.current.cards.every((c) => c.status === 'down')).toBe(true);
    expect(result.current.tries).toBe(0);
    expect(result.current.foundItemIds).toEqual([]);
    expect(result.current.lastEvent).toBeNull();
    expect(result.current.isWon).toBe(false);
  });

  it('reset during a pending mismatch does not re-lock the fresh board', () => {
    const { result } = renderHook(() => useMemoryNL());
    const [a, b] = mismatchedPair(result.current.cards);
    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));

    act(() => result.current.reset());
    act(() => jest.advanceTimersByTime(MISMATCH_MS * 2));

    expect(result.current.locked).toBe(false);
    expect(result.current.cards.every((c) => c.status === 'down')).toBe(true);
  });

  it('exposes no score, lives, or timer (toddler UX)', () => {
    const { result } = renderHook(() => useMemoryNL());
    const keys = Object.keys(result.current);
    expect(keys).not.toContain('score');
    expect(keys).not.toContain('lives');
    expect(keys).not.toContain('timeRemaining');
  });
});
