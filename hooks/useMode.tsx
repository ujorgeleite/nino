// hooks/useMode.tsx
// The There / Back mode — the product's core metaphor (outbound journey vs the
// calm return). Shared across Menu, Picker and both games.
//
// This is app state, NOT the OS colour scheme: app.json pins
// userInterfaceStyle to "light". A parent chooses the mode; the device never
// decides it. Persisted so the return trip survives an app restart.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NinoMode } from '../constants/nino';

const MODE_KEY = '@nino/mode';

type ModeApi = {
  mode: NinoMode;
  setMode: (mode: NinoMode) => void;
  ready: boolean;
};

const ModeContext = createContext<ModeApi | null>(null);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<NinoMode>('there');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(MODE_KEY)
      .then((value) => {
        if (!cancelled && (value === 'there' || value === 'back')) setModeState(value);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<ModeApi>(
    () => ({
      mode,
      ready,
      setMode: (next: NinoMode) => {
        setModeState(next);
        AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
      },
    }),
    [mode, ready],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

/** Falls back to "there" outside a provider, so a screen can render alone. */
export function useMode(): ModeApi {
  return useContext(ModeContext) ?? FALLBACK;
}

const FALLBACK: ModeApi = { mode: 'there', setMode: () => {}, ready: true };
