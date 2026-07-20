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

  it('ignores a re-drop of an already seated piece', () => {
    const { result } = renderHook(() => useShapeFitNL());
    act(() => {
      result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });

    let ok = true;
    act(() => {
      ok = result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });

    expect(ok).toBe(false);
    expect(result.current.seated.size).toBe(1);
  });

  it('does not emit a lift for a seated piece', () => {
    const { result } = renderHook(() => useShapeFitNL());
    act(() => {
      result.current.tryDrop(first, SOCKETS[first], SOCKETS);
    });
    const seqAfterSeat = result.current.eventSeq;

    act(() => result.current.liftPiece(first));

    expect(result.current.eventSeq).toBe(seqAfterSeat);
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
});
