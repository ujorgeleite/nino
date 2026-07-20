// hooks/useFeedback.ts
// The single entry point for "something happened" feedback.
//
// CLAUDE.md rule 4: every tap gets haptic + sound within 100ms. Pairing them
// here means no call site can accidentally ship one without the other.
// Haptic fires first; sound follows immediately (HAPTICS_DELAY_MS is the
// budget, not a delay we add).

import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useSound } from './useSound';
import type { SoundKey } from '../constants/sounds';

export type FeedbackEvent =
  | 'tap' //      any generic press
  | 'lift' //     card flip / piece pickup
  | 'match' //    correct pair
  | 'noMatch' //  wrong pair — gentle, never punishing (rule 2)
  | 'seat' //     shape-fit piece dropped into place
  | 'win'; //     game complete

const SOUND_FOR: Record<FeedbackEvent, SoundKey> = {
  tap: 'click',
  lift: 'flip',
  match: 'match',
  noMatch: 'noMatch',
  seat: 'ihuu',
  win: 'win',
};

function fireHaptic(event: FeedbackEvent) {
  switch (event) {
    case 'match':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case 'noMatch':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    case 'seat':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'win':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    default:
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function useFeedback() {
  const { play } = useSound();

  return useCallback(
    (event: FeedbackEvent) => {
      // Fire-and-forget: a device with no taptic engine must never crash.
      fireHaptic(event).catch(() => {});
      play(SOUND_FOR[event]);
    },
    [play],
  );
}

/** The win celebration's triple heavy pulse (rule 10). Returns a cancel fn. */
export function fireWinHaptics(): () => void {
  let cancelled = false;
  (async () => {
    for (let i = 0; i < 3; i++) {
      if (cancelled) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      await new Promise((r) => setTimeout(r, 150));
    }
  })();
  return () => {
    cancelled = true;
  };
}
