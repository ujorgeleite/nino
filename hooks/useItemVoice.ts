// hooks/useItemVoice.ts
// Says an item out loud, just after its reward cue.
//
// TIMING is the whole point of this hook. CLAUDE.md rule 4 requires feedback
// within 100ms of the action, and that job belongs to the match / seat cue.
// The item's voice is the reward ON TOP, so it lands a beat later — otherwise
// the two overlap into mush and neither reads.
//
// The delay is cancelled on unmount, so leaving a screen mid-celebration does
// not fire a duck into an empty room.

import { useCallback, useEffect, useRef } from 'react';
import { useSound } from './useSound';

/** Gap between the reward cue and the item's voice. */
export const ITEM_VOICE_DELAY_MS = 260;

export function useItemVoice() {
  const { playItem } = useSound();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (itemId: string | null) => {
      if (!itemId) return;
      // Only ever one voice pending: rapid matches must not stack into a
      // chorus of animals.
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        playItem(itemId);
      }, ITEM_VOICE_DELAY_MS);
    },
    [playItem],
  );
}
