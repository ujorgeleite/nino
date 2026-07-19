---
name: ui-component
description: Conventions for creating or editing any file in components/ or app/ in Pedrinho Travels — file shape, props typing, styling, theme tokens, responsive sizing and accessibility. Use whenever writing a React Native component or an expo-router route in this project.
---

# ui-component — components that stay consistent

The codebase already has a strong, uniform style. Today it is held together only
by discipline; this skill makes it explicit so it survives the tenth game.

**Components render. They do not decide.** All game logic lives in `hooks/`
(see the `game-logic-hook` skill). A component that computes game rules is a bug
in the architecture, not a style issue.

## File shape

Every file follows this order. Read `components/cards/WoodCard.tsx` or
`components/board/GameBoard.tsx` as reference.

```tsx
// components/domain/MyThing.tsx
// One or two lines: what this renders and which doc governs it.
// e.g. "Static Skia canvas only (no animated Skia values) per ANIMATION_GUIDELINES.md."

import { StyleSheet, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

type Props = {
  size: number;
  onPress: () => void;
  matched?: boolean;
};

export function MyThing({ size, onPress, matched = false }: Props) {
  return <View style={[styles.root, { width: size }]} />;
}

const styles = StyleSheet.create({
  root: { backgroundColor: COLORS.warmCream },
});

export default MyThing;
```

Non-negotiable details of that shape:

- **Header comment with the file path**, its purpose, and the doc it answers to.
  This is the strongest convention in the repo — every source file has one.
- **`type Props`**, always. Never `interface`. Never `React.FC`.
- **Optional props get defaults in the destructure**, sourced from theme tokens:
  `width = CARD.width`.
- **Dual export**: named function, then `export default` at the very end.
  (Route files under `app/` use `export default function` only.)
- **`StyleSheet.create` at the bottom**, after the component, before the default
  export.
- **Imports are relative.** There is no `@/*` alias configured in `tsconfig.json`.

## Styling

`StyleSheet` for everything static. Inline styles **only** for measured or dynamic
values, composed with array syntax:

```tsx
<View style={[styles.tile, { width, height }, matched && styles.matched]} />
```

Pressed states are separate style keys via the render prop:

```tsx
<Pressable style={({ pressed }) => [styles.play, pressed && styles.playPressed]} />
```

## No hardcoded pixels — CLAUDE.md rule 9

This is the rule the codebase currently violates most (`HomeScreen`, `WinScreen`
and `GameBoard` all hardcode sizes). Do not add to the debt.

Every number in a style comes from one of three places:

1. **A theme token** — `SPACING.md`, `CARD.width`, `CARD.radius`, `ANIMATION.*`
   in `constants/theme.ts`. Add a token rather than inventing a literal.
2. **A measurement** — `useWindowDimensions()`, never `Dimensions.get()`
   (which does not update on rotation or split view).
3. **A ratio of the above**, like the existing responsive card sizing:

   ```tsx
   const { width } = useWindowDimensions();
   const columns = width >= BREAKPOINT.tablet ? 4 : 3;
   const cardW = Math.min(CARD.width * 1.4, (width - gutter) / columns);
   ```

The app must scale from iPad mini to iPad Pro. A literal `160` is correct on
exactly one device.

## Toddler UX in the component layer

From `CLAUDE.md` and `docs/TODDLER_UX.md` — these are testable properties of what
you render:

- **Tap targets ≥ 90×90pt**, 110×110 recommended. Add `hitSlop` on top; it widens
  the touch area without changing layout.
- **No text in the play area.** The child cannot read. Emoji, icons, animation and
  sound only. `label` fields in `constants/cards.ts` are parent-facing.
- **Exactly one primary action per screen.** `HomeScreen` is the model: one giant
  button, nothing else competing for a tap.
- **`allowFontScaling={false}` on every emoji `<Text>`**, so system font scaling
  cannot break the layout.
- **`accessibilityRole="button"` + `accessibilityLabel`** on everything tappable.
  The child does not use VoiceOver — the reviewing parent might.

## Gestures

Use `react-native-gesture-handler`, not `TouchableOpacity`, for game interactions
(`docs/TECH_STACK.md`). Toddler taps are long and sloppy, hence `maxDuration`:

```tsx
const tap = Gesture.Tap()
  .maxDuration(10000)
  .onEnd((_e, success) => {
    'worklet';
    if (success) runOnJS(handle)();
  });
```

Never call `setState` from a gesture handler without `runOnJS` — it runs on the UI
thread and will crash or silently no-op.

## Testing components

Hooks carry the logic and the bulk of the test weight. Component tests are worth
writing when the component itself makes a decision — a layout branch, a
conditional render, a mapped callback:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';

it('renders one tile per card', () => {
  render(<GameBoard cards={cards} onFlip={jest.fn()} />);
  expect(screen.getAllByRole('button')).toHaveLength(cards.length);
});
```

Native modules are already mocked in `jest.setup.ts` (Skia renders as a `View`
with `testID="skia-*"`, Lottie as `testID="lottie"`, Reanimated resolves
animations instantly). Do not add per-file mocks for these.

Query by accessibility role and label — the same attributes rule 3 already
requires. Do not add `testID`s solely to make a test pass.

## Route files stay thin

`app/` files are wiring, not UI. `app/index.tsx` is seven lines and returns
`<HomeScreen />`. A route may consume a hook and map its events to feedback
(as `app/games/memory.tsx` does), but the rendering belongs in
`components/screens/`.

## Finish

Run the `verify` skill.
