---
name: motion
description: Animation, haptics and audio rules for Pedrinho Travels — Reanimated v4, Skia, Lottie, expo-haptics and expo-audio. Use whenever writing or changing an animation, a gesture-driven transition, a haptic response, or a sound cue. Encodes docs/ANIMATION_GUIDELINES.md and docs/TECH_STACK.md as working rules.
---

# motion — animation and feedback

For a 2-year-old, motion and sound *are* the interface. There is no text to read.
`CLAUDE.md` rule 4: **every tap gets haptic + sound within 100ms.** Delayed or
missing feedback breaks toddler attention entirely.

## Which library does what

From `docs/TECH_STACK.md` — using the wrong one is a correctness bug, not taste:

| Need | Use | Never |
|---|---|---|
| Any UI animation | `react-native-reanimated` | RN core `Animated` |
| Gestures | `react-native-gesture-handler` | `PanResponder`, `TouchableOpacity` in games |
| Textures, procedural graphics | `@shopify/react-native-skia` | animated Skia values |
| Pedro's character animation | `lottie-react-native` | Lottie for anything else |

**Never use React Native's core `Animated`.** It runs on the JS thread and drops
frames the moment game logic runs. Reanimated v4 runs on the UI thread via
`react-native-worklets`.

Reanimated v4 setup note: `babel-preset-expo` handles the worklets plugin on SDK
57. **Do not add a second worklets babel plugin** — it breaks the build.

## Reanimated rules

Use `useSharedValue`, `useAnimatedStyle`, `useDerivedValue`, `withTiming`,
`withSpring`, `withRepeat`, `withSequence`, `runOnJS`.

**Shared-value writes are side effects — they belong in `useEffect`, never in
`useMemo`.** `useMemo` may run more than once per commit and must stay pure. This
was a real bug in `useCardFlip.ts`, caught by `react-hooks/immutability`:

```ts
// hooks/useCardFlip.ts
useEffect(() => {
  progress.value = withTiming(faceUp ? 1 : 0, {
    duration: faceUp ? ANIMATION.flipOpen : ANIMATION.flipClose,
    easing: Easing.out(Easing.cubic),
  });
}, [faceUp, progress]);
```

**Never call `setState` from a worklet.** Cross the thread boundary explicitly:

```tsx
const tap = Gesture.Tap().onEnd((_e, success) => {
  'worklet';
  if (success) runOnJS(handleFlip)();
});
```

## Timings come from tokens

Every duration is in `ANIMATION` in `constants/theme.ts`. Never inline a number.

```ts
ANIMATION = {
  flipOpen: 380, flipClose: 320,
  floatDuration: 1200, floatAmplitude: 12,
  matchPulse: 120, winDelay: 400,
}
```

Established patterns in `docs/ANIMATION_GUIDELINES.md` — reuse them rather than
inventing new motion:

- **3D card flip** — `perspective: 1000`, `backfaceVisibility: 'hidden'` on both
  faces, cubic ease-out. Open slower than close.
- **Match pulse** — `withSequence(withTiming(1.12, {duration: 120}), withSpring(1, {damping: 8, stiffness: 200}))`.
- **Idle float** — `withRepeat(withSequence(...), -1, true)` for the infinite sine
  bob on Pedro.
- **Drag release** — `withSpring`, never `withTiming`. Physical, not mechanical.

Motion for this age is **exaggerated and springy**. Adult-tasteful subtlety reads
as "nothing happened" to a 2-year-old.

## Skia

Static props only. **Never drive a Skia value from a Reanimated shared value** in
this project — animate a wrapping `Animated.View` instead.

Keep canvases stable across renders. Procedural geometry goes in a `useMemo` keyed
on its inputs, as `WoodCard` does with its grain paths (`[width, height, seed]`).

**Never use `Math.random()` in rendering.** Wood grain must be identical every
frame for a given card, so `WoodCard` seeds a deterministic Lehmer RNG from
`instanceId`. Random-per-render means grain that shimmers on every state change.

## Haptics

```ts
import * as Haptics from 'expo-haptics';
```

Haptic **first**, sound within `HAPTICS_DELAY_MS` (50ms). The map from
`ANIMATION_GUIDELINES.md`:

| Event | Feedback |
|---|---|
| Tap / flip | `impactAsync(Light)` |
| Match | `notificationAsync(Success)` |
| Mismatch | `notificationAsync(Error)` — gentle, never punishing |
| Win | `impactAsync(Heavy)` ×3, 150ms apart |

Always fire-and-forget with a swallowing catch — the established project idiom.
A missing taptic engine must never crash the app:

```ts
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
```

## Audio — currently the biggest gap

`expo-audio` is installed and declared in `app.json`, but **imported nowhere**.
Every entry in `constants/sounds.ts` is `null`. So rule 4 is only half met today:
haptics fire, sound does not.

Use `expo-audio`. **`expo-av` is deprecated** — do not reach for it.

```ts
import { useAudioPlayer } from 'expo-audio';
const player = useAudioPlayer(require('../assets/sounds/wood-tap.mp3'));
```

Rules for the audio layer:

- **Never `require()` a sound inside a component.** All references live in
  `constants/sounds.ts`, keyed by `SoundKey`.
- Handle `null` entries gracefully — the MP3s are not committed yet
  (`assets/sounds/README.md` has the shopping list). The audio layer must no-op
  silently when a sound is missing, so the app runs with zero setup.
- Effects stay **under 500ms**. Background music loops gently and quietly.
- Route audio through a `hooks/useSound.ts` wrapper so components call
  `play('woodTap')` and never touch `expo-audio` directly. This keeps components
  testable — `expo-audio` is already mocked in `jest.setup.ts`.

## Celebration outweighs failure — rule 10

Win animations run **3–5 seconds minimum**. A mismatch gets a soft, brief nudge.
If the failure response is more elaborate than the success response, it is wrong
for this audience. See `components/screens/WinScreen.tsx`.

## Testing motion

Reanimated is mocked in `jest.setup.ts` — animations resolve instantly to their
end value, so Jest can assert **that** feedback fired, never how it looked:

```ts
import * as Haptics from 'expo-haptics';
expect(Haptics.notificationAsync).toHaveBeenCalledWith(
  Haptics.NotificationFeedbackType.Success,
);
```

That is the useful assertion — it pins rule 4 (feedback happens on the right
event) without pretending to test the feel.

**Timing, easing and smoothness cannot be unit tested.** After any motion change,
run `npx expo start` on a device and say plainly what you did or did not verify
visually. A green suite proves nothing about a 60fps flip.

## Finish

Run the `verify` skill, then confirm on device.
