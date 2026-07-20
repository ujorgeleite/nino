// components/ui/Solid.tsx
// Gives a surface a body: layered shadows, a curved-looking face, and an
// elevation it can animate.
//
// This is the single component that makes everything in the app feel liftable
// rather than printed. A card, a puzzle piece and a button all wrap in it.
//
// STRUCTURE, outermost first:
//
//   castView     the big soft shadow, on its own view because iOS renders one
//                shadow per view and we need two
//   contactView  the tight dark shadow directly under the object
//   face         the object itself, with a top highlight and bottom shading
//                so the fill reads as curved
//
// `elevation` is a shared value so a drag can drive every layer from one
// number: shadows spread, the object scales, the contact shadow fades.

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FORM,
  LIFT_HEIGHT,
  LIFT_SCALE,
  castShadow,
  contactShadow,
} from '../../constants/depth';
import { COLORS } from '../../constants/nino';

type Props = {
  children: React.ReactNode;
  /** 0 resting, 1 fully lifted. Drives shadows, scale and rise together. */
  elevation?: SharedValue<number>;
  /** Extra vertical offset — the idle float, usually. */
  offsetY?: SharedValue<number>;
  /** Extra tilt in degrees. */
  tilt?: SharedValue<number>;
  width: number;
  height: number;
  radius: number;
  backgroundColor: string;
  /** Outline weight. 0 removes it. */
  borderWidth?: number;
  borderColor?: string;
  style?: ViewStyle;
  testID?: string;
};

export function Solid({
  children,
  elevation,
  offsetY,
  tilt,
  width,
  height,
  radius,
  backgroundColor,
  borderWidth = 4,
  borderColor = COLORS.paper,
  style,
  testID,
}: Props) {
  // Shadow props cannot be interpolated on the UI thread, so the two layers
  // are pre-computed at rest and lifted, and cross-faded by opacity instead.
  const restCast = castShadow(0);
  const liftCast = castShadow(1);
  const restContact = contactShadow(0);

  const riseStyle = useAnimatedStyle(() => {
    const e = elevation?.value ?? 0;
    return {
      transform: [
        { translateY: (offsetY?.value ?? 0) - e * LIFT_HEIGHT },
        { rotate: `${tilt?.value ?? 0}deg` },
        { scale: 1 + e * LIFT_SCALE },
      ],
    };
  });

  const liftedCastStyle = useAnimatedStyle(() => ({
    opacity: elevation?.value ?? 0,
  }));

  const restingCastStyle = useAnimatedStyle(() => ({
    opacity: 1 - (elevation?.value ?? 0),
  }));

  const contactStyle = useAnimatedStyle(() => {
    const e = elevation?.value ?? 0;
    return {
      // The contact shadow shrinks and fades as the object leaves the ground.
      opacity: interpolate(e, [0, 1], [1, 0.25]),
      transform: [{ scale: interpolate(e, [0, 1], [1, 0.82]) }],
    };
  });

  const box = { width, height, borderRadius: radius };

  return (
    <Animated.View style={[box, style, riseStyle]} testID={testID}>
      {/* Cast shadow, cross-faded between resting and lifted. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.layer, box, { backgroundColor }, restCast, restingCastStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.layer, box, { backgroundColor }, liftCast, liftedCastStyle]}
      />

      {/* Contact shadow, tight and directly under. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.contact,
          {
            width: width * 0.86,
            height: height * 0.16,
            borderRadius: height * 0.08,
            bottom: -height * 0.05,
            left: width * 0.07,
          },
          restContact,
          contactStyle,
        ]}
      />

      {/* The face. */}
      <View
        style={[
          styles.face,
          box,
          { backgroundColor, borderWidth, borderColor, overflow: 'hidden' },
        ]}
      >
        {/* Top highlight and bottom shade: the fill reads as curved. */}
        <LinearGradient
          pointerEvents="none"
          colors={[FORM.highlight, 'transparent']}
          style={[styles.band, { height: height * FORM.band, top: 0 }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', FORM.shade]}
          style={[styles.band, { height: height * FORM.band, bottom: 0 }]}
        />
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0 },
  // The contact shadow is one view: its shadow props stay fixed and the lift
  // is expressed by animating opacity and scale, which the UI thread can do.
  contact: { position: 'absolute', backgroundColor: '#2A1C12' },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  band: { position: 'absolute', left: 0, right: 0 },
});

export default Solid;
