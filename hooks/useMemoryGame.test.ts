// hooks/useMemoryGame.test.ts
// The reference test for game-logic hooks. It exercises a full game cycle
// through the public API only — no internals, no rendering of components.
//
// Note the toddler-UX assertions: no fail state, mismatches always recover.

import { act, renderHook } from '@testing-library/react-native';
import { TRAVEL_CARDS } from '../constants/cards';
import { useMemoryGame, type BoardCard } from './useMemoryGame';

/** Finds the two instanceIds that share a contentId. */
function pairFor(cards: BoardCard[], contentId: string): [string, string] {
  const ids = cards.filter((c) => c.contentId === contentId).map((c) => c.instanceId);
  expect(ids).toHaveLength(2);
  return [ids[0], ids[1]];
}

/** Two instanceIds belonging to *different* content. */
function mismatchedPair(cards: BoardCard[]): [string, string] {
  const a = cards[0];
  const b = cards.find((c) => c.contentId !== a.contentId);
  expect(b).toBeDefined();
  return [a.instanceId, b!.instanceId];
}

describe('useMemoryGame', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('builds a deck of two cards per travel card, all face down', () => {
    const { result } = renderHook(() => useMemoryGame());
    expect(result.current.cards).toHaveLength(TRAVEL_CARDS.length * 2);
    expect(result.current.cards.every((c) => c.status === 'down')).toBe(true);
    expect(result.current.isWon).toBe(false);
  });

  it('gives every card a unique instanceId', () => {
    const { result } = renderHook(() => useMemoryGame());
    const ids = result.current.cards.map((c) => c.instanceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('flipping one card turns it up and reports a flip event', () => {
    const { result } = renderHook(() => useMemoryGame());
    const target = result.current.cards[0].instanceId;

    act(() => result.current.flipCard(target));

    const card = result.current.cards.find((c) => c.instanceId === target);
    expect(card?.status).toBe('up');
    expect(result.current.lastEvent).toBe('flip');
  });

  it('marks both cards matched when contentIds agree', () => {
    const { result } = renderHook(() => useMemoryGame());
    const [a, b] = pairFor(result.current.cards, TRAVEL_CARDS[0].id);

    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));

    const matched = result.current.cards.filter((c) => c.status === 'matched');
    expect(matched.map((c) => c.instanceId).sort()).toEqual([a, b].sort());
    expect(result.current.lastEvent).toBe('match');
  });

  it('flips a mismatched pair back down after the reveal delay', () => {
    const { result } = renderHook(() => useMemoryGame());
    const [a, b] = mismatchedPair(result.current.cards);

    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));

    expect(result.current.cards.filter((c) => c.status === 'up')).toHaveLength(2);
    expect(result.current.lastEvent).toBe('mismatch');

    act(() => jest.advanceTimersByTime(900));

    // Toddler UX: a mismatch costs nothing. Everything returns to playable.
    expect(result.current.cards.filter((c) => c.status === 'up')).toHaveLength(0);
    expect(result.current.cards.every((c) => c.status === 'down')).toBe(true);
  });

  it('ignores taps while a mismatch is resolving', () => {
    const { result } = renderHook(() => useMemoryGame());
    const [a, b] = mismatchedPair(result.current.cards);
    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));

    const third = result.current.cards.find(
      (c) => c.instanceId !== a && c.instanceId !== b,
    )!.instanceId;
    act(() => result.current.flipCard(third));

    expect(
      result.current.cards.find((c) => c.instanceId === third)?.status,
    ).toBe('down');
  });

  it('ignores a second tap on an already face-up card', () => {
    const { result } = renderHook(() => useMemoryGame());
    const target = result.current.cards[0].instanceId;

    act(() => result.current.flipCard(target));
    act(() => result.current.flipCard(target));

    expect(result.current.cards.filter((c) => c.status === 'up')).toHaveLength(1);
  });

  it('reaches isWon only after every pair is matched', () => {
    const { result } = renderHook(() => useMemoryGame());

    TRAVEL_CARDS.forEach((content, index) => {
      const [a, b] = pairFor(result.current.cards, content.id);
      act(() => result.current.flipCard(a));
      act(() => result.current.flipCard(b));

      const isLast = index === TRAVEL_CARDS.length - 1;
      expect(result.current.isWon).toBe(isLast);
    });

    expect(result.current.cards.every((c) => c.status === 'matched')).toBe(true);
  });

  it('reset returns a fresh face-down deck and clears the event channel', () => {
    const { result } = renderHook(() => useMemoryGame());
    const [a, b] = pairFor(result.current.cards, TRAVEL_CARDS[0].id);
    act(() => result.current.flipCard(a));
    act(() => result.current.flipCard(b));
    expect(result.current.lastEvent).toBe('match');

    act(() => result.current.reset());

    expect(result.current.cards.every((c) => c.status === 'down')).toBe(true);
    expect(result.current.lastEvent).toBeNull();
    expect(result.current.isWon).toBe(false);
  });

  it('never exposes a score, timer, or lives (toddler UX rule 2)', () => {
    const { result } = renderHook(() => useMemoryGame());
    const keys = Object.keys(result.current);
    expect(keys).not.toContain('score');
    expect(keys).not.toContain('lives');
    expect(keys).not.toContain('timeRemaining');
  });
});
