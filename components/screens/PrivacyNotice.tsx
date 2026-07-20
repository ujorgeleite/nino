// components/screens/PrivacyNotice.tsx
// The privacy policy, in the app.
//
// WHY IT IS NOT A LINK
//
// Apple requires a Kids-category app to make its privacy policy reachable, and
// the panel used to have a "Privacy" button that did nothing at all. The
// obvious fix — open a browser — would break two of the promises listed one
// screen up: "100% offline" and "No outside links". An app that has to reach
// the internet to tell you it never reaches the internet is not a good look,
// and it would also need the external-link parental gate Apple demands of Kids
// apps, which is a worse experience than simply showing the text.
//
// So the policy lives here as content. It is short because there is almost
// nothing to disclose, which is the point.
//
// App Store Connect ALSO requires a hosted privacy-policy URL as listing
// metadata. That is a form field in ASC, not something this app can satisfy;
// this screen is the in-app copy, and the two should say the same thing.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADII, SPACING, TYPE } from '../../constants/nino';

/** Kept as data so the copy can be read, reviewed and tested as a whole. */
export const PRIVACY_SECTIONS: readonly { heading: string; body: string }[] = [
  {
    heading: 'What we collect',
    body: 'Nothing. There is no account, no sign-in, no analytics, no advertising, and no third-party service of any kind in this app.',
  },
  {
    heading: 'What leaves the device',
    body: 'Nothing. The app has no networking code and works with the device in airplane mode. Every picture, sound and piece of music is bundled in the app itself.',
  },
  {
    heading: 'What is stored',
    body: 'Which challenges have been finished, and whether sound is muted. This is kept on the device only, and is removed when the app is deleted.',
  },
  {
    heading: 'Children',
    body: 'The app is made for very young children and is designed to be safe by having nothing to be unsafe with: no chat, no links out, no purchases a child can reach, and no data collection. This meets COPPA and GDPR-K by not gathering anything in the first place.',
  },
  {
    heading: 'Questions',
    body: 'Write to privacy@thereandback.app and a person will answer.',
  },
];

type Props = {
  /** Rendered inside the grown-up panel, which owns the scroll and the gate. */
  compact?: boolean;
};

export function PrivacyNotice({ compact = false }: Props) {
  const content = (
    <View style={styles.body}>
      {PRIVACY_SECTIONS.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>
          <Text style={styles.text}>{section.body}</Text>
        </View>
      ))}
      <Text style={styles.updated}>Last updated 21 July 2026.</Text>
    </View>
  );

  if (compact) return content;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollInner: { padding: SPACING.s5 },
  body: {
    gap: SPACING.s4,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    padding: SPACING.s5,
  },
  section: { gap: SPACING.s2 },
  heading: {
    fontFamily: TYPE.fontBodyBold,
    fontSize: TYPE.sizes.label,
    color: COLORS.ninoInk,
  },
  text: {
    fontFamily: TYPE.fontBody,
    fontSize: TYPE.sizes.label,
    lineHeight: TYPE.sizes.label * TYPE.lineHeight.body,
    color: COLORS.muted,
  },
  updated: {
    fontFamily: TYPE.fontBody,
    fontSize: TYPE.sizes.caption,
    color: COLORS.muted,
  },
});

export default PrivacyNotice;
