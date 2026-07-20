// components/screens/ParentPanel.tsx
// The grown-up space, reachable only through the press-and-hold gate —
// prompts/starting.md §5d.
//
// COPY RULE (§5d, explicit): never claim the app makes children sleep. The
// honest claim is about what the app does — busy hands on the way there, a
// calmer wind-down on the way back — not about an outcome we cannot deliver.
// Any future copy change here must keep that line.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Chip from '../ui/Chip';
import PrivacyNotice from './PrivacyNotice';
import Glyph from '../ui/Glyph';
import { COLORS, LAYOUT, RADII, SHADOWS, SPACING, TYPE } from '../../constants/nino';

const PROMISES = [
  { emoji: '🚫', label: 'No ads ever' },
  { emoji: '✈️', label: '100% offline' },
  { emoji: '🔒', label: 'No outside links' },
  { emoji: '🔒', label: 'Data stays on device' },
  { emoji: '🌙', label: 'Session ends itself' },
  { emoji: '🇪🇺', label: 'GDPR-K & COPPA' },
];

// "Settings" and "Trip history" were listed here and did nothing — neither
// screen exists. Dead controls in the grown-up panel are worse than no
// controls: a parent taps one, gets silence, and concludes the app is broken.
// They are gone. Privacy is real now, and Contact is the address inside it.

type Props = {
  onClose: () => void;
};

export function ParentPanel({ onClose }: Props) {
  const [showPrivacy, setShowPrivacy] = React.useState(false);

  return (
    <View style={styles.scrim}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>For grown-ups</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={SPACING.s4}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Glyph name="close" size={22} color={COLORS.mutedInk} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.lede}>
            Nino keeps hands busy on the way there, winds down on the way back, and
            hands your child off calm to bath — story — bed.
          </Text>

          <View style={styles.chips}>
            {PROMISES.map((p) => (
              <Chip key={p.label} emoji={p.emoji} label={p.label} />
            ))}
          </View>

          {/* Honest framing: the app supports a routine, it does not cause sleep. */}
          <Text style={styles.note}>
            The Back mode is quieter and slower on purpose. It is designed to fit
            the start of a bedtime routine — it will not put anyone to sleep, but
            it tries not to work against you.
          </Text>

          <View style={styles.links}>
            <Pressable
              onPress={() => setShowPrivacy((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel={showPrivacy ? 'Hide privacy policy' : 'Privacy policy'}
              accessibilityState={{ expanded: showPrivacy }}
              hitSlop={SPACING.s2}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              testID="privacy-toggle"
            >
              <Text style={styles.linkText}>
                {showPrivacy ? 'Hide privacy policy' : 'Privacy policy'}
              </Text>
            </Pressable>
          </View>

          {showPrivacy ? <PrivacyNotice compact /> : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    // Absolute, not flex: this renders as a sibling over the Menu, so it must
    // cover it rather than stack below it.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 48, 79, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.s5,
  },
  card: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    backgroundColor: COLORS.paper,
    borderRadius: RADII.lg,
    padding: SPACING.s5,
    ...SHADOWS.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.s4,
  },
  title: {
    fontFamily: TYPE.fontDisplay,
    fontSize: TYPE.sizes.title,
    color: COLORS.textStrong,
  },
  close: {
    // 45pt, below the 90pt child floor — deliberate. This panel is only
    // reachable through the 1.5s hold gate, so the only person who ever sees
    // this button is an adult with precise aim. The generous hitSlop above
    // still widens the actual touch area.
    width: LAYOUT.touchMin * 0.5,
    height: LAYOUT.touchMin * 0.5,
    borderRadius: RADII.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  pressed: { opacity: 0.65 },
  body: { gap: SPACING.s4, paddingBottom: SPACING.s3 },
  lede: {
    fontFamily: TYPE.fontBody,
    fontSize: TYPE.sizes.body,
    lineHeight: TYPE.sizes.body * TYPE.lineHeight.body,
    color: COLORS.textBody,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s2 },
  note: {
    fontFamily: TYPE.fontBody,
    fontSize: TYPE.sizes.label,
    lineHeight: TYPE.sizes.label * TYPE.lineHeight.body,
    color: COLORS.muted,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s4,
    borderTopWidth: 2,
    borderTopColor: COLORS.borderSoft,
    paddingTop: SPACING.s4,
  },
  link: { paddingVertical: SPACING.s2 },
  linkText: {
    fontFamily: TYPE.fontBodyBold,
    fontSize: TYPE.sizes.label,
    color: COLORS.blue,
  },
});

export default ParentPanel;
