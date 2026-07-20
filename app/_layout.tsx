// app/_layout.tsx
// Root layout: fonts, providers, gesture root, keep-awake.
// Landscape is enforced via app.json ("orientation": "landscape").
// Design tokens come from constants/nino.ts (see docs/DESIGN_SYSTEM.md).
//
// STARTUP MUST NEVER DEAD-END. Two guards, both learned the hard way:
//
//  1. Font loading is capped by a timeout. An earlier version returned null
//     until `useFonts` settled, with the splash pinned — so a font that never
//     resolved on device meant the app rendered nothing, forever, and looked
//     like it would not open.
//  2. A RootErrorBoundary wraps everything, so a provider that throws shows a
//     message instead of a blank screen. In release there is no red box.

import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import {
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import RootErrorBoundary from '../components/RootErrorBoundary';
import { SoundProvider } from '../hooks/useSound';
import { ModeProvider } from '../hooks/useMode';
import { COLORS } from '../constants/nino';

/**
 * How long to wait for fonts before giving up and rendering in the system
 * face. A child staring at a frozen splash is far worse than slightly wrong
 * typography — and all in-app text is parent-facing anyway (rule 1).
 */
const FONT_TIMEOUT_MS = 3000;

// Hold the splash while fonts load. Failure here is non-fatal.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_800ExtraBold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  // The escape hatch: render regardless once this fires.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    activateKeepAwakeAsync().catch(() => {});
    return () => {
      deactivateKeepAwake().catch(() => {});
    };
  }, []);

  const ready = fontsLoaded || Boolean(fontError) || timedOut;

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Only ever a brief hold — never an indefinite one.
  if (!ready) return null;

  return (
    <RootErrorBoundary>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: COLORS.cream }}
        onLayout={onLayout}
      >
        <StatusBar hidden />
        <SoundProvider>
          <ModeProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.cream },
              }}
            />
          </ModeProvider>
        </SoundProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}
