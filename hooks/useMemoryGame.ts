// hooks/useMemoryGame.ts
// All Memory Match game logic lives here. Components stay presentational.
// Toddler UX rules (docs/TODDLER_UX.md): no fail state, no score, no timer.

import { useCallback, useMemo, useState } from 'react';
import { TRAVEL_CARDS, type CardInstance } from '../constants/cards';
import { shuffle } from '../utils/shuffle';

export type CardStatus = 'down' | 'up' | 'matched';

export type BoardCard = CardInstance & {
  status: CardStatus;
};

function buildDeck(): BoardCard[] {
  const doubled: CardInstance[] = TRAVEL_CARDS.flatMap((c) => [
    { instanceId: `${c.id}-0`, contentId: c.id, emoji: c.emoji },
    { instanceId: `${c.id}-1`, contentId: c.id, emoji: c.emoji },
  ]);
  return shuffle(doubled).map((c) => ({ ...c, status: 'down' as const }));
}

export type MemoryGame = {
  cards: BoardCard[];
  isWon: boolean;
  /** instanceIds currently flipped up and awaiting resolution */
  flipCard: (instanceId: string) => void;
  reset: () => void;
  lastEvent: 'match' | 'mismatch' | 'flip' | null;
};

export function useMemoryGame(): MemoryGame {
  const [cards, setCards] = useState<BoardCard[]>(buildDeck);
  const [locked, setLocked] = useState(false);
  const [lastEvent, setLastEvent] = useState<MemoryGame['lastEvent']>(null);

  const isWon = useMemo(
    () => cards.length > 0 && cards.every((c) => c.status === 'matched'),
    [cards],
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

        if (faceUp.length === 2) {
          const [a, b] = faceUp;
          if (a.contentId === b.contentId) {
            // Match: mark matched immediately, no lock needed.
            setLastEvent('match');
            return next.map((c) =>
              c.status === 'up' ? { ...c, status: 'matched' as const } : c,
            );
          }
          // Mismatch: lock briefly, then flip both back down.
          setLastEvent('mismatch');
          setLocked(true);
          setTimeout(() => {
            setCards((cur) =>
              cur.map((c) =>
                c.status === 'up' ? { ...c, status: 'down' as const } : c,
              ),
            );
            setLocked(false);
          }, 900);
          return next;
        }

        setLastEvent('flip');
        return next;
      });
    },
    [locked],
  );

  const reset = useCallback(() => {
    setLocked(false);
    setLastEvent(null);
    setCards(buildDeck());
  }, []);

  return { cards, isWon, flipCard, reset, lastEvent };
}
