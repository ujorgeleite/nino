// hooks/useProgress.test.ts
// Progress is one thing the whole app agrees on.

import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetProgressForTests, useProgress } from './useProgress';

beforeEach(async () => {
  await AsyncStorage.clear();
  resetProgressForTests();
});

describe('useProgress', () => {
  it('starts with nothing finished', async () => {
    const { result } = renderHook(() => useProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.isComplete('puzzle-nl')).toBe(false);
  });

  it('records a finished challenge', async () => {
    const { result } = renderHook(() => useProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.markComplete('puzzle-nl'));

    expect(result.current.isComplete('puzzle-nl')).toBe(true);
  });

  it('SHOWS A WIN TO A SCREEN THAT WAS ALREADY OPEN', async () => {
    // THE BUG THIS PINS DOWN: the hook kept its state per component, so every
    // screen had a private copy. The picker stays mounted while a game is
    // pushed on top of it, so the game recorded the win into its own copy and
    // the picker never heard. Finishing a game and tapping Home showed the
    // tile still unfinished — it appeared only after restarting the app.
    const picker = renderHook(() => useProgress());
    await waitFor(() => expect(picker.result.current.ready).toBe(true));

    const game = renderHook(() => useProgress());
    await waitFor(() => expect(game.result.current.ready).toBe(true));

    act(() => game.result.current.markComplete('puzzle-de'));

    expect(picker.result.current.isComplete('puzzle-de')).toBe(true);
  });

  it('survives the app closing', async () => {
    const first = renderHook(() => useProgress());
    await waitFor(() => expect(first.result.current.ready).toBe(true));
    act(() => first.result.current.markComplete('shapefit-it'));

    // A fresh launch: the store forgets, storage does not.
    resetProgressForTests();
    const second = renderHook(() => useProgress());

    await waitFor(() => expect(second.result.current.isComplete('shapefit-it')).toBe(true));
  });

  it('marking the same challenge twice changes nothing', async () => {
    const { result } = renderHook(() => useProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.markComplete('puzzle-fr'));
    const after = result.current.completed;
    act(() => result.current.markComplete('puzzle-fr'));

    expect(result.current.completed).toBe(after);
  });

  it('ignores a corrupt store rather than breaking the app', async () => {
    await AsyncStorage.setItem('@nino/completed', '{"not":"an array"}');
    resetProgressForTests();

    const { result } = renderHook(() => useProgress());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.completed.size).toBe(0);
  });

  it('never removes progress — completion only adds', async () => {
    const { result } = renderHook(() => useProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.markComplete('puzzle-nl'));
    act(() => result.current.markComplete('puzzle-be'));

    // CLAUDE.md rule 2: nothing in this app takes something away from a child.
    expect(result.current.isComplete('puzzle-nl')).toBe(true);
    expect(result.current.isComplete('puzzle-be')).toBe(true);
    expect(Object.keys(result.current)).not.toContain('clear');
  });
});
