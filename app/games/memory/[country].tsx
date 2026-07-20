// app/games/memory/[country].tsx — Memory, any country.
// One route replaces what would have been eleven files.

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import CountryScene from '../../../components/scene/CountryScene';
import GameHud from '../../../components/memory/GameHud';
import MemoryBoard from '../../../components/memory/MemoryBoard';
import ProgressRail from '../../../components/memory/ProgressRail';
import WinOverlay from '../../../components/ui/WinOverlay';
import { useMemoryNL } from '../../../hooks/useMemoryNL';
import { useMode } from '../../../hooks/useMode';
import { useMusic } from '../../../hooks/useMusic';
import { useFeedback } from '../../../hooks/useFeedback';
import { useItemVoice } from '../../../hooks/useItemVoice';
import { getCountry, DEFAULT_COUNTRY } from '../../../constants/countries';
import { SPACING } from '../../../constants/nino';

export default function MemoryCountryRoute() {
  const { country: code } = useLocalSearchParams<{ country: string }>();
  // A bad or missing code must never blank the screen for a child.
  const country = getCountry(code) ?? DEFAULT_COUNTRY;

  const { mode } = useMode();
  const feedback = useFeedback();
  useMusic(country.code, mode);

  const { cards, foundItemIds, isWon, tries, flipCard, reset, lastEvent, lastItemId, eventSeq } =
    useMemoryNL(country.items);
  const sayItem = useItemVoice();

  const reaction =
    lastEvent === 'match' ? 'celebrate' : lastEvent === 'mismatch' ? 'oops' : null;

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent === 'flip') feedback('lift');
    else if (lastEvent === 'match') {
      feedback('match');
      // The pair is confirmed first (rule 4: feedback inside 100ms), then the
      // thing says what it is — the reward on top of the confirmation.
      sayItem(lastItemId);
    } else if (lastEvent === 'mismatch') feedback('noMatch');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSeq]);

  return (
    <CountryScene country={country} mode={mode}>
      <View style={styles.root}>
        <GameHud
          onRestart={reset}
          mascotReaction={reaction}
          reactionSeq={eventSeq}
          center={<ProgressRail items={country.items} foundItemIds={foundItemIds} />}
        />
        <View style={styles.board}>
          <MemoryBoard cards={cards} mode={mode} onFlip={flipCard} />
        </View>
      </View>

      {isWon ? (
        <WinOverlay
          title="You found them all!"
          detail={`in ${tries} ${tries === 1 ? 'try' : 'tries'}`}
          onPlayAgain={reset}
        />
      ) : null}
    </CountryScene>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: SPACING.s5, gap: SPACING.s4 },
  board: { flex: 1, justifyContent: 'center' },
});
