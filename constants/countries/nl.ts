// constants/countries/nl.ts
// The Netherlands — the reference country. Its scene must still read as canal
// houses, a windmill and water after the move to data-driven rendering.

import type { CountryData } from './types';

export const NL: CountryData = {
  code: 'nl',
  name: 'Netherlands',
  flag: '🇳🇱',
  locked: false,

  palette: {
    skyThere: ['#8EC9F5', '#BCE0FA'],
    skyBack: ['#22304F', '#0F1B36'],
    ground: '#7FB069',
    structure: '#D9695A',
    structureAlt: '#5AA0EC',
    accent: '#F6C445',
  },

  items: [
    { id: 'tulip', role: 'nature', emoji: '🌷', label: 'Tulipa', tint: '#F7D6DE' },
    { id: 'cheese', role: 'food', emoji: '🧀', label: 'Queijo', tint: '#FCEBC0' },
    { id: 'bicycle', role: 'symbol', emoji: '🚲', label: 'Bicicleta', tint: '#D6E7F7' },
    { id: 'boat', role: 'monument', emoji: '⛵', label: 'Barco', tint: '#D8EFE4' },
    { id: 'cow', role: 'animal', emoji: '🐄', label: 'Vaca', tint: '#EFE7DC' },
  ],

  // A row of gabled canal houses, the windmill standing apart, water in front.
  scene: [
    { kind: 'windmill', x: 0.12, scale: 1.15 },
    { kind: 'house', x: 0.36, scale: 0.95, variant: 'stepped', fill: '#D9695A' },
    { kind: 'house', x: 0.46, scale: 1.05, variant: 'pointed', fill: '#E7A24E' },
    { kind: 'house', x: 0.56, scale: 0.9, variant: 'stepped', fill: '#5AA0EC' },
    { kind: 'house', x: 0.66, scale: 1.0, variant: 'pointed', fill: '#EADBC2' },
    { kind: 'house', x: 0.76, scale: 0.92, variant: 'stepped', fill: '#2E9E6B' },
    { kind: 'house', x: 0.86, scale: 1.02, variant: 'pointed', fill: '#F6C445' },
    { kind: 'water', x: 0.5, scale: 1 },
  ],

  music: { key: 'C', mode: 'major', instrument: 'carillon', tempo: 72 },
};
