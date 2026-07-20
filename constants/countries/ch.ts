// constants/countries/ch.ts
// Switzerland — the Matterhorn over alpine meadow and chalets.

import type { CountryData } from './types';

export const CH: CountryData = {
  code: 'ch',
  name: 'Switzerland',
  flag: '🇨🇭',
  locked: false,

  palette: {
    skyThere: ['#8FC9EE', '#CFE7F5'],
    skyBack: ['#1C2A44', '#0B152C'],
    ground: '#7FB06B',
    structure: '#A9764F',
    structureAlt: '#C69A6D',
    accent: '#D63B37',
  },

  items: [
    { id: 'mountain', role: 'monument', emoji: '🏔️', label: 'Montanha', tint: '#E2EAF0' },
    { id: 'cow', role: 'animal', emoji: '🐄', label: 'Vaca', tint: '#EFE7DC' },
    { id: 'chocolate', role: 'food', emoji: '🍫', label: 'Chocolate', tint: '#E0CBBA' },
    { id: 'watch', role: 'symbol', emoji: '⌚', label: 'Relógio', tint: '#DEE6EE' },
    { id: 'cheese', role: 'nature', emoji: '🧀', label: 'Queijo', tint: '#FCEBC0' },
  ],

  scene: [
    { kind: 'mountain', x: 0.34, scale: 1.7, variant: 'snow' },
    { kind: 'mountain', x: 0.62, scale: 1.2, variant: 'snow' },
    { kind: 'house', x: 0.16, scale: 0.85, variant: 'flat', fill: '#A9764F' },
    { kind: 'house', x: 0.82, scale: 0.8, variant: 'flat', fill: '#C69A6D' },
    { kind: 'field', x: 0.5, scale: 1 },
  ],

  music: { key: 'G', mode: 'lydian', timbre: 'bells', tempo: 66 },
};
