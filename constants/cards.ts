// constants/cards.ts
// Travel-themed card pairs for Memory Match (see docs/PRODUCT.md).
// Emojis are placeholders; final assets will be custom Pedro-style illustrations.

export type CardContent = {
  id: string;
  emoji: string;
  label: string; // parent-facing only; never shown to the child in-game
};

export const TRAVEL_CARDS: readonly CardContent[] = [
  { id: 'plane',    emoji: '✈️', label: 'Avião' },
  { id: 'luggage',  emoji: '🧳', label: 'Mala' },
  { id: 'map',      emoji: '🗺️', label: 'Mapa' },
  { id: 'compass',  emoji: '🧭', label: 'Bússola' },
  { id: 'backpack', emoji: '🎒', label: 'Mochila' },
  { id: 'camera',   emoji: '📷', label: 'Câmera' },
] as const;

// A single card instance on the board (two per content id).
export type CardInstance = {
  instanceId: string; // unique per board slot, e.g. "plane-0"
  contentId: string;  // matches CardContent.id
  emoji: string;
};
