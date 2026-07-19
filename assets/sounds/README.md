# assets/sounds/README.md
## Required sound files

All sounds must be MP3, < 500ms, normalized to -12 LUFS.

| Filename | Description | Source suggestion |
|---|---|---|
| wood-tap.mp3 | Single wood knock, dry | freesound.org: "wood knock" |
| wood-match.mp3 | Two wood pieces clicking + bright chime | freesound.org: "wooden hit" |
| wood-no-match.mp3 | Soft boing/spring, NOT a buzzer | freesound.org: "boing spring" |
| win-fanfare.mp3 | 3–4 second kids fanfare/cheer | freesound.org: "kids cheer fanfare" |
| bg-music.mp3 | Gentle loop, xylophone/glockenspiel, < 2MB | freesound.org: "kids background loop" |

## Free sources
- https://freesound.org (CC0 license — no attribution needed)
- https://pixabay.com/music (free for commercial use)
- https://soundsnap.com (paid but high quality)

## Implementation
All sounds are referenced in constants/sounds.ts.
Never hardcode require() paths in components.
Until the MP3 files are added here, the entries in constants/sounds.ts are
`null` and the audio layer is a safe no-op (the app still runs).
