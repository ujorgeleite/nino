// hooks/usePuzzle.test.ts
// The jigsaw's rules. Snap geometry gets the same scrutiny as Shape Fit's,
// because it is again the whole game.

import { act, renderHook } from '@testing-library/react-native';
import { PUZZLE_SNAP_RADIUS, usePuzzle, type Point } from './usePuzzle';
import { PUZZLE_SHAPES, PIECE_COUNT } from '../constants/puzzleShapes';

/** Hole targets, far enough apart that no drop is ambiguous. */
const TARGETS: Record<string, Point> = Object.fromEntries(
  PUZZLE_SHAPES.map((s, i) => [s.id, { x: 200 + i * 240, y: 260 }]),
);

const FIRST = PUZZLE_SHAPES[0].id;
const SECOND = PUZZLE_SHAPES[1].id;

describe('usePuzzle', () => {
  it('cuts the picture into one piece per shape', () => {
    const { result } = renderHook(() => usePuzzle());
    expect(result.current.cells).toHaveLength(PIECE_COUNT);
    expect(new Set(result.current.cells.map((c) => c.id)).size).toBe(PIECE_COUNT);
  });

  it('gives every piece a DIFFERENT shape', () => {
    // The whole design: shape alone tells a 2-year-old where a piece goes.
    // Two pieces sharing a shape would reintroduce the guessing this removed.
    const ids = PUZZLE_SHAPES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the holes apart so no drop is ambiguous', () => {
    // Two holes close enough to overlap the snap radius would let a piece look
    // plausible in the wrong one.
    // Jest's expect takes no message argument; the offending pair is carried
    // in the compared value instead.
    const tooClose: string[] = [];
    for (let i = 0; i < PUZZLE_SHAPES.length; i++) {
      for (let j = i + 1; j < PUZZLE_SHAPES.length; j++) {
        const a = PUZZLE_SHAPES[i];
        const b = PUZZLE_SHAPES[j];
        const gap = Math.hypot(a.cx - b.cx, a.cy - b.cy);
        const halves = (a.size + b.size) / 2;
        if (gap <= halves * 0.9) tooClose.push(`${a.id}/${b.id}`);
      }
    }
    expect(tooClose).toEqual([]);
  });

  it('hands the pieces over shuffled, never pre-solved', () => {
    const { result } = renderHook(() => usePuzzle());
    expect(result.current.trayOrder).toHaveLength(PIECE_COUNT);
    expect(new Set(result.current.trayOrder).size).toBe(PIECE_COUNT);
    expect(result.current.placed.size).toBe(0);
    expect(result.current.isWon).toBe(false);
  });

  it('places a piece dropped on its own cell', () => {
    const { result } = renderHook(() => usePuzzle());

    let ok = false;
    act(() => {
      ok = result.current.tryPlace(FIRST, TARGETS[FIRST], TARGETS);
    });

    expect(ok).toBe(true);
    expect(result.current.placed.has(FIRST)).toBe(true);
    expect(result.current.lastEvent).toBe('placed');
  });

  it('places a piece dropped just inside the snap radius', () => {
    const { result } = renderHook(() => usePuzzle());
    const near = { x: TARGETS[FIRST].x + PUZZLE_SNAP_RADIUS - 1, y: TARGETS[FIRST].y };

    act(() => {
      result.current.tryPlace(FIRST, near, TARGETS);
    });

    expect(result.current.placed.has(FIRST)).toBe(true);
  });

  it('rejects a drop just outside the snap radius', () => {
    const { result } = renderHook(() => usePuzzle());
    const far = { x: TARGETS[FIRST].x + PUZZLE_SNAP_RADIUS + 1, y: TARGETS[FIRST].y };

    let ok = true;
    act(() => {
      ok = result.current.tryPlace(FIRST, far, TARGETS);
    });

    expect(ok).toBe(false);
    expect(result.current.placed.has(FIRST)).toBe(false);
  });

  it('measures distance diagonally, not per-axis', () => {
    const { result } = renderHook(() => usePuzzle());
    // 60 across and 60 down is 84.9 — outside a 78 radius, though neither
    // axis alone exceeds it.
    const diagonal = { x: TARGETS[FIRST].x + 60, y: TARGETS[FIRST].y + 60 };

    act(() => {
      result.current.tryPlace(FIRST, diagonal, TARGETS);
    });

    expect(result.current.placed.has(FIRST)).toBe(false);
  });

  it('rejects a piece dropped on the WRONG cell', () => {
    const { result } = renderHook(() => usePuzzle());

    act(() => {
      result.current.tryPlace(FIRST, TARGETS[SECOND], TARGETS);
    });

    expect(result.current.placed.has(FIRST)).toBe(false);
    expect(result.current.placed.has(SECOND)).toBe(false);
  });

  it('lets a placed piece be taken back out', () => {
    // Undoing is play, not an error path (CLAUDE.md rule 2).
    const { result } = renderHook(() => usePuzzle());
    act(() => {
      result.current.tryPlace(FIRST, TARGETS[FIRST], TARGETS);
    });

    act(() => result.current.removePiece(FIRST));

    expect(result.current.placed.has(FIRST)).toBe(false);
    expect(result.current.lastEvent).toBe('removed');
  });

  it('removing something never placed does nothing', () => {
    const { result } = renderHook(() => usePuzzle());
    const seq = result.current.eventSeq;

    act(() => result.current.removePiece(SECOND));

    expect(result.current.eventSeq).toBe(seq);
  });

  it('wins only when the picture is complete', () => {
    const { result } = renderHook(() => usePuzzle());
    const ids = Object.keys(TARGETS);

    ids.forEach((id, i) => {
      act(() => {
        result.current.tryPlace(id, TARGETS[id], TARGETS);
      });
      expect(result.current.isWon).toBe(i === ids.length - 1);
    });
  });

  it('a completed picture can be broken and rebuilt', () => {
    const { result } = renderHook(() => usePuzzle());
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
    const { result } = renderHook(() => usePuzzle());
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
    const { result } = renderHook(() => usePuzzle());
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
    const { result } = renderHook(() => usePuzzle());
    const keys = Object.keys(result.current);
    expect(keys).not.toContain('score');
    expect(keys).not.toContain('lives');
    expect(keys).not.toContain('mistakes');
  });
});
