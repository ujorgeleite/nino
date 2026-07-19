// constants/theme.ts
export const COLORS = {
  skyBlue:      '#87CEEB',
  warmCream:    '#FFF0DC',
  peach:        '#FFE0B5',
  woodLight:    '#D4956A',
  woodMid:      '#C07840',
  woodDark:     '#8B4513',
  woodDarker:   '#6B3A2A',
  woodGrainRgba:'rgba(60, 20, 0, 0.09)',
  pedroOrange:  '#FF6B35',
  pedroBlue:    '#2196F3',
  successGreen: '#4CAF50',
  errorRed:     '#FF5252',
  white:        '#FFFFFF',
  textBrown:    '#3D2008',
  textLight:    '#C07030',
} as const;

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;

export const CARD = {
  width:        90,
  height:       120,
  radius:       14,
  margin:       6,
} as const;

export const ANIMATION = {
  flipOpen:      380,
  flipClose:     320,
  floatDuration: 1200,
  floatAmplitude:12,
  matchPulse:    120,
  winDelay:      400,
} as const;

export const HAPTICS_DELAY_MS = 50;
