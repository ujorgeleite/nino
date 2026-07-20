// hooks/useShapeFitNL.ts
// Shape Fit (Netherlands) game logic — prompts/starting.md §7.
//
// Five pieces in a tray, five recessed sockets on a board. A drop within
// SNAP_RADIUS of the correct socket seats the piece; anything else returns it
// to the tray. There is no penalty for a wrong drop (CLAUDE.md rule 2).
//
// Geometry lives in the component; this hook only owns "which piece is where".
// That keeps it testable without a layout pass.

import { useCallback, useMemo, useState } from 'react';
import { COUNTRIES, type CountryItem } from '../constants/countries';
import { shuffle } from '../utils/shuffle';

/** A drop this close to a socket's centre counts as a hit (§7: ~72px). */
export const SNAP_RADIUS = 72;

export type Point = { x: number; y: number };

export type ShapeFitEvent = 'lift' | 'seated' | 'rejected' | 'unseated' | null;

export type ShapeFitGame = {
  /** Tray order — shuffled once so the puzzle is not the same every time. */
  trayOrder: string[];
  /** Item ids already seated, keyed for O(1) lookup by the view. */
  seated: Set<string>;
  isWon: boolean;
  /**
   * Resolve a drop. Returns true when the piece seated.
   * `sockets` maps item id → socket centre, in the same space as `dropPoint`.
   */
  tryDrop: (itemId: string, dropPoint: Point, sockets: Record<string, Point>) => boolean;
  liftPiece: (itemId: string) => void;
  /**
   * Takes a seated piece back out.
   *
   * Undoing is a first-class move, not an error path: a 2-year-old placing
   * something and then wanting it back is play, and blocking it would be the
   * first "no" the game ever says (CLAUDE.md rule 2).
   */
  unseatPiece: (itemId: string) => void;
  reset: () => void;
  lastEvent: ShapeFitEvent;
  /** The item id involved in the last event — lets the screen play its voice. */
  lastItemId: string | null;
  eventSeq: number;
  /**
   * Increments on every reset.
   *
   * A new round RESHUFFLES the tray, so each piece lands in a different slot.
   * Pieces watch this to know they must JUMP home rather than spring: springing
   * would animate from a seated offset measured against the old slot toward a
   * zero that now means somewhere else, and every piece would fly diagonally
   * across the screen to the wrong place. That bug shipped.
   */
  round: number;
};

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Default items keep old call sites (and tests) working. */
const DEFAULT_ITEMS = COUNTRIES[0].items;

export function useShapeFitNL(
  items: readonly CountryItem[] = DEFAULT_ITEMS,
): ShapeFitGame {
  const [trayOrder, setTrayOrder] = useState<string[]>(() =>
    shuffle(items.map((i) => i.id)),
  );
  const [seatedIds, setSeatedIds] = useState<string[]>([]);
  const [lastEvent, setLastEvent] = useState<ShapeFitEvent>(null);
  const [lastItemId, setLastItemId] = useState<string | null>(null);
  const [eventSeq, setEventSeq] = useState(0);
  const [round, setRound] = useState(0);

  const emit = useCallback(
    (event: Exclude<ShapeFitEvent, null>, itemId: string | null = null) => {
      setLastEvent(event);
      setLastItemId(itemId);
      setEventSeq((n) => n + 1);
    },
    [],
  );

  const seated = useMemo(() => new Set(seatedIds), [seatedIds]);
  const isWon = seatedIds.length === items.length;

  const liftPiece = useCallback(
    (itemId: string) => {
      emit('lift', itemId);
    },
    [emit],
  );

  const unseatPiece = useCallback(
    (itemId: string) => {
      if (!seated.has(itemId)) return;
      setSeatedIds((prev) => prev.filter((id) => id !== itemId));
      emit('unseated', itemId);
    },
    [seated, emit],
  );

  const tryDrop = useCallback(
    (itemId: string, dropPoint: Point, sockets: Record<string, Point>): boolean => {
      const target = sockets[itemId];
      if (!target) {
        emit('rejected', itemId);
        return false;
      }

      if (distance(dropPoint, target) > SNAP_RADIUS) {
        // Wrong spot: the piece goes home, nothing is lost.
        emit('rejected', itemId);
        return false;
      }

      setSeatedIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
      emit('seated', itemId);
      return true;
    },
    [emit],
  );

  const reset = useCallback(() => {
    setSeatedIds([]);
    setLastEvent(null);
    setLastItemId(null);
    setEventSeq(0);
    setTrayOrder(shuffle(items.map((i) => i.id)));
    setRound((n) => n + 1);
  }, [items]);

  return {
    trayOrder,
    seated,
    isWon,
    tryDrop,
    liftPiece,
    unseatPiece,
    reset,
    lastEvent,
    lastItemId,
    eventSeq,
    round,
  };
}
