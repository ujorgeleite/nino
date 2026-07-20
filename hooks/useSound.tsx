// hooks/useSound.tsx
// The app's audio layer. One provider owns every player; components call
// `play('match')` and never touch expo-audio directly.
//
// expo-audio, NOT expo-av — expo-av is deprecated (docs/TECH_STACK.md).
//
// Mute is global and persisted to AsyncStorage, per prompts/starting.md §4.
// Audio is armed on the first tap, mirroring the browser autoplay policy the
// original design worked around.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { SOUNDS, type SoundKey } from '../constants/sounds';
import { ITEM_SOUNDS, soundForItem } from '../constants/itemSounds';

const MUTE_KEY = '@nino/muted';

type SoundApi = {
  play: (key: SoundKey) => void;
  /**
   * Plays an item's own voice — the duck quacks, the horse neighs.
   * A no-op for items that make no sound in the world (a waffle, a castle).
   * Returns true when something was actually played.
   */
  playItem: (itemId: string) => boolean;
  muted: boolean;
  toggleMute: () => void;
  /** False until the persisted mute preference has been read. */
  ready: boolean;
};

const SoundContext = createContext<SoundApi | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const armed = useRef(false);

  // One player per cue, created once. Hook order is fixed because SOUNDS is a
  // static literal — never make these conditional.
  const flip = useAudioPlayer(SOUNDS.flip);
  const match = useAudioPlayer(SOUNDS.match);
  const noMatch = useAudioPlayer(SOUNDS.noMatch);
  const click = useAudioPlayer(SOUNDS.click);
  const ihuu = useAudioPlayer(SOUNDS.ihuu);
  const win = useAudioPlayer(SOUNDS.win);
  const lift = useAudioPlayer(SOUNDS.lift);
  const snapIn = useAudioPlayer(SOUNDS.snapIn);
  const snapOut = useAudioPlayer(SOUNDS.snapOut);
  const softDrop = useAudioPlayer(SOUNDS.softDrop);

  // ONE player for all 21 item voices, with its source swapped on demand.
  // Twenty-one more players would mean twenty-one decoders alive on a device
  // that has to stay responsive mid-drag — the same reasoning as useMusic.
  const itemVoice = useAudioPlayer(ITEM_SOUNDS.moo);
  const itemSource = useRef<number | null>(null);

  const players = useMemo(
    () => ({ flip, match, noMatch, click, ihuu, win, lift, snapIn, snapOut, softDrop }),
    [flip, match, noMatch, click, ihuu, win, lift, snapIn, snapOut, softDrop],
  );

  // Restore the persisted preference. Failure is non-fatal: default to audible.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(MUTE_KEY)
      .then((value) => {
        if (!cancelled && value !== null) setMuted(value === 'true');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Play in silent mode too — an iPad on a plane is often on the physical
  // mute switch, and the whole feedback model depends on sound landing.
  const arm = useCallback(() => {
    if (armed.current) return;
    armed.current = true;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const play = useCallback(
    (key: SoundKey) => {
      if (muted) return;
      arm();
      const player = players[key];
      if (!player) return;
      // Rewind first so rapid repeat taps retrigger instead of being ignored.
      try {
        player.seekTo(0);
        player.play();
      } catch {
        // A missing or busy player must never break gameplay.
      }
    },
    [muted, arm, players],
  );

  const playItem = useCallback(
    (itemId: string): boolean => {
      if (muted) return false;
      const key = soundForItem(itemId);
      // Most items are silent things. That is data, not a failure.
      if (!key) return false;

      const source = ITEM_SOUNDS[key];
      arm();
      try {
        if (source !== itemSource.current) {
          itemVoice.replace(source);
          itemSource.current = source;
        }
        itemVoice.seekTo(0);
        itemVoice.play();
        return true;
      } catch {
        // A voice failing to load must never interrupt the game.
        return false;
      }
    },
    [muted, arm, itemVoice],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      AsyncStorage.setItem(MUTE_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<SoundApi>(
    () => ({ play, playItem, muted, toggleMute, ready }),
    [play, playItem, muted, toggleMute, ready],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

/**
 * Access the audio layer. Safe to call outside a SoundProvider — it degrades
 * to a silent no-op rather than throwing, so a screen rendered in isolation
 * (or in a test) still works.
 */
export function useSound(): SoundApi {
  const ctx = useContext(SoundContext);
  return ctx ?? FALLBACK;
}

const FALLBACK: SoundApi = {
  play: () => {},
  playItem: () => false,
  muted: false,
  toggleMute: () => {},
  ready: true,
};
