// hooks/useShapeFitNL.test.ts
// Snap geometry is the whole game here, so the boundary cases get real
// attention: exactly at the radius, just outside, and dropping onto a
// neighbour's socket.

import { act, renderHook } from '@testing-library/react-native';
import { COUNTRIES, type CountryItem } from '../constants/countries';

import { SNAP_RADIUS, useShapeFitNL, type Point } from './useShapeFitNL';

/** The reference country's items — the games default to these. */
const NL_ITEMS: readonly CountryItem[] = COUNTRIES[0].items;

/** Sockets laid out in a row, 200px apart — far enough not to overlap. */
const SOCKETS: Record<string, Point> = Object.fromEntries(
  NL_ITEMS.map((item: CountryItem, i: number) => [item.id, { x: 100 + i * 200, y: 300 }]),
);

const first = NL_ITEMS[0].id;
const second = NL_ITEMS[1].id;

describe('useShapeFitNL', () => {
  it('starts with nothing seated and all five in the tray', () => {
    const { result } = renderHook(() => useShapeFitNL());
    expect(result.current.trayOrder).toHaveLength(5);
    expect(new Set(result.current.trayOrder).size).toBe(5);
    expect(result.current.seated.size).toBe(0);
    expect(result.current.isWon).toBe(false);
  });

  it('seats a piece dropped exactly on its socket', () => {
    const { result } = renderHook(() => useShapeFitNL());

    let ok = false;
    act(() => {
      ok = result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });

    expect(ok).toBe(true);
    expect(result.current.seated.has(first)).toBe(true);
    expect(result.current.lastEvent).toBe('seated');
  });

  it('seats a piece dropped just inside the snap radius', () => {
    const { result } = renderHook(() => useShapeFitNL());
    const near = { x: SOCKETS[first].x + SNAP_RADIUS - 1, y: SOCKETS[first].y };

    act(() => {
      result.current.tryDrop(first, near, SOCKETS);
    });

    expect(result.current.seated.has(first)).toBe(true);
  });

  it('rejects a drop nearer a NEIGHBOUR, even inside its own radius', () => {
    // THE BUG THIS PINS DOWN was fixed in the puzzle and left here.
    //
    // The snap radius is an absolute 78pt. Real boards put sockets closer than
    // that — iPhone landscape is the tight case — so a piece dropped squarely
    // on its neighbour was still inside its own socket's radius and seated,
    // visibly jumping sideways to get there.
    const tight: Record<string, Point> = {
      [first]: { x: 200, y: 300 },
      [second]: { x: 240, y: 300 },
    };
    const { result } = renderHook(() => useShapeFitNL());

    let ok = true;
    act(() => {
      ok = result.current.tryDrop(first, tight[second], tight);
    });

    expect(ok).toBe(false);
    expect(result.current.seated.has(first)).toBe(false);
  });

  it('rejects a drop just outside the snap radius', () => {
    const { result } = renderHook(() => useShapeFitNL());
    const far = { x: SOCKETS[first].x + SNAP_RADIUS + 1, y: SOCKETS[first].y };

    let ok = true;
    act(() => {
      ok = result.current.tryDrop(first, far, SOCKETS);
    });

    expect(ok).toBe(false);
    expect(result.current.seated.has(first)).toBe(false);
    expect(result.current.lastEvent).toBe('rejected');
  });

  it('measures distance diagonally, not per-axis', () => {
    const { result } = renderHook(() => useShapeFitNL());
    // 60 right and 60 down is 84.8 away — outside a 72 radius, even though
    // neither axis alone exceeds it.
    const diagonal = { x: SOCKETS[first].x + 60, y: SOCKETS[first].y + 60 };

    act(() => {
      result.current.tryDrop(first, diagonal, SOCKETS);
    });

    expect(result.current.seated.has(first)).toBe(false);
  });

  it('rejects a piece dropped on the WRONG socket', () => {
    const { result } = renderHook(() => useShapeFitNL());

    act(() => {
      result.current.tryDrop(first, SOCKETS[second], SOCKETS);
    });

    expect(result.current.seated.has(first)).toBe(false);
    expect(result.current.seated.has(second)).toBe(false);
    expect(result.current.lastEvent).toBe('rejected');
  });

  // BEHAVIOUR CHANGED DELIBERATELY: a seated piece used to be frozen. It can
  // now be picked back up and moved. A 2-year-old who places something and
  // wants it back is playing, and refusing would be the first "no" the game
  // ever says (CLAUDE.md rule 2).
  it('lets a seated piece be picked up again', () => {
    const { result } = renderHook(() => useShapeFitNL());
    act(() => {
      result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });
    const seqAfterSeat = result.current.eventSeq;

    act(() => result.current.liftPiece(first));

    expect(result.current.eventSeq).toBeGreaterThan(seqAfterSeat);
    expect(result.current.lastEvent).toBe('lift');
  });

  it('re-seating a piece already in place is harmless', () => {
    const { result } = renderHook(() => useShapeFitNL());
    act(() => {
      result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });
    act(() => {
      result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });

    // Still exactly one entry — no duplicate, no lost piece.
    expect(result.current.seated.size).toBe(1);
    expect(result.current.seated.has(first)).toBe(true);
  });

  it('unseats a piece taken back out', () => {
    const { result } = renderHook(() => useShapeFitNL());
    act(() => {
      result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });
    expect(result.current.seated.has(first)).toBe(true);

    act(() => result.current.unseatPiece(first));

    expect(result.current.seated.has(first)).toBe(false);
    expect(result.current.lastEvent).toBe('unseated');
  });

  it('unseating something that was never seated does nothing', () => {
    const { result } = renderHook(() => useShapeFitNL());
    const seq = result.current.eventSeq;

    act(() => result.current.unseatPiece(second));

    expect(result.current.eventSeq).toBe(seq);
  });

  it('a win can be undone and won again', () => {
    // The board is never locked, not even after the celebration.
    const { result } = renderHook(() => useShapeFitNL());
    for (const item of NL_ITEMS) {
      act(() => {
        result.current.tryDrop(item.id, SOCKETS[item.id], SOCKETS);
      });
    }
    expect(result.current.isWon).toBe(true);

    act(() => result.current.unseatPiece(first));
    expect(result.current.isWon).toBe(false);

    act(() => {
      result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });
    expect(result.current.isWon).toBe(true);
  });

  it('rejects gracefully when the socket map has no entry', () => {
    const { result } = renderHook(() => useShapeFitNL());

    let ok = true;
    act(() => {
      ok = result.current.tryDrop(first, { x: 0, y: 0 }, {});
    });

    expect(ok).toBe(false);
    expect(result.current.lastEvent).toBe('rejected');
  });

  it('wins only when all five are seated', () => {
    const { result } = renderHook(() => useShapeFitNL());

    NL_ITEMS.forEach((item: CountryItem, index: number) => {
      act(() => {
        result.current.tryDrop(item.id, SOCKETS[item.id], SOCKETS);
      });
      expect(result.current.isWon).toBe(index === NL_ITEMS.length - 1);
    });
  });

  it('a rejected drop never blocks a later correct one', () => {
    // No fail state: a wrong move costs nothing (CLAUDE.md rule 2).
    const { result } = renderHook(() => useShapeFitNL());

    act(() => {
      result.current.tryDrop(first, { x: 9999, y: 9999 }, SOCKETS);
    });
    act(() => {
      result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });

    expect(result.current.seated.has(first)).toBe(true);
  });

  it('reset clears the board and reshuffles the tray', () => {
    const { result } = renderHook(() => useShapeFitNL());
    act(() => {
      result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });

    act(() => result.current.reset());

    expect(result.current.seated.size).toBe(0);
    expect(result.current.isWon).toBe(false);
    expect(result.current.lastEvent).toBeNull();
    expect(result.current.trayOrder).toHaveLength(5);
  });

  it('exposes no score, lives, or timer (toddler UX)', () => {
    const { result } = renderHook(() => useShapeFitNL());
    const keys = Object.keys(result.current);
    expect(keys).not.toContain('score');
    expect(keys).not.toContain('lives');
    expect(keys).not.toContain('mistakes');
  });

  it('moving a seated piece to the wrong place takes it out of the board', () => {
    // Dragging a placed piece somewhere invalid should release it, not
    // teleport it back into the socket as if nothing happened.
    const { result } = renderHook(() => useShapeFitNL());
    act(() => {
      result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });

    act(() => result.current.unseatPiece(first));
    act(() => {
      result.current.tryDrop(first, { x: 9999, y: 9999 }, SOCKETS);
    });

    expect(result.current.seated.has(first)).toBe(false);
  });
});
