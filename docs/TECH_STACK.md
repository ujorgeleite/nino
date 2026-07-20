# TECH_STACK.md

## Core framework
- **Expo SDK 57** with **React Native 0.86** and **TypeScript**
- **expo-router** (file-based routing, no React Navigation)
- Target: iPad primary, iPhone secondary
- Orientation: landscape only (set in app.json)

> The original harness pinned SDK 51; SDK 51 is now end-of-life. This project
> was scaffolded on **SDK 57** (the current release at scaffold time). Always
> read https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.

## Animation stack
### react-native-reanimated v4
- ALL animations run on the UI thread via worklets
- Reanimated v4 requires **react-native-worklets** (installed); the worklets
  babel plugin is added automatically by `babel-preset-expo` — do NOT add a
  second copy of the plugin to babel.config.js.
- Never use Animated API from React Native core
- Patterns: useSharedValue, useAnimatedStyle, useDerivedValue, withTiming,
  withSpring, withRepeat, withSequence, runOnJS

### @shopify/react-native-skia
- Canvas-based rendering for wood textures
- Use for: card backgrounds, grain effects, inner/drop shadows
- Do NOT use for animated values — pass static props only
- Key APIs: Canvas, RoundedRect, LinearGradient, Path, Skia, vec
- Bundled in Expo Go for SDK 57 (verified via expo/bundledNativeModules.json)

### lottie-react-native
- Nino character animations only
- Files live in assets/lottie/ (not yet committed — see README there)
- Always set `resizeMode="cover"` for character animations

## Gesture handling
- **react-native-gesture-handler** for ALL gestures
- Gesture.Pan() for drag
- Gesture.Tap() for tap (more reliable than TouchableOpacity for children)
- Always wrap root in GestureHandlerRootView (done in app/_layout.tsx)

## Audio
- **expo-audio** (not expo-av — deprecated)
- Pattern: useAudioPlayer(require('...')) at component level
- Preload on mount, play() on event
- All sounds < 500ms for immediate feel
- Sound files not yet committed; constants/sounds.ts maps keys to null until then

## Haptics
- **expo-haptics** — import as namespace (`import * as Haptics`)
- Always pair with sound: haptic fires first, sound within 50ms

## Build & deploy
- **EAS Build** for both iOS and Android
- `eas build --platform ios` → .ipa for App Store
- `eas build --platform android` → .aab for Google Play
- Apple Developer: $99/yr (buy when ready to publish)
- Google Play: $25 one-time

## Performance rules
- Never call setState inside gesture handlers → use runOnJS
- Skia Canvas components must be stable (no re-render on game tick)
- useWindowDimensions() everywhere, zero hardcoded pixel values
- expo-keep-awake active during all game screens (activated in app/_layout.tsx)

## Entry point
- `package.json` "main" is **expo-router/entry** (no App.tsx / index.ts).
- Routes live in `app/`. Root layout: `app/_layout.tsx`.
