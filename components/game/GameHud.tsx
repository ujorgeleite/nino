// components/game/GameHud.tsx
// The in-game top bar: home / restart / mute on the left, an optional slot in
// the centre, Nino bobbing on the right.
//
// Shared by both games, which is why it no longer lives under components/memory
// — that directory is gone along with the game it was named for.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import HudButton from '../ui/HudButton';
import Mascot from '../mascot/Mascot';
import { useSound } from '../../hooks/useSound';
import { useFeedback } from '../../hooks/useFeedback';
import { useMode } from '../../hooks/useMode';
import { SPACING } from '../../constants/nino';

type Props = {
  onRestart: () => void;
  /** Centre slot — the progress rail in Memory, empty in Shape Fit. */
  center?: React.ReactNode;
  mascotReaction?: 'celebrate' | 'oops' | null;
  /** Bump to replay the same reaction — see Mascot. */
  reactionSeq?: number;
};

export function GameHud({ onRestart, center, mascotReaction = null, reactionSeq = 0 }: Props) {
  const router = useRouter();
  const { muted, toggleMute } = useSound();
  const { mode } = useMode();
  const feedback = useFeedback();

  return (
    <View style={styles.hud}>
      <View style={styles.buttons}>
        <HudButton
          icon="home"
          accessibilityLabel="Home"
          onPress={() => {
            feedback('tap');
            router.back();
          }}
        />
        <HudButton
          icon="restart"
          accessibilityLabel="Start again"
          onPress={() => {
            feedback('tap');
            onRestart();
          }}
        />
        <HudButton
          icon={muted ? 'muted' : 'sound'}
          accessibilityLabel={muted ? 'Turn sound on' : 'Turn sound off'}
          onPress={() => {
            // Muting removes the sound channel, so without this the child taps
            // and gets NOTHING back — the one button in the HUD that has to
            // lean on haptics to answer at all (rule 4).
            feedback('tap');
            toggleMute();
          }}
        />
      </View>

      <View style={styles.center}>{center}</View>

      {/* Back mode slows Nino's bob too — the calm applies everywhere, not
          just to layout (docs/DESIGN_SYSTEM.md, behaviour contract). */}
      <Mascot
        pose="head"
        size={72}
        bob
        expression={mode === 'back' ? 'sleepy' : 'happy'}
        reaction={mascotReaction}
        reactionSeq={reactionSeq}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.s4,
  },
  buttons: { flexDirection: 'row', gap: SPACING.s3 },
  center: { flex: 1, alignItems: 'center' },
});

export default GameHud;
