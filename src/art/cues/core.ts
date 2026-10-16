import { CueCatalog } from './types';

/**
 * Cues that are not tied to one word unit: the ten map badges and a few
 * generic pictures used when a cue key is missing or a brand new school word
 * has no picture yet.
 */

export const CORE_CUES: CueCatalog = {
  // Unit badges on the spelling trail.
  'sound-it-out': { name: 'sprout', tone: 'mint' },
  'two-letters-one-sound': { name: 'speaker', tone: 'sky' },
  'blend-starters': { name: 'shoe-prints', pack: 'fa6', tone: 'sand' },
  'tricky-letter-teams': { name: 'bone', tone: 'stone' },
  'magic-e': { name: 'shimmer', tone: 'sun' },
  'vowel-teams': { name: 'rainbow', pack: 'fa6', tone: 'grape' },
  'bossy-r': { name: 'paw', tone: 'coral' },
  'bigger-words': { name: 'crane', tone: 'sand' },
  'heart-words': { name: 'heart', tone: 'rose' },
  'kaiju-summit': { name: 'dragon', pack: 'fa6', tone: 'coral' },

  // Generic fallbacks.
  word: { name: 'book-open-variant', tone: 'stone' },
  star: { name: 'star-four-points', tone: 'sun' },
  egg: { name: 'egg', tone: 'sand' },
  crown: { name: 'crown', tone: 'sun' },
};
