// constants/countries/it.ts
// Italy — the amphitheatre, a leaning tower, cypress hills.

import type { CountryData } from './types';

export const IT: CountryData = {
  code: 'it',
  name: 'Italy',
  flag: '🇮🇹',
  locked: false,

  palette: {
    skyThere: ['#8FCCEE', '#F0DFC0'],
    skyBack: ['#2A2B45', '#12142B'],
    ground: '#9FAE62',
    structure: '#D9B98C',
    structureAlt: '#C09A6B',
    accent: '#C0392B',
  },

  items: [
    { id: 'colosseum', role: 'monument', emoji: '🏛️', label: 'Coliseu', tint: '#EDE0CC' },
    { id: 'cat', role: 'animal', emoji: '🐈', label: 'Gato', tint: '#F3E2D6' },
    { id: 'pizza', role: 'food', emoji: '🍕', label: 'Pizza', tint: '#F8DCC2' },
    { id: 'gondola', role: 'symbol', emoji: '🛶', label: 'Gôndola', tint: '#DAE6EE' },
    { id: 'gelato', role: 'nature', emoji: '🍦', label: 'Sorvete', tint: '#F7E6EA' },
  ],

  scene: [
    { kind: 'columns', x: 0.28, scale: 1.35 },
    { kind: 'tower', x: 0.56, scale: 1.15, variant: 'leaning' },
    { kind: 'forest', x: 0.74, scale: 0.85, variant: 'cypress' },
    { kind: 'house', x: 0.88, scale: 0.85, variant: 'flat', fill: '#D9B98C' },
    { kind: 'hill', x: 0.5, scale: 1 },
  ],

  music: { key: 'F', mode: 'major', timbre: 'marimba', tempo: 74 },
};
