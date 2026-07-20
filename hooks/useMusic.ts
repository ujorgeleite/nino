// hooks/useMusic.ts
// Ambient background music for a country screen.
//
// PERFORMANCE — this is why it is one hook and not eleven players:
//
//   ONE player exists for the whole app, and its source is REPLACED when the
//   country changes. Creating eleven players (one per country) would keep
//   eleven decoders and eleven buffers alive on a device that has to stay
//   responsive during a drag gesture.
//
//   The player is stopped and released when the screen unmounts, so leaving a
//   game frees the audio immediately rather than at some later GC.
//
// Respects the global mute (hooks/useSound.tsx) and the There/Back mode:
// Back plays quieter, because it is the wind-down.

/* eslint-disable react-hooks/immutability --
 * expo-audio's player is an IMPERATIVE HANDLE, not a value: `replace()`,
 * `loop` and `volume` are how the library is driven, and there is no
 * functional alternative. react-hooks/immutability models hook return values
 * as immutable data, which is right almost everywhere and wrong here.
 *
 * The rule stays ON everywhere else — this is the only file that wraps an
 * imperative native handle.
 */

import { useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { MUSIC, MUSIC_VOLUME, musicFor, type MusicGame } from '../constants/music';
import { useSound } from './useSound';
import type { NinoMode } from '../constants/nino';

/**
 * Plays a country's loop for as long as the calling screen is mounted.
 *
 * @param countryCode ISO code, or undefined to play nothing.
 * @param game        which arrangement — Memory is sparse, Shape Fit pulsed.
 * @param mode        There plays at full ambient level, Back quieter.
 */
export function useMusic(
  countryCode: string | undefined,
  game: MusicGame,
  mode: NinoMode = 'there',
) {
  const { muted } = useSound();

  // Created once with a placeholder source; every track swaps into it.
  const player = useAudioPlayer(MUSIC['nl-memory']);
  const currentSource = useRef<number | null>(null);

  // --- Source: only touched when the country actually changes --------------
  useEffect(() => {
    const source = musicFor(countryCode, game);
    if (!source || source === currentSource.current) return;

    try {
      player.replace(source);
      player.loop = true;
      currentSource.current = source;
    } catch {
      // A missing track must never break the game screen.
    }
  }, [countryCode, game, player]);

  // --- Play / pause --------------------------------------------------------
  useEffect(() => {
    try {
      if (muted || !countryCode) {
        player.pause();
      } else {
        player.volume = MUSIC_VOLUME[mode];
        player.play();
      }
    } catch {
      // Ignore — silence is an acceptable degradation, a crash is not.
    }
  }, [muted, countryCode, game, mode, player]);

  // --- Release on unmount --------------------------------------------------
  useEffect(
    () => () => {
      try {
        player.pause();
      } catch {
        // Nothing to do; the player is going away regardless.
      }
    },
    [player],
  );
}
