// constants/countries/at.ts
// Austria — a baroque palace with a domed church against alpine slopes.

import type { CountryData } from './types';

export const AT: CountryData = {
  code: 'at',
  name: 'Austria',
  flag: '🇦🇹',
  locked: false,

  palette: {
    skyThere: ['#9CCFEE', '#D6E9F5'],
    skyBack: ['#202C48', '#0E182F'],
    ground: '#79A866',
    structure: '#E8D9B8',
    structureAlt: '#C9B48C',
    accent: '#2E7FDF',
  },

  items: [
    { id: 'castle', role: 'monument', emoji: '🏰', label: 'Castelo', tint: '#EDE4D2' },
    { id: 'horse', role: 'animal', emoji: '🐎', label: 'Cavalo', tint: '#E6D8C6' },
    { id: 'apple', role: 'food', emoji: '🍎', label: 'Maçã', tint: '#F7D6D2' },
    { id: 'violin', role: 'symbol', emoji: '🎻', label: 'Violino', tint: '#EDDCC4' },
    { id: 'mountain', role: 'nature', emoji: '🏔️', label: 'Montanha', tint: '#E2EAF0' },
  ],

  scene: [
    { kind: 'mountain', x: 0.14, scale: 1.25, variant: 'snow' },
    { kind: 'castle', x: 0.42, scale: 1.25 },
    { kind: 'dome', x: 0.66, scale: 1.05 },
    { kind: 'forest', x: 0.86, scale: 0.9 },
    { kind: 'hill', x: 0.5, scale: 1 },
  ],

  music: { key: 'C', mode: 'major', timbre: 'harp', tempo: 68 },
};
