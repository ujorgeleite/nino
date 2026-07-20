// constants/countries/be.ts
// Belgium — a castle keep, a townhouse row, gentle woods.

import type { CountryData } from './types';

export const BE: CountryData = {
  code: 'be',
  name: 'Belgium',
  flag: '🇧🇪',
  locked: false,

  palette: {
    skyThere: ['#9AD0F0', '#CFE7F7'],
    skyBack: ['#22304F', '#101B33'],
    ground: '#86B073',
    structure: '#C1876B',
    structureAlt: '#8E6B52',
    accent: '#F2C14E',
  },

  items: [
    { id: 'castle', role: 'monument', emoji: '🏰', label: 'Castelo', tint: '#E7DDD0' },
    { id: 'cat', role: 'animal', emoji: '🐈', label: 'Gato', tint: '#F3E2D6' },
    { id: 'waffle', role: 'food', emoji: '🧇', label: 'Waffle', tint: '#F9E4BC' },
    { id: 'chocolate', role: 'symbol', emoji: '🍫', label: 'Chocolate', tint: '#E0CBBA' },
    { id: 'fries', role: 'nature', emoji: '🍟', label: 'Batata frita', tint: '#FBE9C7' },
  ],

  scene: [
    { kind: 'forest', x: 0.08, scale: 0.9 },
    { kind: 'castle', x: 0.28, scale: 1.2 },
    { kind: 'house', x: 0.52, scale: 0.95, variant: 'stepped', fill: '#C1876B' },
    { kind: 'house', x: 0.62, scale: 1.0, variant: 'pointed', fill: '#A8785C' },
    { kind: 'house', x: 0.72, scale: 0.9, variant: 'stepped', fill: '#D9A47A' },
    { kind: 'bridge', x: 0.88, scale: 1.0 },
    { kind: 'water', x: 0.5, scale: 1 },
  ],

  music: { key: 'F', mode: 'major', instrument: 'marimba', tempo: 70 },
};
