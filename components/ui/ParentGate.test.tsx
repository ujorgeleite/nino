// components/ui/ParentGate.test.tsx
// The gate is a child-safety boundary, so its failure modes matter more than
// its happy path. A tap must never open it; a released hold must never open it.

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ParentGate, { GATE_HOLD_MS } from './ParentGate';

describe('ParentGate', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does NOT open on a plain tap', () => {
    const onUnlock = jest.fn();
    render(<ParentGate onUnlock={onUnlock} />);

    fireEvent(screen.getByTestId('parent-gate'), 'press');

    act(() => jest.advanceTimersByTime(5000));
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('does NOT open on a press-in released early', () => {
    const onUnlock = jest.fn();
    render(<ParentGate onUnlock={onUnlock} />);
    const gate = screen.getByTestId('parent-gate');

    fireEvent(gate, 'pressIn');
    act(() => jest.advanceTimersByTime(GATE_HOLD_MS - 200));
    fireEvent(gate, 'pressOut');

    act(() => jest.advanceTimersByTime(5000));
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('opens after a full hold', () => {
    const onUnlock = jest.fn();
    render(<ParentGate onUnlock={onUnlock} />);

    fireEvent(screen.getByTestId('parent-gate'), 'pressIn');
    act(() => jest.advanceTimersByTime(GATE_HOLD_MS));

    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('opens only once per hold', () => {
    const onUnlock = jest.fn();
    render(<ParentGate onUnlock={onUnlock} />);

    fireEvent(screen.getByTestId('parent-gate'), 'pressIn');
    act(() => jest.advanceTimersByTime(GATE_HOLD_MS * 3));

    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('a repeated tap-tap-tap never accumulates into an unlock', () => {
    // The realistic toddler input pattern.
    const onUnlock = jest.fn();
    render(<ParentGate onUnlock={onUnlock} />);
    const gate = screen.getByTestId('parent-gate');

    for (let i = 0; i < 12; i++) {
      fireEvent(gate, 'pressIn');
      act(() => jest.advanceTimersByTime(200));
      fireEvent(gate, 'pressOut');
      act(() => jest.advanceTimersByTime(50));
    }

    act(() => jest.advanceTimersByTime(5000));
    expect(onUnlock).not.toHaveBeenCalled();
  });
});
