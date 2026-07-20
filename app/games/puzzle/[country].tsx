// app/games/puzzle/[country].tsx — Jigsaw, any country.
//
// Replaces Memory. A 2-year-old preferred dragging to tapping, and this keeps
// that while adding what Shape Fit lacks: the pieces assemble into a PICTURE,
// so progress is visible in the thing itself.
//
// The route owns geometry — it measures every cell and every tray slot in
// window coordinates, the same space the pan gesture reports — and owns the
// drop preview that makes a cell glow as a piece approaches.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CountryScene from '../../../components/scene/CountryScene';
import GameHud from '../../../components/game/GameHud';
import PuzzleBoard from '../../../components/puzzle/PuzzleBoard';
import PuzzlePiece, { type PlaceResult } from '../../../components/puzzle/PuzzlePiece';
import WinOverlay from '../../../components/ui/WinOverlay';
import { usePuzzle, PUZZLE_SNAP_RADIUS, type Point } from '../../../hooks/usePuzzle';
import { PUZZLE_SHAPES, shapeById } from '../../../constants/puzzleShapes';
import { useMode } from '../../../hooks/useMode';
import { useMusic } from '../../../hooks/useMusic';
import { useFeedback } from '../../../hooks/useFeedback';
import { useProgress } from '../../../hooks/useProgress';
import { nextChallenge } from '../../../utils/nextChallenge';
import { COUNTRIES, getCountry, DEFAULT_COUNTRY } from '../../../constants/countries';
import { LAYOUT, SPACING } from '../../../constants/nino';

// The cut lives in constants/puzzleShapes.ts: four holes, each an
// unmistakably different shape. A circle has exactly one place it can go, and
// a 2-year-old can see which before they try.

export default function PuzzleCountryRoute() {
  const { country: code } = useLocalSearchParams<{ country: string }>();
  const country = getCountry(code) ?? DEFAULT_COUNTRY;
  const router = useRouter();

  const { mode } = useMode();
  const feedback = useFeedback();
  const { width, height } = useWindowDimensions();
  const { isComplete, markComplete } = useProgress();
  useMusic(country.code, 'puzzle', mode);

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
  } = usePuzzle();

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

  // LAYOUT MUST FIT, not merely look right on the widest screen.
  //
  // Sizing the board from the short side alone overflowed iPhone landscape by
  // ~116pt: the tray ended up underneath the board, so a touch aimed at a
  // piece hit the board instead and the game became unwinnable. The bug read
  // as flakiness — different countries failed on different runs — because it
  // depended on where each shuffled piece happened to land.
  //
  // So the board takes what is LEFT after everything else has its space.
  const shortSide = Math.min(width, height);

  // The tray row is as tall as the BIGGEST shape, since pieces are cut at the
  // board's scale and the star is wider than the square.
  const largestShare = Math.max(...PUZZLE_SHAPES.map((s) => s.size));

  // LAYOUT MUST FIT, and on a wide-short screen stacking cannot.
  //
  // iPhone landscape is 844×390. Stacking board over tray needs
  // ~(board + tray + HUD + padding) of height, which does not exist there —
  // the tray ended up UNDER the board and its pieces became untouchable.
  // Shrinking the board is not the fix either: it hits the 180pt floor and
  // overflows anyway.
  //
  // So on a wide-short screen the tray moves BESIDE the board, using the width
  // that screen has in abundance. The geometry test asserts the result rather
  // than the rule.
  const sideBySide = width / height > 1.7;

  const verticalChrome =
    SPACING.s5 * 2 + LAYOUT.touchMin + SPACING.s4 * (sideBySide ? 1 : 2) +
    (sideBySide ? 0 : SPACING.s3);

  // Slack matters: an exact fit leaves nothing for rounding, and an earlier
  // attempt landed on precisely the viewport height.
  const availableHeight = (height - verticalChrome) * 0.94;

  const boardSize = sideBySide
    ? Math.min(availableHeight, width * 0.42)
    : Math.min(availableHeight / (1 + largestShare), width * 0.46, shortSide * 0.78);

  const trayExtent = boardSize * largestShare;

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
    <CountryScene country={country} mode={mode}>
      <View style={styles.root}>
        <GameHud onRestart={reset} mascotReaction={reaction} reactionSeq={eventSeq} />

        <View style={[styles.layer, sideBySide && styles.layerRow]}>
          {/* Explicit sizes, not flex: letting the wrapper expand made it
              overlap the tray, which the geometry test caught. */}
          <View
            style={[styles.boardWrap, { height: boardSize, width: boardSize }]}
            testID="puzzle-board"
          >
            <PuzzleBoard
              country={country}
              placed={placed}
              highlighted={preview}
              size={boardSize}
              onCellMeasured={onCellMeasured}
            />
          </View>

          <View
            style={[
              styles.tray,
              { gap: SPACING.s4 },
              sideBySide
                ? // Beside the board: a wrapping grid, two per row.
                  { width: trayExtent * 2 + SPACING.s4, height: boardSize }
                : { height: trayExtent },
            ]}
          >
            {trayOrder.map((id) => {
              const shape = shapeById(id);
              if (!shape) return null;
              return (
                <TraySlot
                  key={shape.id}
                  size={shape.size * boardSize}
                  onMeasured={(centre) => onHomeMeasured(shape.id, centre)}
                >
                  <PuzzlePiece
                    country={country}
                    shape={shape}
                    boardSize={boardSize}
                    placed={placed.has(shape.id)}
                    resolvePlacedOffset={() => placedOffset(shape.id)}
                    round={round}
                    onGrab={() => liftPiece(shape.id)}
                    onDragMove={(point) => onDragMove(shape.id, point)}
                    onDrop={(point) => handleDrop(shape.id, point)}
                    // Parent-facing. The child navigates by shape.
                    accessibilityLabel={shape.label}
                    testID={`piece-${shape.id}`}
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
    </CountryScene>
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
  root: { flex: 1, padding: SPACING.s5, gap: SPACING.s4 },
  layer: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  layerRow: { flexDirection: 'row', alignItems: 'center' },
  boardWrap: { alignItems: 'center', justifyContent: 'center' },
  tray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
