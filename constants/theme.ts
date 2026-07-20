// constants/theme.ts
// WOOD SUB-SYSTEM — the procedural wood ramp, kept for components/cards/WoodCard.tsx.
//
// ⚠️ NOT the design system. `constants/nino.ts` is the source of truth for every
// visual token in the running app; see docs/DESIGN_SYSTEM.md.
//
// STATUS: nothing in the shipped app imports this today. It survives alongside
// WoodCard.tsx because the Skia procedural wood is better than the flat
// gradient the Shape Fit board currently draws (components/shapefit/WoodBoard.tsx
// defines its own WOOD_* locally), and migrating that board to Skia is a real
// option. If that migration happens, fold these tokens into WoodBoard and
// delete this file. If it is ruled out, delete both this and WoodCard.tsx.

export const COLORS = {
  woodLight: '#D4956A',
  woodMid: '#C07840',
  woodDark: '#8B4513',
  woodDarker: '#6B3A2A',
  woodGrainRgba: 'rgba(60, 20, 0, 0.09)',
} as const;

export const CARD = {
  width: 90,
  height: 120,
  radius: 14,
  margin: 6,
} as const;
