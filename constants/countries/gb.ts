// constants/countries/gb.ts
// United Kingdom — a clock tower, terraced houses, a river bridge.

import type { CountryData } from './types';

export const GB: CountryData = {
  code: 'gb',
  name: 'United Kingdom',
  flag: '🇬🇧',
  locked: false,

  palette: {
    skyThere: ['#A9C6D8', '#D9E6EC'],
    skyBack: ['#232C40', '#0F1728'],
    ground: '#7BA05B',
    structure: '#B08A6A',
    structureAlt: '#8C6A52',
    accent: '#C0392B',
  },

  items: [
    { id: 'bus', role: 'monument', emoji: '🚌', label: 'Ônibus', tint: '#F5D3D0' },
    { id: 'dog', role: 'animal', emoji: '🐕', label: 'Cachorro', tint: '#F0E0CE' },
    { id: 'tea', role: 'food', emoji: '🫖', label: 'Chá', tint: '#E7DFD3' },
    { id: 'crown', role: 'symbol', emoji: '👑', label: 'Coroa', tint: '#F7E7BE' },
    { id: 'umbrella', role: 'nature', emoji: '☂️', label: 'Guarda-chuva', tint: '#D9E2F0' },
  ],

  scene: [
    { kind: 'tower', x: 0.22, scale: 1.35, variant: 'clock' },
    { kind: 'house', x: 0.44, scale: 0.95, variant: 'flat', fill: '#B08A6A' },
    { kind: 'house', x: 0.53, scale: 0.95, variant: 'flat', fill: '#9C7659' },
    { kind: 'house', x: 0.62, scale: 0.95, variant: 'flat', fill: '#BF9A78' },
    { kind: 'bridge', x: 0.84, scale: 1.1 },
    { kind: 'water', x: 0.5, scale: 1 },
  ],

  music: { key: 'A', mode: 'mixolydian', instrument: 'whistle', tempo: 64 },
};
