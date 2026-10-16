import { CueCatalog } from './types';

/**
 * Picture cues for the magic e words. Every icon name here was checked against
 * scripts/icon-names.txt, so none of them can render as an empty box.
 */

export const MAGIC_E_CUES: CueCatalog = {
  'magic-volcano': { name: 'shimmer', tone: 'grape' },
  cake: { name: 'cake-variant' },
  bike: { name: 'bike' },
  note: { name: 'note-text' },
  // Neither pack ships a strip of sticky tape, so this is the FontAwesome one.
  tape: { name: 'tape', pack: 'fa6' },
  kite: { name: 'kite' },
  house: { name: 'home-variant' },
  'ice-cube': { name: 'cube-outline', tone: 'sky' },
  dice: { name: 'dice-5' },
  'pine-tree': { name: 'pine-tree' },
  // A coiled rope reads as "a thick cord for pulling and tying".
  rope: { name: 'lasso' },
};
