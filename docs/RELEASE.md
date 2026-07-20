# Shipping There & Back

What is done, what is yours, and what is deliberately not built yet.

## The build is configured

`eas.json` has four profiles: `development` and `device` (dev client),
`preview` (simulator), and `production`. `appVersionSource` is `remote` with
`autoIncrement`, so the build number comes from EAS and a second upload cannot
collide with the first.

`app.json` carries everything Apple checks that a config can carry, and each
item was verified against a *regenerated* native project rather than by
reading the file:

| Setting | Why |
|---|---|
| `privacyManifests` | Required since May 2024; upload is rejected without it |
| `UISupportedInterfaceOrientations~ipad` | Expo's `orientation: landscape` only writes the iPhone key, so iPad could rotate into a layout that was never designed |
| `requireFullScreen: true` | Otherwise iPad multitasking must support all four orientations, which contradicts the line above |
| `usesNonExemptEncryption: false` | Without it every TestFlight build stalls on export compliance |
| `expo-audio` `microphonePermission: false` | An unused microphone declaration is a reliable Kids-category rejection |
| `expo-audio` `enableBackgroundPlayback: false` | Same, for an unused background-audio mode |

**`ios/` is gitignored on purpose** (Continuous Native Generation). Anything
edited there survives exactly until the next `prebuild` and never reaches an
EAS build, which runs on a clean checkout. Native changes go in `app.json` or
`plugins/withIosBuildFixes.js` — nowhere else.

## What is yours

- **Apple credentials.** `eas.json` has no `submit` block: `eas submit` prompts
  for the Apple ID, team and App Store Connect app ID and can store them. A
  block full of placeholder strings would only fail confusingly.
- **App Store Connect metadata**: age rating **4+**, "Made for Kids", age band
  0–5, Data Collection = **Data Not Collected**, and a **hosted privacy-policy
  URL**. ASC requires a URL even though the policy is in the app; keep the two
  saying the same thing — `components/screens/PrivacyNotice.tsx` is the source.
- **Bundle identifier.** Still `com.pedrinhotravels.app` from the old name.
  Users never see it and it cannot be changed after the first submission, so
  decide before the first upload, not after.

## In-app purchase is not built

`CLAUDE.md` describes a €4.99 one-time unlock. None of it exists: no store
library, no product, no entitlement, no Restore Purchases button (Apple
mandates one for non-consumables), and `GameCard`'s `locked` prop is never set.

This does not block shipping — **the app is submittable today as a free app**,
and both existing games are the two that were always meant to be free. Charging
needs a third game worth paying for first.

When that work starts, note that `npm run check:offline` will fail on a store
SDK that bundles analytics. That is the point: `ParentPanel` and
`PrivacyNotice` promise parents that nothing leaves the device, so adding one
means changing those promises and the ASC privacy declaration deliberately,
rather than discovering later that the app quietly started collecting data
about a child.

## Before handing it to a 2-year-old

`make verify` covers typecheck, lint, the worklet/jest/bundle/offline guards
and 592 unit tests. `npx playwright test` covers iPad, iPhone and iPhone SE
landscape.

Two things CI cannot see, because Playwright drives the **web export**:

1. **Worklet boundaries.** A worklet calling a non-worklet works on web and
   crashes on device. `npm run check:worklets` exists for this.
2. **Yoga vs CSS layout.** Padding offsets absolutely-positioned children in
   Yoga but not in CSS, so a scene layer can be inset on device and perfect in
   every test. This has already happened once — see the comment at the top of
   `app/games/puzzle/[country].tsx`.

So the first real device run is a genuine test, not a formality. Watch for
anything inset, clipped, or invisible.
