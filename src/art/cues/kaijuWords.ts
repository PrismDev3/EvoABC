import { CueCatalog } from './types';

/**
 * Picture cues for the long kaiju and dinosaur words. The beasts are long
 * words, so every picture has to read at a glance: a dinosaur, a horned
 * creature, a lightning bolt.
 */

export const KAIJU_CUES: CueCatalog = {
  'kaiju-summit': { name: 'dragon', pack: 'fa6', tone: 'coral' },
  dinosaur: { name: 'dragon', pack: 'fa6', tone: 'mint' },
  roar: { name: 'bullhorn', tone: 'sun' },
  fangs: { name: 'tooth', tone: 'stone' },
  horns: { name: 'unicorn', tone: 'grape' },
  scales: { name: 'snake', tone: 'mint' },
  spikes: { name: 'cactus', tone: 'mint' },
  titan: { name: 'monument', pack: 'fa6', tone: 'stone' },
  kaiju: { name: 'optin-monster', pack: 'fa6', tone: 'coral' },
  raptor: { name: 'bird', tone: 'sky' },
  claws: { name: 'paw', tone: 'sand' },
  thunder: { name: 'weather-lightning', tone: 'sun' },
  monster: { name: 'ghost', tone: 'grape' },
};
