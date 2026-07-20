// hooks/usePuzzle.ts
// Jigsaw logic: a country's landmark, cut into pieces, dragged back together.
//
// This replaces Memory. The reason is the one a 2-year-old demonstrated: in a
// drag game the object comes under their control, and in Memory it never did.
// A jigsaw keeps that agency and adds something Shape Fit lacks — the pieces
// build up into a PICTURE, so progress is visible in the thing itself rather
// than in a progress bar.
//
// Contract from the game-logic-hook skill: no component imports, no native
// calls. Geometry lives in the screen; this owns only which cell is filled.
//
// Toddler UX: no timer, no lives, no score, and a wrong drop costs nothing.

import { useCallback, useMemo, useState } from 'react';
import { shuffle } from '../utils/shuffle';

/** A drop this close to a cell's centre counts as a fit. */
export const PUZZLE_SNAP_RADIUS = 78;

export type Point = { x: number; y: number };

/**
 * One piece, identified by its SHAPE.
 *
 * A shape is the whole point: a circle has exactly one hole it can enter, and
 * a 2-year-old can see which before they try. Identical rectangular pieces —
 * the first design — forced them to read fragments of picture instead.
 */
export type PuzzleCell = {
  id: string;
};

export type PuzzleEvent = 'lift' | 'placed' | 'rejected' | 'removed' | null;

export type PuzzleGame = {
  /** Every cell, in grid order. */
  cells: PuzzleCell[];
  /** Tray order — shuffled, so the picture is never handed over pre-solved. */
  trayOrder: string[];
  placed: Set<string>;
  isWon: boolean;
  liftPiece: (id: string) => void;
  tryPlace: (id: string, point: Point, targets: Record<string, Point>) => boolean;
  removePiece: (id: string) => void;
  reset: () => void;
  lastEvent: PuzzleEvent;
  lastCellId: string | null;
  eventSeq: number;
  /** Increments on reset, so pieces jump home instead of flying across. */
  round: number;
};



function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * The socket a drop lands closest to, or null if there are none.
 *
 * A piece is placed only when the nearest socket is ITS OWN. Checking only
 * that the drop was within the snap radius of the right socket was not enough:
 * the radius is an absolute number of points, and on iPhone landscape the
 * board is small enough that two sockets sit 42pt apart — well inside a 78pt
 * radius — so a piece dropped squarely on the WRONG socket was accepted, and
 * the picture assembled itself wrong.
 *
 * Nearest-wins has no such dependence on how large the board happens to be.
 */
export function nearestSocket(
  point: Point,
  targets: Record<string, Point>,
): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const [id, target] of Object.entries(targets)) {
    const d = distance(point, target);
    if (d < bestDistance) {
      bestDistance = d;
      best = id;
    }
  }
  return best;
}

/**
 * @param partIds the ids of the parts this country's picture comes apart into
 */
export function usePuzzle(partIds: readonly string[]): PuzzleGame {
  // Joined so the identity is stable across renders with the same parts.
  const key = partIds.join(',');
  const cells = useMemo(
    () => key.split(',').filter(Boolean).map((id) => ({ id })),
    [key],
  );

  const [trayOrder, setTrayOrder] = useState<string[]>(() =>
    shuffle(cells.map((c) => c.id)),
  );
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [lastEvent, setLastEvent] = useState<PuzzleEvent>(null);
  const [lastCellId, setLastCellId] = useState<string | null>(null);
  const [eventSeq, setEventSeq] = useState(0);
  const [round, setRound] = useState(0);

  const emit = useCallback((event: Exclude<PuzzleEvent, null>, id: string | null) => {
    setLastEvent(event);
    setLastCellId(id);
    setEventSeq((n) => n + 1);
  }, []);

  const placed = useMemo(() => new Set(placedIds), [placedIds]);
  const isWon = placedIds.length === cells.length && cells.length > 0;

  const liftPiece = useCallback(
    (id: string) => {
      emit('lift', id);
    },
    [emit],
  );

  const tryPlace = useCallback(
    (id: string, point: Point, targets: Record<string, Point>): boolean => {
      const target = targets[id];
      if (!target) {
        emit('rejected', id);
        return false;
      }
      if (nearestSocket(point, targets) !== id) {
        emit('rejected', id);
        return false;
      }
      if (distance(point, target) > PUZZLE_SNAP_RADIUS) {
        // Wrong spot. Nothing is lost — the piece simply goes home (rule 2).
        emit('rejected', id);
        return false;
      }
      setPlacedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      emit('placed', id);
      return true;
    },
    [emit],
  );

  const removePiece = useCallback(
    (id: string) => {
      if (!placed.has(id)) return;
      setPlacedIds((prev) => prev.filter((x) => x !== id));
      emit('removed', id);
    },
    [placed, emit],
  );

  const reset = useCallback(() => {
    setPlacedIds([]);
    setLastEvent(null);
    setLastCellId(null);
    setEventSeq(0);
    setTrayOrder(shuffle(cells.map((c) => c.id)));
    setRound((n) => n + 1);
  }, [cells]);

  return {
    cells,
    trayOrder,
    placed,
    isWon,
    liftPiece,
    tryPlace,
    removePiece,
    reset,
    lastEvent,
    lastCellId,
    eventSeq,
    round,
  };
}
