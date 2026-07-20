// app/games/shapefit/[country].tsx — Shape Fit, any country.
//
// The route owns GEOMETRY so the hook can stay pure: it measures every socket
// and every tray slot in window coordinates, which is the same space the pan
// gesture reports. No offset arithmetic, no coordinate chains.
//
// It also owns the drop PREVIEW — deciding which socket should glow as a
// piece is carried over it.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CountryScene from '../../../components/scene/CountryScene';
import GameHud from '../../../components/game/GameHud';
import WoodBoard from '../../../components/shapefit/WoodBoard';
import DraggablePiece, {
  type DropResult,
} from '../../../components/shapefit/DraggablePiece';
import WinOverlay from '../../../components/ui/WinOverlay';
import { useShapeFitNL, SNAP_RADIUS, type Point } from '../../../hooks/useShapeFitNL';
import { useMode } from '../../../hooks/useMode';
import { useMusic } from '../../../hooks/useMusic';
import { useFeedback } from '../../../hooks/useFeedback';
import { useItemVoice } from '../../../hooks/useItemVoice';
import { useProgress } from '../../../hooks/useProgress';
import { nextChallenge } from '../../../utils/nextChallenge';
import { COUNTRIES, getCountry, DEFAULT_COUNTRY } from '../../../constants/countries';
import { LAYOUT, SPACING } from '../../../constants/nino';

export default function ShapeFitCountryRoute() {
  const { country: code } = useLocalSearchParams<{ country: string }>();
  const country = getCountry(code) ?? DEFAULT_COUNTRY;

  const router = useRouter();
  const { mode } = useMode();
  const feedback = useFeedback();
  const { isComplete, markComplete } = useProgress();
  const sayItem = useItemVoice();
  const { width, height } = useWindowDimensions();
  useMusic(country.code, 'shapefit', mode);

  const {
    trayOrder,
    seated,
    isWon,
    tryDrop,
    liftPiece,
    unseatPiece,
    reset,
    lastEvent,
    lastItemId,
    eventSeq,
    round,
  } = useShapeFitNL(country.items);

  // Everything measured in WINDOW space.
  const sockets = useRef<Record<string, Point>>({});
  const homes = useRef<Record<string, Point>>({});

  /** Which socket is glowing right now. Null when nothing is close enough. */
  const [preview, setPreview] = useState<string | null>(null);

  const reaction = lastEvent === 'seated' ? 'celebrate' : null;

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent === 'lift') feedback('grab');
    else if (lastEvent === 'seated') {
      feedback('seat');
      sayItem(lastItemId);
    } else if (lastEvent === 'unseated') feedback('unseat');
    else if (lastEvent === 'rejected') feedback('softDrop');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSeq]);

  // BIGGER THAN BEFORE. The old sizing capped pieces at 96pt; a 2-year-old
  // reaches for the biggest thing on screen, and this game lives or dies on
  // whether the pieces invite a grab.
  // Record the win once, so the picker can mark it and the next challenge
  // can skip it.
  useEffect(() => {
    if (isWon) markComplete(`shapefit-${country.code}`);
  }, [isWon, country.code, markComplete]);

  /** Finishing opens a door: the same game, in a country not yet done. */
  const goNext = useCallback(() => {
    const next = nextChallenge(
      COUNTRIES.map((c) => ({
        code: c.code,
        completed: isComplete(`shapefit-${c.code}`),
      })),
      country.code,
    );
    router.replace({
      pathname: '/games/shapefit/[country]',
      params: { country: next },
    });
  }, [country.code, isComplete, router]);

  // Sized from the short side, and MEASURED to fit rather than assumed to.
  //
  // An audit computed that this overflows iPhone landscape — 136pt of board
  // needing 117pt — by summing the fixed sizes. It does not: `boardWrap` is
  // flex:1 inside a space-between column, so the board takes what is left
  // instead of demanding a fixed height. Rewriting this to budget the height
  // explicitly made every socket and piece smaller for no gain, so it was
  // reverted. e2e/shapefit-layout.spec.ts now holds the real answer on both
  // phone viewports, including the 375pt-tall one added for this.
  const shortSide = Math.min(width, height);
  const socketSize = Math.min(140, shortSide * 0.2);
  const pieceSize = Math.max(LAYOUT.touchComfortable, Math.min(128, shortSide * 0.18));

  const onSocketMeasured = useCallback((itemId: string, centre: Point) => {
    sockets.current[itemId] = centre;
  }, []);

  const onHomeMeasured = useCallback((itemId: string, centre: Point) => {
    homes.current[itemId] = centre;
  }, []);

  /** Glow the socket a carried piece would land in. */
  const onDragMove = useCallback((itemId: string, point: Point) => {
    const target = sockets.current[itemId];
    if (!target) return;
    const near = Math.hypot(point.x - target.x, point.y - target.y) <= SNAP_RADIUS;
    setPreview((current) => {
      const next = near ? itemId : null;
      return current === next ? current : next;
    });
  }, []);

  const handleDrop = useCallback(
    (itemId: string, point: Point): DropResult => {
      setPreview(null);
      const didSeat = tryDrop(itemId, point, sockets.current);

      if (!didSeat) {
        // Dropping a seated piece somewhere invalid releases it back to the
        // tray rather than snapping it home — the child moved it on purpose.
        if (seated.has(itemId)) unseatPiece(itemId);
        return { seated: false, offset: null };
      }

      // Offset from the piece's tray slot to its socket, so the piece can
      // simply translate there and STAY VISIBLE inside the board.
      const socket = sockets.current[itemId];
      const home = homes.current[itemId];
      if (!socket || !home) return { seated: true, offset: null };
      return { seated: true, offset: { x: socket.x - home.x, y: socket.y - home.y } };
    },
    [tryDrop, seated, unseatPiece],
  );

  const seatedOffset = useCallback((itemId: string): Point | null => {
    const socket = sockets.current[itemId];
    const home = homes.current[itemId];
    if (!socket || !home) return null;
    return { x: socket.x - home.x, y: socket.y - home.y };
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
              highlighted={preview}
              socketSize={socketSize}
              onSocketMeasured={onSocketMeasured}
            />
          </View>

          <View style={[styles.tray, { gap: SPACING.s5 }]}>
            {trayOrder.map((itemId) => {
              const item = country.items.find((i) => i.id === itemId);
              if (!item) return null;
              return (
                <TraySlot
                  key={item.id}
                  size={pieceSize}
                  onMeasured={(centre) => onHomeMeasured(item.id, centre)}
                >
                  <DraggablePiece
                    emoji={item.emoji}
                    tint={item.tint}
                    size={pieceSize}
                    seated={seated.has(item.id)}
                    // Resolved by the piece when it needs it, so the parent
                    // never reads a ref during its own render.
                    resolveSeatedOffset={() => seatedOffset(item.id)}
                    round={round}
                    onGrab={() => liftPiece(item.id)}
                    onDragMove={(point) => onDragMove(item.id, point)}
                    onDrop={(point) => handleDrop(item.id, point)}
                    accessibilityLabel={item.label}
                    testID={`piece-${item.id}`}
                  />
                </TraySlot>
              );
            })}
          </View>
        </View>
      </View>

      {isWon ? (
        <WinOverlay
          title="All in place!"
          detail={country.name}
          actionLabel="Next place"
          onPlayAgain={goNext}
        />
      ) : null}
    </CountryScene>
  );
}

/**
 * Holds a piece's home position and reports it in window space.
 *
 * The slot keeps its size when the piece flies to the board, so the tray does
 * not collapse and reflow under the child's other hand.
 */
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
