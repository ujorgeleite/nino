// app/_layout.tsx
// Root layout: gesture root + keep-awake for the whole app.
// Landscape orientation is enforced via app.json ("orientation": "landscape").

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  useEffect(() => {
    activateKeepAwakeAsync().catch(() => {});
    return () => {
      deactivateKeepAwake().catch(() => {});
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.warmCream }}>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.warmCream },
        }}
      />
    </GestureHandlerRootView>
  );
}
