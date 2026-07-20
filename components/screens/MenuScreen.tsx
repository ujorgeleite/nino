// components/screens/MenuScreen.tsx
// The daytime scene with the one giant Play button — prompts/starting.md §5b.
//
// Exactly ONE primary action for the child (TODDLER_UX.md). The mode toggle and
// the parent gate are deliberately small, at the edges, and grown-up shaped.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import CountryScene from '../scene/CountryScene';
import Mascot from '../mascot/Mascot';
import ModeToggle from '../ui/ModeToggle';
import ParentGate from '../ui/ParentGate';
import PlayButton from '../ui/PlayButton';
import { useMode } from '../../hooks/useMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useMusic } from '../../hooks/useMusic';
import { COUNTRIES } from '../../constants/countries';
import { SPACING } from '../../constants/nino';

type Props = {
  onOpenParentPanel: () => void;
};

export function MenuScreen({ onOpenParentPanel }: Props) {
  const router = useRouter();
  const { mode, setMode } = useMode();
  const feedback = useFeedback();
  useMusic(COUNTRIES[0].code, mode);

  const play = () => {
    feedback('tap');
    router.push('/games');
  };

  return (
    <CountryScene country={COUNTRIES[0]} mode={mode}>
      <View style={styles.root}>
        {/* Top-right: the grown-up door. Never reachable by a tap. */}
        <View style={styles.topRight}>
          <ParentGate onUnlock={onOpenParentPanel} />
        </View>

        <View style={styles.center}>
          <PlayButton onPress={play} />
        </View>

        <View style={styles.bottom}>
          <Mascot pose="full" size={130} bob expression={mode === 'back' ? 'sleepy' : 'happy'} />
          <ModeToggle mode={mode} onChange={setMode} />
        </View>
      </View>
    </CountryScene>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: SPACING.s5 },
  topRight: { position: 'absolute', top: SPACING.s5, right: SPACING.s5, zIndex: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
});

export default MenuScreen;
