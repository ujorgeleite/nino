// hooks/useProgress.ts
// Which challenges have been finished.
//
// Two jobs:
//   - the picker marks completed tiles, so a child (and a parent) can see
//     what is left rather than re-picking the same one forever
//   - finishing a challenge offers the NEXT one in the same category, which
//     turns eleven separate games into a journey
//
// Persisted, because progress that vanishes when the app closes is not
// progress. Nothing here is ever a fail state: completion only adds.
//
// ONE STORE, NOT ONE COPY PER SCREEN.
//
// This used to be plain `useState` inside the hook, which meant every caller
// got its own private set. The picker stays mounted while a game is pushed on
// top of it, so the game's copy recorded the win and the picker's copy never
// heard about it: finishing a game and tapping Home showed the tile still
// unfinished, and it only appeared after restarting the app. The state is
// shared by definition — it is what the child has done — so it lives in one
// place and every screen subscribes.

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nino/completed';

/** A challenge id: `${game}-${countryCode}`, matching the picker's tile ids. */
export type ChallengeId = string;

let completed: ReadonlySet<ChallengeId> = new Set();
let ready = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Read once per app run, and shared by everyone after that. */
function load(): Promise<void> {
  if (loading) return loading;
  loading = AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      // Trust nothing from storage — a corrupt value must not break the app.
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
        completed = new Set(parsed);
      }
    })
    .catch(() => {})
    .finally(() => {
      ready = true;
      emit();
    });
  return loading;
}

/** Test seam: forget everything, as though the app had just been installed. */
export function resetProgressForTests() {
  completed = new Set();
  ready = false;
  loading = null;
  emit();
}

export function useProgress() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => completed,
    () => completed,
  );
  const isReady = useSyncExternalStore(
    subscribe,
    () => ready,
    () => ready,
  );

  useEffect(() => {
    void load();
  }, []);

  const markComplete = useCallback((id: ChallengeId) => {
    if (completed.has(id)) return;
    const next = new Set(completed);
    next.add(id);
    completed = next;
    AsyncStorage.setItem(KEY, JSON.stringify([...next])).catch(() => {});
    emit();
  }, []);

  const isComplete = useCallback(
    (id: ChallengeId) => snapshot.has(id),
    [snapshot],
  );

  return { completed: snapshot, isComplete, markComplete, ready: isReady };
}
