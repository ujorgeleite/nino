// hooks/useSound.test.tsx
// Pins the audio layer's contract: mute silences playback, the preference
// survives a remount, and the hook degrades safely outside a provider.

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SoundProvider, useSound } from './useSound';
import { SOUNDS } from '../constants/sounds';
import { getAudioPlayerFor } from '../jest.setup';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SoundProvider>{children}</SoundProvider>
);

/** The stub player bound to a specific cue, not to call order. */
const matchPlayer = () => getAudioPlayerFor(SOUNDS.match)!;

describe('useSound', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('plays a cue when not muted', async () => {
    const { result } = renderHook(() => useSound(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.play('match'));

    expect(matchPlayer().play).toHaveBeenCalled();
  });

  it('plays nothing while muted', async () => {
    const { result } = renderHook(() => useSound(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.toggleMute());
    expect(result.current.muted).toBe(true);

    act(() => result.current.play('match'));
    expect(matchPlayer().play).not.toHaveBeenCalled();
  });

  it('persists the mute preference', async () => {
    const { result } = renderHook(() => useSound(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.toggleMute());

    await waitFor(async () => {
      expect(await AsyncStorage.getItem('@nino/muted')).toBe('true');
    });
  });

  it('restores a persisted mute preference on mount', async () => {
    await AsyncStorage.setItem('@nino/muted', 'true');

    const { result } = renderHook(() => useSound(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.muted).toBe(true);
  });

  it('defaults to audible when nothing is stored', async () => {
    const { result } = renderHook(() => useSound(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.muted).toBe(false);
  });

  it('is a safe no-op outside a provider', () => {
    const { result } = renderHook(() => useSound());
    expect(result.current.muted).toBe(false);
    expect(() => result.current.play('win')).not.toThrow();
  });
});
