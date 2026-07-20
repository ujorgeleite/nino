// hooks/useMemoryNL.ts
// Memory (Netherlands) game logic — prompts/starting.md §6.
// 5 pairs, shuffled. Two up: match stays and pops a ✓; miss flips back after
// ~900ms. Input is locked during the two-card check.
//
// Contract from the game-logic-hook skill: no component imports, no native
// calls. Events are reported through `lastEvent`; the screen decides what a
// match feels and sounds like.
//
// Toddler UX: no timer, no lives, no score. `tries` is counted only because
// §6 shows it on the win overlay ("in N tries") — it is a parent-facing
// souvenir, never pressure during play.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRIES, type CountryItem } from '../constants/countries';
import { shuffle } from '../utils/shuffle';

/** How long a mismatched pair stays visible before flipping back (§6). */
export const MISMATCH_MS = 900;

export type CardStatus = 'down' | 'up' | 'matched';

export type MemoryCard = {
  instanceId: string;
  itemId: string;
  emoji: string;
  tint: string;
  status: CardStatus;
};

export type MemoryEvent = 'flip' | 'match' | 'mismatch' | null;

export type MemoryNLGame = {
  cards: MemoryCard[];
  /** Item ids already found, in board order — drives the progress rail. */
  foundItemIds: string[];
  isWon: boolean;
  tries: number;
  locked: boolean;
  flipCard: (instanceId: string) => void;
  reset: () => void;
  lastEvent: MemoryEvent;
  /** The item id involved in the last event — lets the screen play its voice. */
  lastItemId: string | null;
  /** Increments on every event, so effects can react to repeats of one event. */
  eventSeq: number;
};

function buildDeck(items: readonly CountryItem[]): MemoryCard[] {
  const doubled = items.flatMap((item) => [0, 1].map((n) => ({ ...item, n })));
  return shuffle(doubled).map(({ id, emoji, tint, n }) => ({
    instanceId: `${id}-${n}`,
    itemId: id,
    emoji,
    tint,
    status: 'down' as const,
  }));
}

/** Default items keep old call sites (and tests) working. */
const DEFAULT_ITEMS = COUNTRIES[0].items;

export function useMemoryNL(
  items: readonly CountryItem[] = DEFAULT_ITEMS,
): MemoryNLGame {
  const [cards, setCards] = useState<MemoryCard[]>(() => buildDeck(items));
  const [locked, setLocked] = useState(false);
  const [tries, setTries] = useState(0);
  const [lastEvent, setLastEvent] = useState<MemoryEvent>(null);
  const [lastItemId, setLastItemId] = useState<string | null>(null);
  const [eventSeq, setEventSeq] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A pending flip-back must never outlive the screen, or it fires into an
  // unmounted tree and the board would come back locked on remount.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const emit = useCallback(
    (event: Exclude<MemoryEvent, null>, itemId: string | null = null) => {
      setLastEvent(event);
      setLastItemId(itemId);
      setEventSeq((n) => n + 1);
    },
    [],
  );

  const isWon = useMemo(
    () => cards.length > 0 && cards.every((c) => c.status === 'matched'),
    [cards],
  );

  const foundItemIds = useMemo(
    () =>
      items
        .map((item) => item.id)
        .filter((id) => cards.some((c) => c.itemId === id && c.status === 'matched')),
    [cards, items],
  );

  const flipCard = useCallback(
    (instanceId: string) => {
      if (locked) return;

      setCards((prev) => {
        const target = prev.find((c) => c.instanceId === instanceId);
        if (!target || target.status !== 'down') return prev;

        const next = prev.map((c) =>
          c.instanceId === instanceId ? { ...c, status: 'up' as const } : c,
        );
        const faceUp = next.filter((c) => c.status === 'up');

        if (faceUp.length < 2) {
          emit('flip', target.itemId);
          return next;
        }

        // Second card: this completes an attempt.
        setTries((n) => n + 1);
        const [a, b] = faceUp;

        if (a.itemId === b.itemId) {
          emit('match', a.itemId);
          return next.map((c) =>
            c.status === 'up' ? { ...c, status: 'matched' as const } : c,
          );
        }

        emit('mismatch');
        setLocked(true);
        timer.current = setTimeout(() => {
          timer.current = null;
          setCards((cur) =>
            cur.map((c) => (c.status === 'up' ? { ...c, status: 'down' as const } : c)),
          );
          setLocked(false);
        }, MISMATCH_MS);
        return next;
      });
    },
    [locked, emit],
  );

  const reset = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setLocked(false);
    setTries(0);
    setLastEvent(null);
    setLastItemId(null);
    setEventSeq(0);
    setCards(buildDeck(items));
  }, [items]);

  return {
    cards,
    foundItemIds,
    isWon,
    tries,
    locked,
    flipCard,
    reset,
    lastEvent,
    lastItemId,
    eventSeq,
  };
}
