// app/games/puzzle/[country].tsx — Jigsaw, any country.
//
// Replaces Memory. A 2-year-old preferred dragging to tapping, and this keeps
// that while adding what Shape Fit lacks: the pieces assemble into a PICTURE,
// so progress is visible in the thing itself.
//
// The route owns geometry — it measures every cell and every tray slot in
// window coordinates, the same space the pan gesture reports — and owns the
// drop preview that makes a cell glow as a piece approaches.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CountryScene from '../../../components/scene/CountryScene';
import GameHud from '../../../components/game/GameHud';
import PuzzleBoard from '../../../components/puzzle/PuzzleBoard';
import PuzzlePiece, { type PlaceResult } from '../../../components/puzzle/PuzzlePiece';
import WinOverlay from '../../../components/ui/WinOverlay';
import { usePuzzle, PUZZLE_SNAP_RADIUS, type Point } from '../../../hooks/usePuzzle';
import { partsForCountry } from '../../../components/puzzle/PuzzleFigure';
import { useMode } from '../../../hooks/useMode';
import { useMusic } from '../../../hooks/useMusic';
import { useFeedback } from '../../../hooks/useFeedback';
import { useProgress } from '../../../hooks/useProgress';
import { nextChallenge } from '../../../utils/nextChallenge';
import { COUNTRIES, getCountry, DEFAULT_COUNTRY } from '../../../constants/countries';
import { quietCountry } from '../../../constants/quietCountry';
import { LAYOUT, SPACING } from '../../../constants/nino';

// The cut lives in constants/figureParts.ts: each drawing comes apart along
// its own anatomy — a roof, a turret, a mountain peak. A part's outline
// follows the subject, so it only fits its own place and a child can see that
// from the shape.

export default function PuzzleCountryRoute() {
  const { country: code } = useLocalSearchParams<{ country: string }>();
  const country = getCountry(code) ?? DEFAULT_COUNTRY;
  const router = useRouter();

  const { mode } = useMode();
  const feedback = useFeedback();
  const { width, height } = useWindowDimensions();
  const { isComplete, markComplete } = useProgress();
  useMusic(country.code, 'puzzle', mode);

  // How this country's picture comes apart. Data, from the drawing itself.
  //
  // Memoized on the country: `partsForCountry` returns a fresh array each call,
  // and a new array identity every render defeats every callback below it.
  const parts = useMemo(() => partsForCountry(country), [country]);

  // The landscape AROUND the square, drained of colour.
  //
  // Both were fully coloured and they competed: a Dutch sky behind a Dutch
  // windmill puzzle is the same palette twice, so the square stopped reading
  // as a separate object. The landscape stays — a 2-year-old needs to see
  // where they are — and gives up its colour instead.
  //
  // Memoized: a fresh country identity every render would re-render the whole
  // skyline, which is the one thing CountryScene's memoization prevents.
  const backdrop = useMemo(() => quietCountry(country), [country]);

  const {
    trayOrder,
    placed,
    isWon,
    liftPiece,
    tryPlace,
    removePiece,
    reset,
    lastEvent,
    eventSeq,
    round,
  } = usePuzzle(parts.map((p) => p.id));

  const targets = useRef<Record<string, Point>>({});
  const homes = useRef<Record<string, Point>>({});
  const [preview, setPreview] = useState<string | null>(null);


  const reaction = lastEvent === 'placed' ? 'celebrate' : null;

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent === 'lift') feedback('grab');
    // The click when a piece fits. `seat` is the suction-and-thunk cue.
    else if (lastEvent === 'placed') feedback('seat');
    else if (lastEvent === 'removed') feedback('unseat');
    else if (lastEvent === 'rejected') feedback('softDrop');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSeq]);

  // Record the win once, so the picker can mark it and the next challenge
  // can skip it.
  useEffect(() => {
    if (isWon) markComplete(`puzzle-${country.code}`);
  }, [isWon, country.code, markComplete]);

  // THE CELEBRATION: the square leaves, and the world it was hiding arrives.
  //
  // While playing, the landscape is grey so the puzzle owns every colour on
  // screen. Finishing hands the colour back: the square flies out of frame,
  // the country's real palette fades up underneath it, and the clouds and sun
  // that were always drifting are suddenly worth looking at. Rule 10 — the
  // celebration is the loudest thing in the game.
  const flight = useSharedValue(0);

  useEffect(() => {
    flight.value = isWon
      ? withDelay(220, withTiming(1, { duration: 900, easing: Easing.in(Easing.back(1.6)) }))
      : 0;
  }, [isWon, flight]);

  const flightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: flight.value * width * 0.9 },
      { translateY: -flight.value * height * 0.75 },
      { rotate: `${flight.value * 38}deg` },
      { scale: 1 - flight.value * 0.45 },
    ],
    opacity: 1 - flight.value,
  }));

  // The coloured world is mounted only once it is needed, and the grey one
  // only until then. Two skylines exist during the handover and never
  // otherwise, which keeps the one-static-Svg rule that the frame budget
  // depends on (see CountryScene).
  const sceneryStyle = useAnimatedStyle(() => ({ opacity: 1 - flight.value }));

  // THE PICTURE GETS THE SCREEN.
  //
  // Earlier versions stacked the board over a tray, which cost the picture
  // most of the height and left it a small square in the middle. Since the app
  // is landscape-only (rule 6), the tray can ALWAYS sit beside the board and
  // spend width, which a landscape screen has to spare. The board then takes
  // the full height it can get.
  //
  // Slack matters: an exact fit leaves nothing for rounding, and an earlier
  // attempt landed on precisely the viewport height.
  //
  // The chrome is kept as thin as it honestly can be, because the picture is
  // what the screen is for: the HUD row is exactly one tap target tall and the
  // padding is one step rather than two. The slack that remains covers
  // rounding — an earlier version landed on precisely the viewport height and
  // overflowed.
  const verticalChrome = SPACING.s4 * 2 + LAYOUT.touchMin + SPACING.s3;
  const availableHeight = (height - verticalChrome) * 0.99;

  // THE TRAY IS A GRID, not a column, because a column does not always fit.
  //
  // iPhone landscape is 390 tall; after the HUD that leaves ~234 for play, and
  // four pieces at the 90pt floor need 360. A single column silently pushed
  // the last pieces off the bottom of the screen. So the tray takes as many
  // rows as actually fit and adds columns for the rest — spending width, which
  // a landscape screen has, instead of height, which it does not.
  const trayRows = Math.max(
    1,
    Math.min(parts.length, Math.floor(availableHeight / (LAYOUT.touchMin + SPACING.s3))),
  );
  const trayCols = Math.ceil(parts.length / trayRows);
  const trayRow = Math.min(availableHeight / trayRows - SPACING.s3, width * 0.18);
  const trayWidth = trayRow * trayCols + SPACING.s3 * (trayCols - 1);

  // The board takes the height, and is CENTRED in whatever width is left once
  // the tray has its column — it is the subject of the screen, so it sits in
  // the middle of it rather than pinned against the left edge.
  const boardSize = Math.min(availableHeight, width - trayWidth - SPACING.s4 * 3);

  // WAITING PIECES ARE DRAWN SMALLER THAN THEIR SOCKETS.
  //
  // At full board scale a roof is most of the board wide, and a tray holding
  // four of those would take the width back from the picture. Each piece is
  // instead scaled to fill its own tray row, and grows to its true size while
  // it is carried — so the sizes agree at the only moment that matters, when
  // the piece is over the socket.
  //
  // Scaled per piece rather than by one shared factor: a shared factor sized
  // for the biggest part left the smallest ones as specks.
  const restScaleFor = useCallback(
    (part: (typeof parts)[number]) => {
      const largest = (Math.max(part.box[2], part.box[3]) / 100) * boardSize;
      // Never magnify: a piece bigger than its socket would be a lie.
      return Math.min(1, trayRow / Math.max(largest, 1));
    },
    [boardSize, trayRow],
  );

  const onCellMeasured = useCallback((id: string, centre: Point) => {
    targets.current[id] = centre;
  }, []);

  const onHomeMeasured = useCallback((id: string, centre: Point) => {
    homes.current[id] = centre;
  }, []);

  const onDragMove = useCallback((id: string, point: Point) => {
    const target = targets.current[id];
    if (!target) return;
    const near = Math.hypot(point.x - target.x, point.y - target.y) <= PUZZLE_SNAP_RADIUS;
    setPreview((current) => {
      const next = near ? id : null;
      return current === next ? current : next;
    });
  }, []);

  const handleDrop = useCallback(
    (id: string, point: Point): PlaceResult => {
      setPreview(null);
      const didPlace = tryPlace(id, point, targets.current);

      if (!didPlace) {
        // Moving a placed piece somewhere invalid takes it out of the picture
        // rather than snapping it back — the child moved it on purpose.
        if (placed.has(id)) removePiece(id);
        return { placed: false, offset: null };
      }

      const target = targets.current[id];
      const home = homes.current[id];
      if (!target || !home) return { placed: true, offset: null };
      return { placed: true, offset: { x: target.x - home.x, y: target.y - home.y } };
    },
    [tryPlace, placed, removePiece],
  );

  const placedOffset = useCallback((id: string): Point | null => {
    const target = targets.current[id];
    const home = homes.current[id];
    if (!target || !home) return null;
    return { x: target.x - home.x, y: target.y - home.y };
  }, []);

  /** Finishing opens a door: the same game, in a country not yet done. */
  const goNext = useCallback(() => {
    const next = nextChallenge(
      COUNTRIES.map((c) => ({ code: c.code, completed: isComplete(`puzzle-${c.code}`) })),
      country.code,
    );
    router.replace({ pathname: '/games/puzzle/[country]', params: { country: next } });
  }, [country.code, isComplete, router]);

  return (
    <View style={styles.root}>
      {/* The country in full colour, revealed by the win. */}
      {isWon ? (
        <View style={StyleSheet.absoluteFill}>
          <CountryScene country={country} mode={mode} />
        </View>
      ) : null}

      {/* The grey world play happens in, which fades away on the win. */}
      <Animated.View style={[StyleSheet.absoluteFill, sceneryStyle]}>
        <CountryScene country={backdrop} mode={mode} />
      </Animated.View>

      <View style={styles.root}>
        <GameHud onRestart={reset} mascotReaction={reaction} reactionSeq={eventSeq} />

        <View style={styles.layer}>
          {/* Explicit sizes, not flex: letting the wrapper expand made it
              overlap the tray, which the geometry test caught. */}
          <View style={styles.boardCentre}>
            <Animated.View
              style={[
                styles.boardWrap,
                { height: boardSize, width: boardSize },
                flightStyle,
              ]}
              testID="puzzle-board"
            >
              <PuzzleBoard
                country={country}
                parts={parts}
                placed={placed}
                highlighted={preview}
                size={boardSize}
                onCellMeasured={onCellMeasured}
              />
            </Animated.View>
          </View>

          <View style={[styles.tray, { width: trayWidth, height: availableHeight }]}>
            {trayOrder.map((id) => {
              const part = parts.find((p) => p.id === id);
              if (!part) return null;
              return (
                <TraySlot
                  key={part.id}
                  size={trayRow}
                  onMeasured={(centre) => onHomeMeasured(part.id, centre)}
                >
                  <PuzzlePiece
                    country={country}
                    part={part}
                    boardSize={boardSize}
                    restScale={restScaleFor(part)}
                    placed={placed.has(part.id)}
                    resolvePlacedOffset={() => placedOffset(part.id)}
                    round={round}
                    onGrab={() => liftPiece(part.id)}
                    onDragMove={(point) => onDragMove(part.id, point)}
                    onDrop={(point) => handleDrop(part.id, point)}
                    // Parent-facing. The child navigates by shape.
                    accessibilityLabel={part.label}
                    testID={`piece-${part.id}`}
                  />
                </TraySlot>
              );
            })}
          </View>
        </View>
      </View>

      {isWon ? (
        <WinOverlay
          title="You made the picture!"
          detail={country.name}
          actionLabel="Next place"
          onPlayAgain={goNext}
        />
      ) : null}
    </View>
  );
}

/** Holds a piece's home position and reports it in window space. */
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
    <View ref={ref} onLayout={measure} style={{ width: size, height: size }}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: SPACING.s4, gap: SPACING.s3 },
  layer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  boardCentre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  boardWrap: { alignItems: 'center', justifyContent: 'center' },
  tray: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
});
