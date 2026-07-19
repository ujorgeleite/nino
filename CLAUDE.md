# CLAUDE.md — Pedrinho Travels
## Project harness — read this before every task

> ⚠️ Expo moves fast. Before writing native/Expo code, read the exact versioned
> docs for the installed SDK: https://docs.expo.dev/versions/v57.0.0/
> (This project runs **Expo SDK 57**, not SDK 51 — see TECH_STACK.md.)

### What this project is
A children's iPad game app named **Pedrinho Travels**.
The mascot is **Pedro**, a toddler boy with curly dark brown hair,
big expressive eyes, and chubby cheeks.
The theme is travel and adventure.

### Primary target user
**Age: 2 years old.**
This is non-negotiable. Every decision — tap target size, animation speed,
feedback intensity, session length, complexity — must be validated against
a 2-year-old user, not a 5-year-old.

Reference apps (study these before building any UI):
- **Sago Mini** series — gold standard for age 2. No fail states.
  Everything is explorable. Pure delight.
- **Toca Boca** series — open-ended play, no wrong answers.
- **Bimi Boo** — visual style reference, mini-game structure,
  one-time IAP model.

### Business model
- Free download: first 2 games unlocked
- One-time IAP: full unlock (all games). No subscription. No ads.
  (Apple Kids category forbids third-party ad networks)
- Target price: €4.99 one-time

### Tech stack (never change without updating TECH_STACK.md)
- Expo SDK 57 + React Native + TypeScript
- expo-router (file-based routing)
- react-native-reanimated (all animations — UI thread, 60fps)
- react-native-gesture-handler (all gestures)
- @shopify/react-native-skia (wood texture rendering, advanced graphics)
- lottie-react-native (Pedro mascot animations)
- expo-haptics (tactile feedback on every interaction)
- expo-audio (sound effects and background music)
- expo-keep-awake (prevent screen sleep during play)
- expo-linear-gradient (backgrounds)

### Folder conventions
- `app/` — screens (expo-router)
- `components/` — UI components grouped by domain
- `hooks/` — business logic, never put logic in components
- `constants/` — game content, theme tokens, sound refs
- `utils/` — pure functions (shuffle, math helpers)
- `docs/` — all spec and guideline files
- `assets/lottie/` — Lottie JSON files for Pedro animations
- `assets/sounds/` — MP3 files (wood-tap, match, no-match, win)

### Skills (`.claude/skills/`)
These encode the rules below as executable procedures. Use them.

| Skill | When |
|-------|------|
| `verify` | End of **every** change. Runs typecheck + lint + tests |
| `new-game` | Implementing a game from a spec in `docs/specs/` |
| `game-logic-hook` | Creating or editing anything in `hooks/` |
| `ui-component` | Creating or editing anything in `components/` or `app/` |
| `motion` | Reanimated, Skia, Lottie, haptics, audio |
| `toddler-ux-review` | Before calling a feature done |
| `sync-design-tokens` | Changing tokens in `constants/` or the design docs |

### Quality gate
```bash
npm run verify   # tsc --noEmit && eslint . && jest
```
Nothing is done until this passes. CI runs it on every PR.

### How to add a new game
1. Read `docs/GAME_SPEC_TEMPLATE.md`
2. Create a spec file at `docs/specs/GAME_[NAME].md`
   following the template exactly
3. Drop the spec in a Claude Code message:
   "Implement the spec at docs/specs/GAME_[NAME].md"
4. Claude Code implements it via the `new-game` skill.

### Non-negotiable rules (never violate)
1. **No text instructions in-game.** Child cannot read.
   Use icons, animations, and audio cues only.
2. **No fail punishment.** Wrong answer = gentle animation + try again.
   Never remove lives, never show sad faces for mistakes.
3. **Tap targets minimum 90x90pt.** Toddler fingers are imprecise.
4. **Every tap must have haptic + sound within 100ms.**
   Delayed feedback breaks toddler attention.
5. **Session design: 3–5 minutes max.** Games must be completable
   in one short sitting.
6. **Landscape only.** iPad is held horizontally.
7. **100% offline.** Works on airplane with no WiFi.
8. **No in-game purchases visible to child.**
   IAP only accessible through "Parents" section with parental gate.
9. **useWindowDimensions() always.** Never hardcode pixel values.
   Must scale from iPad mini to iPad Pro.
10. **Celebration always louder than failure.**
    Win animations last 3–5 seconds minimum.
