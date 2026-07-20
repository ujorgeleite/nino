// components/RootErrorBoundary.tsx
// Turns a crash into something visible instead of a blank app.
//
// WHY: a throw during the root render — a provider failing to initialise, an
// asset that will not decode, a native module missing — unmounts the whole
// tree. In a release build there is no red box, so the app just shows nothing
// and looks like it "does not open". That is unfixable from the outside
// because the error never reaches anyone.
//
// This catches it, keeps the app on screen, and shows the message. A parent
// can read it out; a developer can act on it.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class RootErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Reaches the Metro console in development and the device log in release.
    console.error('[nino] root render failed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.emoji} allowFontScaling={false}>
          🧭
        </Text>
        <Text style={styles.title}>Nino got lost</Text>
        <Text style={styles.body}>
          Something went wrong starting the app. Close it and open it again.
        </Text>
        <ScrollView style={styles.detailBox} contentContainerStyle={styles.detail}>
          <Text style={styles.mono} selectable>
            {error.message}
            {'\n\n'}
            {error.stack?.split('\n').slice(0, 12).join('\n')}
          </Text>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  // Deliberately hardcoded, not themed: the theme itself may be what failed.
  root: {
    flex: 1,
    backgroundColor: '#FFF4E4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emoji: { fontSize: 56 },
  title: { fontSize: 24, fontWeight: '800', color: '#33241C' },
  body: { fontSize: 15, color: '#4A4237', textAlign: 'center' },
  detailBox: { maxHeight: 200, alignSelf: 'stretch', marginTop: 12 },
  detail: { padding: 12 },
  mono: { fontSize: 11, color: '#8A6A3B', fontFamily: 'Courier' },
});

export default RootErrorBoundary;
