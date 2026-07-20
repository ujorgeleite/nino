// app/games/shapefit/[country].tsx — Shape Fit, any country.

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import CountryScene from '../../../components/scene/CountryScene';
import GameHud from '../../../components/memory/GameHud';
import WoodBoard from '../../../components/shapefit/WoodBoard';
import DraggablePiece from '../../../components/shapefit/DraggablePiece';
import WinOverlay from '../../../components/ui/WinOverlay';
import { useShapeFitNL, type Point } from '../../../hooks/useShapeFitNL';
import { useMode } from '../../../hooks/useMode';
import { useMusic } from '../../../hooks/useMusic';
import { useFeedback } from '../../../hooks/useFeedback';
import { useItemVoice } from '../../../hooks/useItemVoice';
import { getCountry, DEFAULT_COUNTRY } from '../../../constants/countries';
import { LAYOUT, SPACING } from '../../../constants/nino';

export default function ShapeFitCountryRoute() {
  const { country: code } = useLocalSearchParams<{ country: string }>();
  const country = getCountry(code) ?? DEFAULT_COUNTRY;

  const { mode } = useMode();
  const feedback = useFeedback();
  const { width, height } = useWindowDimensions();
  useMusic(country.code, mode);

  const { trayOrder, seated, isWon, tryDrop, liftPiece, reset, lastEvent, lastItemId, eventSeq } =
    useShapeFitNL(country.items);
  const sayItem = useItemVoice();

  const sockets = useRef<Record<string, Point>>({});
  const reaction = lastEvent === 'seated' ? 'celebrate' : null;

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent === 'lift') feedback('tap');
    else if (lastEvent === 'seated') {
      feedback('seat');
      // Seated first, then the piece introduces itself.
      sayItem(lastItemId);
    } else if (lastEvent === 'rejected') feedback('noMatch');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSeq]);

  const shortSide = Math.min(width, height);
  const socketSize = Math.min(110, shortSide * 0.15);
  const pieceSize = Math.max(LAYOUT.touchMin, Math.min(96, shortSide * 0.13));

  const onSocketMeasured = useCallback((itemId: string, centre: Point) => {
    sockets.current[itemId] = centre;
  }, []);

  return (
    <CountryScene country={country} mode={mode}>
      <View style={styles.root}>
        <GameHud onRestart={reset} mascotReaction={reaction} reactionSeq={eventSeq} />

        <View style={styles.layer}>
          <View style={styles.boardWrap}>
            <WoodBoard
              items={country.items}
              seated={seated}
              socketSize={socketSize}
              onSocketMeasured={onSocketMeasured}
            />
          </View>

          <View style={styles.tray}>
            {trayOrder.map((itemId) => {
              const item = country.items.find((i) => i.id === itemId);
              if (!item) return null;
              return (
                <DraggablePiece
                  key={item.id}
                  emoji={item.emoji}
                  tint={item.tint}
                  size={pieceSize}
                  seated={seated.has(item.id)}
                  onLift={() => liftPiece(item.id)}
                  onDrop={(point) => tryDrop(item.id, point, sockets.current)}
                  accessibilityLabel={item.label}
                  testID={`piece-${item.id}`}
                />
              );
            })}
          </View>
        </View>
      </View>

      {isWon ? <WinOverlay title="All in place!" onPlayAgain={reset} /> : null}
    </CountryScene>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: SPACING.s5, gap: SPACING.s4 },
  layer: { flex: 1, justifyContent: 'space-between' },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s4,
    paddingBottom: SPACING.s3,
  },
});
