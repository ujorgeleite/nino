// app/games/puzzle/[country].tsx — Block Puzzle, any country.
//
// The child drags three or four soft wooden blocks onto a board and builds a
// landmark. It is the CALM game: dusk outside, a tidy tray, slow wiggles, no
// timer and nothing to lose.
//
// The instruction is the board itself. Each hole is drawn as a dashed ghost of
// the block that fills it, so a child sees a triangle-shaped gap and has a
// triangle in their hands. Nothing here depends on reading (rule 1), and
// nothing depends on telling two colours apart either — which is what the
// previous design rested on, and what made it unplayable for a colour-blind
// child until the palette was measured.
//
// The route owns geometry: it measures every hole and every tray slot in
// window coordinates, the same space the pan gesture reports.

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import DuskScene from '../../../components/puzzle/DuskScene';
import GameHud from '../../../components/game/GameHud';
import BlockPuzzleBoard from '../../../components/puzzle/BlockPuzzleBoard';
import BlockPiece, { type DropResult } from '../../../components/puzzle/BlockPiece';
import WinOverlay from '../../../components/ui/WinOverlay';
import { usePuzzle, type Point } from '../../../hooks/usePuzzle';
import { figureFor, kindOf } from '../../../components/puzzle/PuzzleFigure';
import { landmarkFor } from '../../../constants/landmarks';
import { useMode } from '../../../hooks/useMode';
import { useMusic } from '../../../hooks/useMusic';
import { useFeedback } from '../../../hooks/useFeedback';
import { useSound } from '../../../hooks/useSound';
import { useProgress } from '../../../hooks/useProgress';
import { nextChallenge } from '../../../utils/nextChallenge';
import { COUNTRIES, getCountry, DEFAULT_COUNTRY } from '../../../constants/countries';
import { LAYOUT, SPACING, TYPE } from '../../../constants/nino';

/** Room for the small "pieces" label above the tray. */
const TRAY_LABEL_HEIGHT = 24;

export default function PuzzleCountryRoute() {
  const { country: code } = useLocalSearchParams<{ country: string }>();
  const country = getCountry(code) ?? DEFAULT_COUNTRY;
  const router = useRouter();

  const { mode } = useMode();
  const feedback = useFeedback();
  const { play } = useSound();
  const { width, height } = useWindowDimensions();
  const { isComplete, markComplete } = useProgress();
  useMusic(country.code, 'puzzle', mode);

  // What this country builds. Memoized on the country: a fresh array identity
  // every render defeats every callback below it.
  const landmark = useMemo(() => {
    const piece = figureFor(country);
    if (!piece) return null;
    return landmarkFor(country.code, kindOf(piece), piece.variant);
  }, [country]);

  const blocks = useMemo(() => landmark?.blocks ?? [], [landmark]);

  const {
    trayOrder,
    placed,
    isWon,
    liftPiece,
    tryPlace,
    reset,
    lastEvent,
    eventSeq,
    round,
  } = usePuzzle(blocks.map((b) => b.id));

  const targets = useRef<Record<string, Point>>({});
  const homes = useRef<Record<string, Point>>({});

  const reaction = lastEvent === 'placed' ? 'celebrate' : null;

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent === 'lift') feedback('grab');
    else if (lastEvent === 'placed') {
      // TWO SOUNDS, in this order: the woody thunk of the block landing, then
      // the little cheer on top of it. The thunk alone says "that fitted"; the
      // cheer says "and that was good". Rule 10 — the reward is always the
      // loudest thing on the screen.
      feedback('seat');
      const cheer = setTimeout(() => play('ihuu'), 140);
      return () => clearTimeout(cheer);
    } else if (lastEvent === 'rejected') feedback('softDrop');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSeq]);

  useEffect(() => {
    if (isWon) markComplete(`puzzle-${country.code}`);
  }, [isWon, country.code, markComplete]);

  // The celebration: the finished board drifts up and away, then the overlay.
  const flight = useSharedValue(0);

  useEffect(() => {
    flight.value = isWon
      ? withDelay(260, withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) }))
      : 0;
  }, [isWon, flight]);

  const flightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -flight.value * height * 0.7 },
      { scale: 1 - flight.value * 0.3 },
    ],
    opacity: 1 - flight.value,
  }));

  // LAYOUT: the board takes the height, the tray takes a column beside it.
  //
  // The app is landscape-only (rule 6), so width is the plentiful axis and the
  // tray never has to steal height from the board.
  const verticalChrome = SPACING.s4 * 2 + LAYOUT.touchMin + SPACING.s3;
  const availableHeight = (height - verticalChrome) * 0.99;

  // THE TRAY'S ARITHMETIC HAS TO INCLUDE THE GAPS AND THE LABEL.
  //
  // Sizing each slot as height/rows ignored both, so three slots plus their
  // two gaps came to 662pt in a 650pt column and flex-wrap silently pushed the
  // last block into a second column — half of it off the right of the screen.
  // Wrapping is a fallback, not the layout: the numbers have to fit first.
  const count = Math.max(blocks.length, 1);
  const trayHeight = availableHeight - TRAY_LABEL_HEIGHT;
  const trayRows = Math.max(
    1,
    Math.min(count, Math.floor(trayHeight / (LAYOUT.touchMin + SPACING.s3))),
  );
  const trayCols = Math.ceil(count / trayRows);
  const gaps = SPACING.s3 * (trayRows - 1);
  const trayRow = Math.min(
    Math.max((trayHeight - gaps) / trayRows - 1, LAYOUT.touchMin),
    width * 0.19,
  );
  const trayWidth = trayRow * trayCols + SPACING.s3 * (trayCols - 1);

  // The frame and its title sit outside the panel, so the panel gets what is
  // left once they have had their share.
  const boardSize = Math.min(availableHeight * 0.78, width - trayWidth - SPACING.s4 * 4);

  // Blocks wait smaller than their holes and grow to true size as they are
  // carried, so a tidy tray costs the board almost nothing. Never magnified
  // past true size: a block bigger than its hole would be a lie.
  const restScaleFor = useCallback(
    (block: (typeof blocks)[number]) => {
      const largest = (Math.max(block.box[2], block.box[3]) / 100) * boardSize;
      return Math.min(1, trayRow / Math.max(largest, 1));
    },
    [boardSize, trayRow],
  );

  const onHoleMeasured = useCallback((id: string, centre: Point) => {
    targets.current[id] = centre;
  }, []);

  const onHomeMeasured = useCallback((id: string, centre: Point) => {
    homes.current[id] = centre;
  }, []);

  const handleDrop = useCallback(
    (id: string, point: Point): DropResult => {
      const didPlace = tryPlace(id, point, targets.current);
      if (!didPlace) return { placed: false, offset: null };

      const target = targets.current[id];
      const home = homes.current[id];
      if (!target || !home) return { placed: true, offset: null };
      return { placed: true, offset: { x: target.x - home.x, y: target.y - home.y } };
    },
    [tryPlace],
  );

  const placedOffset = useCallback((id: string): Point | null => {
    const target = targets.current[id];
    const home = homes.current[id];
    if (!target || !home) return null;
    return { x: target.x - home.x, y: target.y - home.y };
  }, []);

  /** Finishing opens a door: the same game, somewhere not yet built. */
  const goNext = useCallback(() => {
    const next = nextChallenge(
      COUNTRIES.map((c) => ({ code: c.code, completed: isComplete(`puzzle-${c.code}`) })),
      country.code,
    );
    router.replace({ pathname: '/games/puzzle/[country]', params: { country: next } });
  }, [country.code, isComplete, router]);

  if (!landmark) {
    // Nothing to build. Never a blank screen: the child still gets the evening
    // and a way out, rather than a dead end.
    return (
      <DuskScene>
        <View style={styles.play}>
          <GameHud onRestart={reset} />
        </View>
      </DuskScene>
    );
  }

  return (
    <DuskScene>
      <View style={styles.play}>
        <GameHud onRestart={reset} mascotReaction={reaction} reactionSeq={eventSeq} />

        <View style={styles.layer}>
          <View style={styles.boardCentre}>
            <Animated.View style={flightStyle} testID="puzzle-board">
              <BlockPuzzleBoard
                landmark={landmark}
                placed={placed}
                size={boardSize}
                onHoleMeasured={onHoleMeasured}
              />
            </Animated.View>
          </View>

          {/* The label sits OUTSIDE the wrapping grid. Inside it, flex-wrap
              treated it as another item and pushed it into a column of its
              own, which put the word halfway across the screen. */}
          <View style={{ width: trayWidth }}>
            <Text style={styles.trayLabel} allowFontScaling={false}>
              pieces
            </Text>
            <View style={[styles.tray, { height: trayHeight }]}>
                {trayOrder.map((id) => {
                const block = blocks.find((b) => b.id === id);
                if (!block) return null;
                return (
                  <TraySlot
                    key={block.id}
                    size={trayRow}
                    onMeasured={(centre) => onHomeMeasured(block.id, centre)}
                  >
                    <BlockPiece
                      block={block}
                      boardSize={boardSize}
                      restScale={restScaleFor(block)}
                    placed={placed.has(block.id)}
                    resolvePlacedOffset={() => placedOffset(block.id)}
                    round={round}
                    onGrab={() => liftPiece(block.id)}
                    onDrop={(point) => handleDrop(block.id, point)}
                    // Parent-facing. The child navigates by shape.
                      accessibilityLabel={block.label}
                      testID={`piece-${block.id}`}
                    />
                  </TraySlot>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {isWon ? (
        <WinOverlay
          title="You built it!"
          detail={country.name}
          actionLabel="Next place"
          onPlayAgain={goNext}
          onAgain={reset}
        />
      ) : null}
    </DuskScene>
  );
}

/** Holds a block's home position and reports it in window space. */
function TraySlot({
  size,
  onMeasured,
  children,
}: {
  size: number;
  onMeasured: (centre: Point) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<View | null>(null);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, w, h) => {
      onMeasured({ x: x + w / 2, y: y + h / 2 });
    });
  }, [onMeasured]);

  return (
    // CENTRED, and the game is wrong without it.
    //
    // The slot reports its own centre as the block's home, and the placed
    // offset is measured from there. A narrow block — the door — left-aligned
    // in a wide slot sat 57pt from that centre, so it landed 57pt from its
    // hole: visibly beside the doorway rather than in it. It only showed when
    // the shuffle happened to deal that block first, which made it look like
    // flakiness rather than a bug.
    <View
      ref={ref}
      onLayout={measure}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  play: { flex: 1, padding: SPACING.s4, gap: SPACING.s3 },
  layer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  boardCentre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tray: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s3,
  },
  trayLabel: {
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: TYPE.fontBody,
    fontSize: TYPE.sizes.caption,
    color: 'rgba(255, 244, 228, 0.62)',
  },
});
