// hooks/useRecentGames.ts
// Remembers which games were played, so the picker can offer something else.
//
// Persisted, because the point is variety BETWEEN sessions: a child who played
// the French memory game yesterday should not be handed it first today.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordPlay } from '../utils/arrangeGames';

const RECENT_KEY = '@nino/recentGames';

export function useRecentGames() {
  const [recent, setRecent] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        // Trust nothing from storage: a corrupt value must not break the picker.
        if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
          setRecent(parsed);
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

  const remember = useCallback((gameId: string) => {
    setRecent((prev) => {
      const next = recordPlay(prev, gameId);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { recent, remember, ready };
}
