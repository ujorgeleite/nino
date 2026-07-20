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
import { useMode } from '../../../hooks/useMode';
import { useMusic } from '../../../hooks/useMusic';
import { useFeedback } from '../../../hooks/useFeedback';
import { useProgress } from '../../../hooks/useProgress';
import { nextChallenge } from '../../../utils/nextChallenge';
import { COUNTRIES, getCountry, DEFAULT_COUNTRY } from '../../../constants/countries';
import { LAYOUT, SPACING } from '../../../constants/nino';

/**
 * The cut.
 *
 * Six pieces is the most a 2-year-old can hold as "a few things"; more reads
 * as a wall of fragments. Two rows of three also matches the landscape shape
 * of the screen, so the tray fits on one line.
 */
const ROWS = 2;
const COLS = 3;

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
    cells,
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
  } = usePuzzle(ROWS, COLS);

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
  const pieceSize = Math.max(LAYOUT.touchMin, Math.min(120, shortSide * 0.24));

  const chrome =
    SPACING.s5 * 2 + // root padding
    LAYOUT.touchMin + // the HUD row
    SPACING.s4 * 2 + // gaps above and below the board
    pieceSize + // the tray
    SPACING.s3; // tray padding
  const boardSize = Math.max(
    LAYOUT.touchMin * 2,
    Math.min(height - chrome, width * 0.5),
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
    <CountryScene country={country} mode={mode}>
      <View style={styles.root}>
        <GameHud onRestart={reset} mascotReaction={reaction} reactionSeq={eventSeq} />

        <View style={styles.layer}>
          <View style={styles.boardWrap} testID="puzzle-board">
            <PuzzleBoard
              country={country}
              cells={cells}
              rows={ROWS}
              cols={COLS}
              placed={placed}
              highlighted={preview}
              size={boardSize}
              onCellMeasured={onCellMeasured}
            />
          </View>

          <View style={[styles.tray, { gap: SPACING.s4 }]}>
            {trayOrder.map((id) => {
              const cell = cells.find((c) => c.id === id);
              if (!cell) return null;
              return (
                <TraySlot
                  key={cell.id}
                  size={pieceSize}
                  onMeasured={(centre) => onHomeMeasured(cell.id, centre)}
                >
                  <PuzzlePiece
                    country={country}
                    cell={cell}
                    rows={ROWS}
                    cols={COLS}
                    size={pieceSize}
                    placed={placed.has(cell.id)}
                    resolvePlacedOffset={() => placedOffset(cell.id)}
                    round={round}
                    onGrab={() => liftPiece(cell.id)}
                    onDragMove={(point) => onDragMove(cell.id, point)}
                    onDrop={(point) => handleDrop(cell.id, point)}
                    accessibilityLabel={`Puzzle piece ${cell.row + 1}-${cell.col + 1}`}
                    testID={`piece-${cell.id}`}
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
  layer: { flex: 1, justifyContent: 'space-between' },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SPACING.s3,
  },
});
