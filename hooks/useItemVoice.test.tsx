// hooks/useItemVoice.test.tsx
// The timing contract: the voice lands AFTER the reward cue, only one is ever
// pending, and none fires after the screen is gone.

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { SoundProvider } from './useSound';
import { ITEM_VOICE_DELAY_MS, useItemVoice } from './useItemVoice';
import { getAudioPlayerFor } from '../jest.setup';
import { ITEM_SOUNDS } from '../constants/itemSounds';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SoundProvider>{children}</SoundProvider>
);

/** The single shared item-voice player (created with `moo` as its seed). */
const voicePlayer = () => getAudioPlayerFor(ITEM_SOUNDS.moo)!;

describe('useItemVoice', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not speak immediately — the reward cue goes first', () => {
    const { result } = renderHook(() => useItemVoice(), { wrapper });

    act(() => result.current('cow'));

    // Rule 4 belongs to the match cue; this must not compete with it.
    expect(voicePlayer().play).not.toHaveBeenCalled();
  });

  it('speaks after the delay', () => {
    const { result } = renderHook(() => useItemVoice(), { wrapper });

    act(() => result.current('cow'));
    act(() => jest.advanceTimersByTime(ITEM_VOICE_DELAY_MS));

    expect(voicePlayer().play).toHaveBeenCalled();
  });

  it('says nothing for an item with no voice', () => {
    const { result } = renderHook(() => useItemVoice(), { wrapper });

    act(() => result.current('waffle'));
    act(() => jest.advanceTimersByTime(ITEM_VOICE_DELAY_MS * 2));

    expect(voicePlayer().play).not.toHaveBeenCalled();
  });

  it('ignores a null item', () => {
    const { result } = renderHook(() => useItemVoice(), { wrapper });
    act(() => result.current(null));
    act(() => jest.advanceTimersByTime(ITEM_VOICE_DELAY_MS * 2));
    expect(voicePlayer().play).not.toHaveBeenCalled();
  });

  it('never stacks voices when matches come quickly', () => {
    // Two fast matches must not produce a chorus of animals.
    const { result } = renderHook(() => useItemVoice(), { wrapper });

    act(() => result.current('cow'));
    act(() => jest.advanceTimersByTime(60));
    act(() => result.current('duck'));
    act(() => jest.advanceTimersByTime(ITEM_VOICE_DELAY_MS * 2));

    expect(voicePlayer().play).toHaveBeenCalledTimes(1);
  });

  it('does not fire after the screen is gone', () => {
    const { result, unmount } = renderHook(() => useItemVoice(), { wrapper });

    act(() => result.current('horse'));
    unmount();
    act(() => jest.advanceTimersByTime(ITEM_VOICE_DELAY_MS * 2));

    expect(voicePlayer().play).not.toHaveBeenCalled();
  });
});
