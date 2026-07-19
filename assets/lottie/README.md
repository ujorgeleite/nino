# assets/lottie/README.md
## Required Lottie animation files

| Filename | Description | Loop | Duration |
|---|---|---|---|
| pedro-idle.json | Pedro floating gently, happy expression | true | 2–3s |
| pedro-celebrate.json | Pedro jumping, stars, confetti burst | false | 3–5s |
| pedro-oops.json | Pedro head shake, gentle, no sadness | false | 1s |
| pedro-thinking.json | Pedro looking curious, finger on chin | true | 2s |

## Free sources
- https://lottiefiles.com (filter by "Free" license)
  - Search "kid celebrate", "child happy", "character float"
  - Download as Lottie JSON

## Placeholder
Until custom Pedro Lottie files are ready, use free equivalents from
lottiefiles.com with matching mood. Pedro's custom animations will be
commissioned alongside the final mascot illustration.

Right now components/mascot/PedroMascot.tsx renders a floating emoji
placeholder so the app runs with zero setup. Swap it for <LottieView>
once these JSON files exist.

## Usage pattern
```typescript
import LottieView from 'lottie-react-native';

<LottieView
  source={require('./pedro-celebrate.json')}
  autoPlay
  loop={false}
  style={{ width: 160, height: 160 }}
  resizeMode="cover"
/>
```
