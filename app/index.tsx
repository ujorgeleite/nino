// app/index.tsx
// Entry route: the brand splash, which hands off to the Menu.

import React, { useCallback, useState } from 'react';
import MenuScreen from '../components/screens/MenuScreen';
import ParentPanel from '../components/screens/ParentPanel';
import SplashScreen from '../components/screens/SplashScreen';

export default function Index() {
  const [showSplash, setShowSplash] = useState(true);
  const [parentOpen, setParentOpen] = useState(false);

  const done = useCallback(() => setShowSplash(false), []);

  if (showSplash) return <SplashScreen onDone={done} />;

  return (
    <>
      <MenuScreen onOpenParentPanel={() => setParentOpen(true)} />
      {parentOpen ? <ParentPanel onClose={() => setParentOpen(false)} /> : null}
    </>
  );
}
