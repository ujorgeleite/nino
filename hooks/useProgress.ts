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

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nino/completed';

/** A challenge id: `${game}-${countryCode}`, matching the picker's tile ids. */
export type ChallengeId = string;

export function useProgress() {
  const [completed, setCompleted] = useState<Set<ChallengeId>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        // Trust nothing from storage — a corrupt value must not break the app.
        if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
          setCompleted(new Set(parsed));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markComplete = useCallback((id: ChallengeId) => {
    setCompleted((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      AsyncStorage.setItem(KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const isComplete = useCallback(
    (id: ChallengeId) => completed.has(id),
    [completed],
  );

  return { completed, isComplete, markComplete, ready };
}
