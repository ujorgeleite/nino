// components/screens/GamePickerScreen.tsx
// "Pick a game!" — every game in one flat grid.
//
// One level of choice, not two: a child taps the game they want directly,
// never a country first. Each tile has to answer two questions at a glance,
// without a word of text (CLAUDE.md rule 1):
//
//   WHICH PLACE — the flag, the tile's own country colours, and the country's
//                 signature item drawn inside the emblem.
//   WHICH GAME  — the emblem's shape. Two matching cards means "find the
//                 pair"; a board with a piece above it means "fit it in".
//
// The grid scrolls, so the count of games can grow without redesigning this.

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import CountryScene from '../scene/CountryScene';
import GameCard from '../ui/GameCard';
import HudButton from '../ui/HudButton';
import MemoryEmblem from '../ui/MemoryEmblem';
import ShapeFitEmblem from '../ui/ShapeFitEmblem';
import { COUNTRIES, type CountryData, type CountryItem } from '../../constants/countries';
import { useMode } from '../../hooks/useMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useRecentGames } from '../../hooks/useRecentGames';
import { arrangeGames } from '../../utils/arrangeGames';
import { COLORS, LAYOUT, SPACING, TYPE } from '../../constants/nino';

type GameKind = 'memory' | 'shapefit';

type Entry = {
  id: string;
  kind: GameKind;
  country: CountryData;
  /** Needed by arrangeGames to keep same-country tiles apart. */
  countryCode: string;
  /** The item that stands for this country inside the emblem. */
  signature: CountryItem;
};

/**
 * Every playable game: two per country, flattened.
 *
 * Memory uses the country's monument as its signature so the pair reads as
 * "this place"; Shape Fit uses the animal, so the two tiles for one country
 * are never identical at a glance.
 */
function buildEntries(): Entry[] {
  const pick = (c: CountryData, role: CountryItem['role']) =>
    c.items.find((i) => i.role === role) ?? c.items[0];

  return COUNTRIES.flatMap((country) => [
    {
      id: `memory-${country.code}`,
      kind: 'memory' as const,
      country,
      countryCode: country.code,
      signature: pick(country, 'monument'),
    },
    {
      id: `shapefit-${country.code}`,
      kind: 'shapefit' as const,
      country,
      countryCode: country.code,
      signature: pick(country, 'animal'),
    },
  ]);
}

export function GamePickerScreen() {
  const router = useRouter();
  const { mode } = useMode();
  const feedback = useFeedback();
  const { width } = useWindowDimensions();
  const { recent, remember, ready } = useRecentGames();

  // One seed per visit to this screen. A lazy useState initializer, not a ref
  // read during render: Math.random() is impure and must not run in the render
  // body, where React may call it more than once per commit.
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  // THE ORDER IS FROZEN once, and never recomputed while the screen is open.
  //
  // Both inputs change under us otherwise: `recent` arrives asynchronously
  // from storage, and `remember` updates it on every tap. Either would
  // re-arrange the grid — tiles sliding out from under a toddler's finger
  // mid-reach, which is worse than any ordering benefit.
  //
  // Keyed on `ready`, NOT on `recent`: it computes once when the history
  // arrives, and later taps that update `recent` cannot re-order the grid.
  // `recent` is deliberately absent from the dependency list for that reason.
  const entries = useMemo(
    () => (ready ? arrangeGames(buildEntries(), recent, seed) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, seed],
  );

  // Fit a comfortable grid in landscape without dropping below the tap floor.
  // Wider screens get more columns rather than bigger tiles — a giant tile is
  // no easier to hit than a large one, and more of them fit the eye at once.
  const columns = width >= 1100 ? 5 : width >= 820 ? 4 : 3;
  const gutter = SPACING.s4;
  const tile = Math.max(
    LAYOUT.touchMin,
    Math.min(180, (width - SPACING.s5 * 2 - gutter * (columns - 1)) / columns),
  );

  return (
    <CountryScene country={COUNTRIES[0]} mode={mode}>
      <View style={styles.root}>
        <View style={styles.header}>
          <HudButton
            icon="home"
            accessibilityLabel="Home"
            onPress={() => {
              feedback('tap');
              router.back();
            }}
          />
          <Text style={styles.title} allowFontScaling={false}>
            Pick a game!
          </Text>
          <View style={{ width: LAYOUT.touchMin }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.grid, { gap: gutter }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Empty only for the moment it takes to read the play history. */}
          {(entries ?? []).map((entry) => (
            <GameCard
              key={entry.id}
              country={entry.country}
              mode={mode}
              locked={entry.country.locked}
              size={tile}
              testID={`game-${entry.id}`}
              // Parent-facing only; the child navigates by scene and emblem.
              accessibilityLabel={`${
                entry.kind === 'memory' ? 'Memory' : 'Shape Fit'
              }, ${entry.country.name}`}
              emblem={
                entry.kind === 'memory' ? (
                  <MemoryEmblem size={tile * 0.52} emoji={entry.signature.emoji} />
                ) : (
                  <ShapeFitEmblem
                    size={tile * 0.6}
                    emoji={entry.signature.emoji}
                    tint={entry.signature.tint}
                  />
                )
              }
              onPress={() => {
                feedback('tap');
                remember(entry.id);
                // Object form for a dynamic route: unambiguous on every
                // platform, and type-checked instead of cast past.
                router.push(
                  entry.kind === 'memory'
                    ? {
                        pathname: '/games/memory/[country]',
                        params: { country: entry.country.code },
                      }
                    : {
                        pathname: '/games/shapefit/[country]',
                        params: { country: entry.country.code },
                      },
                );
              }}
            />
          ))}
        </ScrollView>
      </View>
    </CountryScene>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: SPACING.s5, gap: SPACING.s3 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: TYPE.fontDisplay,
    fontSize: TYPE.sizes.title,
    color: COLORS.ninoInk,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingBottom: SPACING.s5,
  },
});

export default GamePickerScreen;
