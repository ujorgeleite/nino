// constants/countries/se.ts
// Sweden — red cottages in deep pine forest.

import type { CountryData } from './types';

export const SE: CountryData = {
  code: 'se',
  name: 'Sweden',
  flag: '🇸🇪',
  locked: false,

  palette: {
    skyThere: ['#A8D8EE', '#D9EDF5'],
    skyBack: ['#1B2A44', '#0A142B'],
    ground: '#6F9E5E',
    structure: '#B5433A',
    structureAlt: '#8F332C',
    accent: '#F2D64E',
  },

  items: [
    { id: 'house', role: 'monument', emoji: '🏠', label: 'Casinha', tint: '#F3D6D2' },
    { id: 'deer', role: 'animal', emoji: '🦌', label: 'Alce', tint: '#E8DCC8' },
    { id: 'bun', role: 'food', emoji: '🧁', label: 'Bolinho', tint: '#F8E2CE' },
    { id: 'ski', role: 'symbol', emoji: '⛷️', label: 'Esqui', tint: '#DDEAF4' },
    { id: 'pine', role: 'nature', emoji: '🌲', label: 'Pinheiro', tint: '#D4E6D4' },
  ],

  scene: [
    { kind: 'forest', x: 0.12, scale: 1.15 },
    { kind: 'house', x: 0.34, scale: 1.0, variant: 'pointed', fill: '#B5433A' },
    { kind: 'forest', x: 0.5, scale: 0.95 },
    { kind: 'house', x: 0.66, scale: 0.9, variant: 'pointed', fill: '#8F332C' },
    { kind: 'forest', x: 0.84, scale: 1.1 },
    { kind: 'water', x: 0.5, scale: 0.9 },
  ],

  music: { key: 'D', mode: 'dorian', timbre: 'harp', tempo: 60 },
};
