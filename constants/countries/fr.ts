// constants/countries/fr.ts
// France — the lattice tower, a domed pavilion, poplar rows.

import type { CountryData } from './types';

export const FR: CountryData = {
  code: 'fr',
  name: 'France',
  flag: '🇫🇷',
  locked: false,

  palette: {
    skyThere: ['#A8D3F0', '#DCEBF5'],
    skyBack: ['#26314F', '#111B33'],
    ground: '#8FB37A',
    structure: '#B9A88F',
    structureAlt: '#D8CBB4',
    accent: '#2E5FA3',
  },

  items: [
    { id: 'tower', role: 'monument', emoji: '🗼', label: 'Torre', tint: '#DDE5EF' },
    { id: 'rooster', role: 'animal', emoji: '🐓', label: 'Galo', tint: '#F6DCD2' },
    { id: 'croissant', role: 'food', emoji: '🥐', label: 'Croissant', tint: '#F8E3C2' },
    { id: 'balloon', role: 'symbol', emoji: '🎈', label: 'Balão', tint: '#F5D8DE' },
    { id: 'baguette', role: 'nature', emoji: '🥖', label: 'Baguete', tint: '#F3E0BE' },
  ],

  scene: [
    { kind: 'tower', x: 0.3, scale: 1.5, variant: 'lattice' },
    { kind: 'dome', x: 0.55, scale: 1.0 },
    { kind: 'house', x: 0.7, scale: 0.85, variant: 'pointed', fill: '#D8CBB4' },
    { kind: 'house', x: 0.79, scale: 0.9, variant: 'pointed', fill: '#C7B79B' },
    { kind: 'bridge', x: 0.92, scale: 0.9 },
    { kind: 'water', x: 0.5, scale: 1 },
  ],

  music: { key: 'D', mode: 'lydian', instrument: 'accordion', tempo: 66 },
};
