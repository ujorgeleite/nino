// hooks/usePuzzle.test.ts
// The jigsaw's rules. Snap geometry gets the same scrutiny as Shape Fit's,
// because it is again the whole game.

import { act, renderHook } from '@testing-library/react-native';
import { PUZZLE_SNAP_RADIUS, usePuzzle, type Point } from './usePuzzle';

const ROWS = 2;
const COLS = 3;

/** Cell targets laid out on a grid, far enough apart not to overlap. */
const TARGETS: Record<string, Point> = {};
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    TARGETS[`r${r}c${c}`] = { x: 200 + c * 220, y: 200 + r * 220 };
  }
}

const FIRST = 'r0c0';
const SECOND = 'r0c1';

describe('usePuzzle', () => {
  it('cuts the picture into rows × cols pieces', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    expect(result.current.cells).toHaveLength(ROWS * COLS);
    expect(new Set(result.current.cells.map((c) => c.id)).size).toBe(ROWS * COLS);
  });

  it('hands the pieces over shuffled, never pre-solved', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    expect(result.current.trayOrder).toHaveLength(ROWS * COLS);
    expect(new Set(result.current.trayOrder).size).toBe(ROWS * COLS);
    expect(result.current.placed.size).toBe(0);
    expect(result.current.isWon).toBe(false);
  });

  it('places a piece dropped on its own cell', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));

    let ok = false;
    act(() => {
      ok = result.current.tryPlace(FIRST, TARGETS[FIRST], TARGETS);
    });

    expect(ok).toBe(true);
    expect(result.current.placed.has(FIRST)).toBe(true);
    expect(result.current.lastEvent).toBe('placed');
  });

  it('places a piece dropped just inside the snap radius', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    const near = { x: TARGETS[FIRST].x + PUZZLE_SNAP_RADIUS - 1, y: TARGETS[FIRST].y };

    act(() => {
      result.current.tryPlace(FIRST, near, TARGETS);
    });

    expect(result.current.placed.has(FIRST)).toBe(true);
  });

  it('rejects a drop just outside the snap radius', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    const far = { x: TARGETS[FIRST].x + PUZZLE_SNAP_RADIUS + 1, y: TARGETS[FIRST].y };

    let ok = true;
    act(() => {
      ok = result.current.tryPlace(FIRST, far, TARGETS);
    });

    expect(ok).toBe(false);
    expect(result.current.placed.has(FIRST)).toBe(false);
  });

  it('measures distance diagonally, not per-axis', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    // 60 across and 60 down is 84.9 — outside a 78 radius, though neither
    // axis alone exceeds it.
    const diagonal = { x: TARGETS[FIRST].x + 60, y: TARGETS[FIRST].y + 60 };

    act(() => {
      result.current.tryPlace(FIRST, diagonal, TARGETS);
    });

    expect(result.current.placed.has(FIRST)).toBe(false);
  });

  it('rejects a piece dropped on the WRONG cell', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));

    act(() => {
      result.current.tryPlace(FIRST, TARGETS[SECOND], TARGETS);
    });

    expect(result.current.placed.has(FIRST)).toBe(false);
    expect(result.current.placed.has(SECOND)).toBe(false);
  });

  it('lets a placed piece be taken back out', () => {
    // Undoing is play, not an error path (CLAUDE.md rule 2).
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    act(() => {
      result.current.tryPlace(FIRST, TARGETS[FIRST], TARGETS);
    });

    act(() => result.current.removePiece(FIRST));

    expect(result.current.placed.has(FIRST)).toBe(false);
    expect(result.current.lastEvent).toBe('removed');
  });

  it('removing something never placed does nothing', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    const seq = result.current.eventSeq;

    act(() => result.current.removePiece(SECOND));

    expect(result.current.eventSeq).toBe(seq);
  });

  it('wins only when the picture is complete', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    const ids = Object.keys(TARGETS);

    ids.forEach((id, i) => {
      act(() => {
        result.current.tryPlace(id, TARGETS[id], TARGETS);
      });
      expect(result.current.isWon).toBe(i === ids.length - 1);
    });
  });

  it('a completed picture can be broken and rebuilt', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    for (const id of Object.keys(TARGETS)) {
      act(() => {
        result.current.tryPlace(id, TARGETS[id], TARGETS);
      });
    }
    expect(result.current.isWon).toBe(true);

    act(() => result.current.removePiece(FIRST));
    expect(result.current.isWon).toBe(false);

    act(() => {
      result.current.tryPlace(FIRST, TARGETS[FIRST], TARGETS);
    });
    expect(result.current.isWon).toBe(true);
  });

  it('a rejected drop never blocks a later correct one', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    act(() => {
      result.current.tryPlace(FIRST, { x: 9999, y: 9999 }, TARGETS);
    });
    act(() => {
      result.current.tryPlace(FIRST, TARGETS[FIRST], TARGETS);
    });
    expect(result.current.placed.has(FIRST)).toBe(true);
  });

  it('reset clears the picture and bumps the round', () => {
    // The round bump is what tells pieces to JUMP home rather than fly across
    // a reshuffled tray — the bug that shipped in Shape Fit.
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    const before = result.current.round;
    act(() => {
      result.current.tryPlace(FIRST, TARGETS[FIRST], TARGETS);
    });

    act(() => result.current.reset());

    expect(result.current.placed.size).toBe(0);
    expect(result.current.isWon).toBe(false);
    expect(result.current.round).toBe(before + 1);
  });

  it('exposes no score, lives, or timer (toddler UX)', () => {
    const { result } = renderHook(() => usePuzzle(ROWS, COLS));
    const keys = Object.keys(result.current);
    expect(keys).not.toContain('score');
    expect(keys).not.toContain('lives');
    expect(keys).not.toContain('mistakes');
  });
});
