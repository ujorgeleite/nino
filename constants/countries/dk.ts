// constants/countries/dk.ts
// Denmark — a harbour: coloured quayside houses, a spire, the sea.

import type { CountryData } from './types';

export const DK: CountryData = {
  code: 'dk',
  name: 'Denmark',
  flag: '🇩🇰',
  locked: false,

  palette: {
    skyThere: ['#9FD2EE', '#D5E9F5'],
    skyBack: ['#1F2C48', '#0C162E'],
    ground: '#84AE7A',
    structure: '#E4785E',
    structureAlt: '#F2C14E',
    accent: '#2E7FDF',
  },

  items: [
    { id: 'mermaid', role: 'monument', emoji: '🧜‍♀️', label: 'Sereia', tint: '#D6E9F2' },
    { id: 'duck', role: 'animal', emoji: '🦆', label: 'Pato', tint: '#E8E2CE' },
    { id: 'cake', role: 'food', emoji: '🍰', label: 'Bolo', tint: '#F8DEE4' },
    { id: 'candle', role: 'symbol', emoji: '🕯️', label: 'Vela', tint: '#F7E9CE' },
    { id: 'bicycle', role: 'nature', emoji: '🚲', label: 'Bicicleta', tint: '#D9E4F2' },
  ],

  scene: [
    { kind: 'tower', x: 0.16, scale: 1.1, variant: 'spire' },
    { kind: 'house', x: 0.38, scale: 0.9, variant: 'pointed', fill: '#E4785E' },
    { kind: 'house', x: 0.48, scale: 1.0, variant: 'pointed', fill: '#F2C14E' },
    { kind: 'house', x: 0.58, scale: 0.92, variant: 'pointed', fill: '#5AA0EC' },
    { kind: 'house', x: 0.68, scale: 0.96, variant: 'pointed', fill: '#7FB069' },
    { kind: 'water', x: 0.5, scale: 1.15 },
  ],

  music: { key: 'F', mode: 'lydian', instrument: 'musicBox', tempo: 62 },
};
