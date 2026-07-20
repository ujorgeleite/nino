// app/games/index.tsx
// The game picker. Thin route — the screen owns the UI.

import React from 'react';
import GamePickerScreen from '../../components/screens/GamePickerScreen';

export default function GamesRoute() {
  return <GamePickerScreen />;
}
