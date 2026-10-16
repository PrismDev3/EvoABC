import { CueCatalog } from './types';

/**
 * Picture cues for the heart words. These words cannot be sounded out, so the
 * picture stands for the meaning in the hint sentence instead of the spelling.
 */

export const HEART_WORD_CUES: CueCatalog = {
  // Word Forest region badge and THE.
  'open-book': { name: 'book-open-variant' },
  'plus-sign': { name: 'plus' },
  'waving-hand': { name: 'hand-wave' },
  rewind: { name: 'rewind' },
  gift: { name: 'gift' },
  friends: { name: 'account-group' },
  boy: { name: 'human-male-child' },
  girl: { name: 'human-female-girl' },
  'speech-bubble': { name: 'comment-text' },
  handshake: { name: 'handshake' },
  backpack: { name: 'bag-personal' },
  'wish-star': { name: 'star-four-points' },

  // Raptor Cliffs region badge.
  feather: { name: 'feather' },
  compass: { name: 'compass' },
  'come-here': { name: 'human-handsup' },
  'bowl-of-food': { name: 'bowl' },
  'question-mark': { name: 'help-circle-outline' },
  'map-pin': { name: 'map-marker' },
  'treasure-map': { name: 'map' },
  'strong-arm': { name: 'arm-flex' },
  'thinking-face': { name: 'head-question-outline' },
  'thumbs-up': { name: 'thumb-up' },
  'do-again': { name: 'repeat' },
  'big-blast': { name: 'explosion', pack: 'fa6' },
  'one-finger': { name: 'numeric-1' },
};
