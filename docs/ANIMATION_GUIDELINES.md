# ANIMATION_GUIDELINES.md

## Core principle
Animations for a 2-year-old must be:
- **Immediate** (< 100ms from tap to first visual response)
- **Exaggerated** (bigger than you think — toddlers need clear feedback)
- **Physical** (things bounce, snap, wobble — not just fade or slide)
- **Rewarding** (every correct action > a mini celebration)

## Library roles
| Library | Use for | Never use for |
|---|---|---|
| react-native-reanimated | All motion (flip, float, spring, scale) | Logic or state |
| @shopify/react-native-skia | Static texture rendering (wood grain), canvas effects | Anything that needs JS re-render |
| lottie-react-native | Pedro character animations (idle, celebrate, oops) | UI micro-interactions |
| expo-haptics | Physical feedback on every tap/match/mismatch | Background events |

## Reanimated patterns

### Floating character (idle Pedro)
```typescript
const y = useSharedValue(0);
useEffect(() => {
  y.value = withRepeat(
    withSequence(
      withTiming(-12, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      withTiming(12,  { duration: 1200, easing: Easing.inOut(Easing.sin) })
    ), -1, true
  );
}, []);
```

### Card flip (3D)
Two Animated.Views stacked. Front rotates -90→0, Back rotates 0→90.
Always use `perspective: 1000` and `backfaceVisibility: 'hidden'`.
Duration: 380ms open, 320ms close. Easing: Easing.out(Easing.cubic).

### Match pulse
```typescript
scale.value = withSequence(
  withTiming(1.12, { duration: 120 }),
  withSpring(1.0,  { damping: 8, stiffness: 200 })
);
```

### Spring snap (drag-to-correct)
```typescript
// On correct drop:
x.value = withSpring(targetX, { damping: 14, stiffness: 180 });
// On incorrect drop (bounce back):
x.value = withSpring(0, { damping: 10, stiffness: 220 });
```

## Haptics map
| Event | Haptic type |
|---|---|
| Card tap | ImpactFeedbackStyle.Light |
| Pair matched | NotificationFeedbackType.Success |
| Mismatch | NotificationFeedbackType.Error |
| Game won | ImpactFeedbackStyle.Heavy (x3, 150ms apart) |

## Skia wood grain pattern
Generate 7 quadratic bezier paths per card.
Each path uses the card's seed (derived from instanceId) for variation.
Colors: ['#D4956A','#C07840','#A85C2A','#B8703A','#D4956A']
Grain opacity: 0.09 (subtle, not cartoon)
Always add inner shadow for depth and drop shadow for elevation.

## Lottie files needed (source from lottiefiles.com, free license)
- `pedro-idle.json` — gentle floating/breathing, loop=true
- `pedro-celebrate.json` — jumping, stars, confetti, loop=false, 3–5s
- `pedro-oops.json` — head shake, gentle, loop=false, 1s
