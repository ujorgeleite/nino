// constants/countries/no.ts
// Norway — a fjord: steep snow peaks dropping straight into deep water.

import type { CountryData } from './types';

export const NO: CountryData = {
  code: 'no',
  name: 'Norway',
  flag: '🇳🇴',
  locked: false,

  palette: {
    skyThere: ['#9FCDE8', '#D2E6F0'],
    skyBack: ['#1A2740', '#091327'],
    ground: '#5E8A63',
    structure: '#8FA3B0',
    structureAlt: '#6E8493',
    accent: '#E8EEF2',
  },

  items: [
    { id: 'ship', role: 'monument', emoji: '⛵', label: 'Barco', tint: '#D9E6F0' },
    { id: 'reindeer', role: 'animal', emoji: '🦌', label: 'Rena', tint: '#E4DCCC' },
    { id: 'fish', role: 'food', emoji: '🐟', label: 'Peixe', tint: '#D6E9EE' },
    { id: 'snow', role: 'symbol', emoji: '❄️', label: 'Neve', tint: '#E8F0F6' },
    { id: 'mountain', role: 'nature', emoji: '🏔️', label: 'Montanha', tint: '#DFE6EC' },
  ],

  scene: [
    { kind: 'mountain', x: 0.18, scale: 1.5, variant: 'snow' },
    { kind: 'mountain', x: 0.42, scale: 1.25, variant: 'snow' },
    { kind: 'mountain', x: 0.68, scale: 1.4, variant: 'snow' },
    { kind: 'house', x: 0.86, scale: 0.7, variant: 'pointed', fill: '#B5433A' },
    { kind: 'water', x: 0.5, scale: 1.25 },
  ],

  music: { key: 'A', mode: 'dorian', instrument: 'bowedFolk', tempo: 60 },
};
