# DESIGN_SYSTEM.md

## Color tokens (defined in constants/theme.ts)
```typescript
export const COLORS = {
  // Backgrounds
  skyBlue:       '#87CEEB',
  warmCream:     '#FFF0DC',
  peach:         '#FFE0B5',

  // Wood palette (Skia cards)
  woodLight:     '#D4956A',
  woodMid:       '#C07840',
  woodDark:      '#8B4513',
  woodDarker:    '#6B3A2A',
  woodGrain:     'rgba(60, 20, 0, 0.09)',

  // Accent
  pedroOrange:   '#FF6B35',
  pedroBlue:     '#2196F3',
  successGreen:  '#4CAF50',
  white:         '#FFFFFF',

  // Text
  textBrown:     '#3D2008',
  textLight:     '#C07030',
};
```

## Typography
- Font: system default rounded (no Google Fonts dependency)
- All in-game text is for parents only (scores, settings)
- Child-facing UI uses icons and illustrations only

## Card dimensions
- Width: 90pt, Height: 120pt, Border radius: 14pt
- Margin between cards: 6pt
- Grid: 4 columns on iPad, 3 columns on iPhone

## Spacing scale
- xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48

## Shadows (wood cards)
- Drop shadow: dx=0, dy=5, blur=10, color=rgba(40,15,0,0.4)
- Inner highlight: dx=0, dy=-1, blur=3, color=rgba(255,200,120,0.3)

## Animation timing
- Card flip: 380ms ease-out (open), 320ms ease-in (close)
- Card spring snap: withSpring({ damping: 14, stiffness: 180 })
- Pedro float: 1200ms sine in-out, loop infinite, amplitude 12pt
- Win celebration: Lottie, 3–5 seconds, autoPlay loop=false
- Match pulse: scale 1.0 → 1.12 → 1.0, 200ms
