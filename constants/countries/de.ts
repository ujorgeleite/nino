// constants/countries/de.ts
// Germany — a fairy-tale castle above dark-green forest.

import type { CountryData } from './types';

export const DE: CountryData = {
  code: 'de',
  name: 'Germany',
  flag: '🇩🇪',
  locked: false,

  palette: {
    skyThere: ['#8FC7EA', '#C9E4F2'],
    skyBack: ['#1E2C46', '#0D172C'],
    ground: '#6E9E58',
    structure: '#E8E2D6',
    structureAlt: '#9AA7B5',
    accent: '#C0392B',
  },

  items: [
    { id: 'castle', role: 'monument', emoji: '🏰', label: 'Castelo', tint: '#E9E4DA' },
    { id: 'bear', role: 'animal', emoji: '🐻', label: 'Urso', tint: '#E4D3C3' },
    { id: 'pretzel', role: 'food', emoji: '🥨', label: 'Pretzel', tint: '#F2DCC0' },
    { id: 'car', role: 'symbol', emoji: '🚗', label: 'Carro', tint: '#DCE6F0' },
    { id: 'tree', role: 'nature', emoji: '🌲', label: 'Pinheiro', tint: '#D6E7D6' },
  ],

  scene: [
    { kind: 'mountain', x: 0.2, scale: 1.1, variant: 'snow' },
    { kind: 'castle', x: 0.42, scale: 1.3, variant: 'spired' },
    { kind: 'forest', x: 0.66, scale: 1.1 },
    { kind: 'forest', x: 0.84, scale: 0.9 },
    { kind: 'hill', x: 0.5, scale: 1 },
  ],

  music: { key: 'G', mode: 'major', timbre: 'bells', tempo: 68 },
};
