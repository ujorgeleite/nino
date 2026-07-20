# GAME_SPEC_TEMPLATE.md
## Copy this file to docs/specs/GAME_[NAME].md to add a new game

---

# Game Spec: [GAME NAME]

## Summary
One sentence. What does the child do?

## Target age
2 years (always validate against toddler UX rules in TODDLER_UX.md)

## Reference
Which existing app does this resemble? (e.g. Sago Mini, Bimi Boo)
Link or describe the mechanic to mirror.

## Mechanic
Describe the core interaction loop in plain English.
Example: "Child drags a clothing item from a pile to the correct slot
in a suitcase. Correct slot glows. Nino reacts."

## Gestures used
- [ ] Tap
- [ ] Drag (specify axis: x / y / free)
- [ ] Long press (avoid for age 2)

## Content / pairs
List all game content:
| ID | Asset | Label |
|---|---|---|
| item1 | emoji/PNG | Label |

## Nino reactions
- **On correct action:** [describe animation + sound]
- **On incorrect action:** [describe animation + sound]
- **On game complete:** [describe animation + sound, minimum 3 seconds]

## Screen layout
Describe position of:
- Nino mascot
- Game board / play area
- Score or progress indicator (if any)

## Unlock state
- [ ] Free (included in free tier)
- [ ] Paid (requires IAP unlock)

## File to create
`app/games/[name].tsx`

## Components needed
List any new components. Reuse existing ones where possible.

## Estimated dev time
[X days] for one engineer familiar with the codebase.
