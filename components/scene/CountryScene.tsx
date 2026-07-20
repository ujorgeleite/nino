// components/scene/CountryScene.tsx
// One renderer for every country. A country is data (constants/countries);
// this turns that data into a scene.
//
// PERFORMANCE — this file is where the app's frame budget is won or lost:
//
//  1. The whole static skyline is ONE <Svg>. Each additional Svg root is a
//     separate native view; eleven towers in eleven roots would be eleven
//     views to composite every frame.
//  2. That skyline is memoized on (country, mode, size). Tapping a card must
//     not re-render a mountain range.
//  3. Only the windmill animates, and only because its sails must. It lives in
//     its own layer so it cannot invalidate the static one. Countries are
//     limited to one windmill by test.
//  4. Ambient loops on screen: sky drift + sun + (optional) windmill = 3.

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Line, Rect } from 'react-native-svg';
import { PRIMITIVES, INK, type StaticPrimitiveKind } from './primitives';
import TouchableScenery from './TouchableScenery';
import { eggFor } from '../../constants/easterEggs';
import { MOTION, type NinoMode } from '../../constants/nino';
import type { CountryData, ScenePiece } from '../../constants/countries';

/** Local box every primitive draws into (see primitives.tsx contract). */
const UNIT = 100;

type Props = {
  country: CountryData;
  mode?: NinoMode;
  children?: React.ReactNode;
};

export function CountryScene({ country, mode = 'there', children }: Props) {
  const { width, height } = useWindowDimensions();
  const drift = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: MOTION.drift, easing: Easing.linear }),
      -1,
      false,
    );
    spin.value = withRepeat(
      withTiming(1, { duration: MOTION.drift * 4, easing: Easing.linear }),
      -1,
      false,
    );
  }, [drift, spin]);

  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -drift.value * width }],
  }));
  const sunStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const isBack = mode === 'back';
  const sky = isBack ? country.palette.skyBack : country.palette.skyThere;
  const celestial = Math.min(width, height) * 0.16;

  // The horizon: where the ground meets the sky.
  const horizon = height * 0.72;
  // Base size of one scene unit, so a scale:1 piece reads well on any screen.
  const unitPx = Math.min(height * 0.34, width * 0.22);

  const windmill = country.scene.find((p) => p.kind === 'windmill');

  const skyline = useMemo(
    () => (
      <StaticSkyline
        country={country}
        width={width}
        height={height}
        horizon={horizon}
        unitPx={unitPx}
        dim={isBack}
      />
    ),
    [country, width, height, horizon, unitPx, isBack],
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={[sky[0], sky[1]]} style={StyleSheet.absoluteFill} />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.celestial,
          { width: celestial, height: celestial, top: height * 0.06, left: width * 0.08 },
          !isBack && sunStyle,
        ]}
      >
        <Celestial isBack={isBack} accent={country.palette.accent} size={celestial} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.clouds, { width: width * 2, height }, cloudStyle]}
      >
        <CloudBank width={width} height={height} dim={isBack} />
        <CloudBank width={width} height={height} dim={isBack} />
      </Animated.View>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {skyline}
      </View>

      {windmill ? (
        <Windmill
          piece={windmill}
          width={width}
          horizon={horizon}
          unitPx={unitPx}
          country={country}
          dim={isBack}
        />
      ) : null}

      {/* Easter eggs: transparent hit zones over the scenery.
          The skyline itself stays one flat, memoized draw — only these pads
          are interactive, so poking the world costs nothing to render. */}
      {country.scene.map((piece, i) => {
        const egg = eggFor(piece.kind);
        if (!egg) return null;
        const pieceScale = (piece.scale ?? 1) * unitPx;
        const spanning =
          piece.kind === 'water' || piece.kind === 'field' || piece.kind === 'hill';

        return (
          <TouchableScenery
            key={`egg-${piece.kind}-${i}`}
            egg={egg}
            left={spanning ? 0 : piece.x * width - pieceScale / 2}
            top={spanning ? horizon : horizon - pieceScale}
            width={spanning ? width : pieceScale}
            height={spanning ? height - horizon : pieceScale}
            testID={`egg-${piece.kind}-${i}`}
          />
        );
      })}

      <View style={styles.content}>{children}</View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The static skyline — one Svg, memoized by the parent
// ---------------------------------------------------------------------------

function StaticSkyline({
  country,
  width,
  height,
  horizon,
  unitPx,
  dim,
}: {
  country: CountryData;
  width: number;
  height: number;
  horizon: number;
  unitPx: number;
  dim: boolean;
}) {
  const { palette } = country;

  // Ground and water pieces span the full width; structures are placed.
  const spanning = country.scene.filter((p) => p.kind === 'water' || p.kind === 'field' || p.kind === 'hill');
  const structures = country.scene.filter(
    (p) => p.kind !== 'windmill' && !spanning.includes(p),
  );

  return (
    <Svg width={width} height={height} style={dim ? styles.dimmed : undefined}>
      {/* Ground fill under everything. */}
      <Rect x={0} y={horizon} width={width} height={2000} fill={palette.ground} />
      <Rect x={0} y={horizon} width={width} height={3} fill={INK} />

      {structures.map((piece, i) => {
        const Primitive = PRIMITIVES[piece.kind as StaticPrimitiveKind];
        if (!Primitive) return null;
        const scale = (piece.scale ?? 1) * (unitPx / UNIT);
        const x = piece.x * width - (UNIT * scale) / 2;
        const y = horizon - UNIT * scale;
        return (
          <G key={`${piece.kind}-${i}`} x={x} y={y} scale={scale}>
            <Primitive
              fill={piece.fill ?? palette.structure}
              altFill={palette.structureAlt}
              accent={palette.accent}
              variant={piece.variant}
            />
          </G>
        );
      })}

      {spanning.map((piece, i) => {
        const Primitive = PRIMITIVES[piece.kind as StaticPrimitiveKind];
        if (!Primitive) return null;
        // Spanning pieces stretch across the full width at the horizon.
        const h = unitPx * (piece.scale ?? 1) * 0.9;
        return (
          <G
            key={`span-${piece.kind}-${i}`}
            x={0}
            y={horizon - h * 0.1}
            scaleX={width / UNIT}
            scaleY={h / UNIT}
          >
            <Primitive
              fill={piece.fill ?? (piece.kind === 'water' ? palette.skyThere[0] : palette.ground)}
              altFill={palette.structureAlt}
              accent={palette.accent}
              variant={piece.variant}
            />
          </G>
        );
      })}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// The windmill — the only animated structure
// ---------------------------------------------------------------------------

function Windmill({
  piece,
  width,
  horizon,
  unitPx,
  country,
  dim,
}: {
  piece: ScenePiece;
  width: number;
  horizon: number;
  unitPx: number;
  country: CountryData;
  dim: boolean;
}) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: MOTION.drift, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin]);

  const sailStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const size = unitPx * (piece.scale ?? 1);
  const left = piece.x * width - size / 2;
  const top = horizon - size;
  const sail = size * 0.62;

  return (
    <View
      pointerEvents="none"
      style={[styles.windmill, { left, top, width: size, height: size }, dim && styles.dimmed]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <G>
          <Rect x={38} y={44} width={24} height={56} fill="#FFFFFF" stroke={INK} strokeWidth={3.2} />
          <Ellipse cx={50} cy={44} rx={16} ry={9} fill={country.palette.structure} stroke={INK} strokeWidth={3.2} />
          <Rect x={44} y={76} width={12} height={24} rx={5} fill={country.palette.accent} stroke={INK} strokeWidth={2.4} />
        </G>
      </Svg>

      <Animated.View
        style={[
          styles.sails,
          { width: sail, height: sail, top: size * 0.06, left: (size - sail) / 2 },
          sailStyle,
        ]}
      >
        <Svg width={sail} height={sail} viewBox="0 0 100 100">
          <G stroke={INK} strokeWidth={4} strokeLinejoin="round" fill="#FFF4E4">
            <Rect x={46} y={4} width={8} height={40} />
            <Rect x={46} y={56} width={8} height={40} />
            <Rect x={4} y={46} width={40} height={8} />
            <Rect x={56} y={46} width={40} height={8} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sky furniture
// ---------------------------------------------------------------------------

function Celestial({
  isBack,
  accent,
  size,
}: {
  isBack: boolean;
  accent: string;
  size: number;
}) {
  if (isBack) {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={30} fill="#B9A9E0" stroke={INK} strokeWidth={4} />
        <Circle cx={62} cy={42} r={26} fill="#22304F" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G stroke={INK} strokeWidth={4} strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <Line
              key={i}
              x1={50 + Math.cos(a) * 34}
              y1={50 + Math.sin(a) * 34}
              x2={50 + Math.cos(a) * 46}
              y2={50 + Math.sin(a) * 46}
            />
          );
        })}
      </G>
      <Circle cx={50} cy={50} r={28} fill={accent} stroke={INK} strokeWidth={4} />
    </Svg>
  );
}

function CloudBank({ width, height, dim }: { width: number; height: number; dim: boolean }) {
  const tint = dim ? '#B9A9E0' : '#FFFFFF';
  return (
    <Svg width={width} height={height}>
      <Cloud cx={width * 0.18} cy={height * 0.16} r={26} tint={tint} />
      <Cloud cx={width * 0.52} cy={height * 0.1} r={19} tint={tint} />
      <Cloud cx={width * 0.82} cy={height * 0.2} r={23} tint={tint} />
    </Svg>
  );
}

function Cloud({ cx, cy, r, tint }: { cx: number; cy: number; r: number; tint: string }) {
  const common = { fill: tint, stroke: INK, strokeWidth: 3 };
  return (
    <G opacity={0.95}>
      <Ellipse cx={cx} cy={cy} rx={r * 1.5} ry={r * 0.78} {...common} />
      <Ellipse cx={cx - r * 0.8} cy={cy + r * 0.14} rx={r * 0.86} ry={r * 0.62} {...common} />
      <Ellipse cx={cx + r * 0.86} cy={cy + r * 0.18} rx={r * 0.78} ry={r * 0.56} {...common} />
    </G>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  celestial: { position: 'absolute' },
  clouds: { position: 'absolute', top: 0, left: 0, flexDirection: 'row' },
  windmill: { position: 'absolute' },
  sails: { position: 'absolute' },
  content: { flex: 1 },
  // Back mode: the same scene, quieter. Cheaper than a second palette per piece.
  dimmed: { opacity: 0.62 },
});

export default CountryScene;
