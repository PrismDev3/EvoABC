import { WordEntry, WordTag } from '../types';
import { RegionSeed } from './wordSeed';

import { SHORT_VOWEL_REGIONS } from './units/shortVowels';
import { LETTER_TEAM_REGIONS } from './units/letterTeams';
import { BLEND_REGIONS } from './units/blends';
import { TRICKY_REGIONS } from './units/trickyTeams';
import { MAGIC_E_REGIONS } from './units/magicE';
import { VOWEL_TEAM_REGIONS } from './units/vowelTeams';
import { BOSSY_R_REGIONS } from './units/bossyR';
import { BIGGER_WORD_REGIONS } from './units/biggerWords';
import { HEART_WORD_REGIONS } from './units/heartWords';
import { KAIJU_REGIONS } from './units/kaijuWords';

/**
 * The whole teaching trail, in the order a 1st grader should meet it: short
 * vowels first, then letter teams, blends, the tricky quiet letters, magic e,
 * vowel teams, bossy r, bigger words, heart words and finally the long kaiju
 * words. Each unit file owns its own word bank so the curriculum can grow
 * without touching this file.
 */

export type { RegionSeed } from './wordSeed';
export { UNITS, findUnit, w } from './wordSeed';

export const REGION_SEEDS: RegionSeed[] = [
  ...SHORT_VOWEL_REGIONS,
  ...LETTER_TEAM_REGIONS,
  ...BLEND_REGIONS,
  ...TRICKY_REGIONS,
  ...MAGIC_E_REGIONS,
  ...VOWEL_TEAM_REGIONS,
  ...BOSSY_R_REGIONS,
  ...BIGGER_WORD_REGIONS,
  ...HEART_WORD_REGIONS,
  ...KAIJU_REGIONS,
];

export const ALL_WORDS: WordEntry[] = REGION_SEEDS.flatMap((region) => region.words);

export const TAG_LABELS: Record<WordTag, string> = {
  cvc: 'Sound it out',
  sight: 'Heart words',
  blend: 'Blends',
  digraph: 'Letter teams',
  silent: 'Quiet letters',
  magicE: 'Magic e',
  vowelteam: 'Vowel teams',
  bossyR: 'Bossy r',
  ending: 'Word endings',
  compound: 'Compound words',
  dino: 'Dino words',
};

/** Every word in the bank, mapped for fast lookup. */
export const WORD_LOOKUP: Record<string, WordEntry> = ALL_WORDS.reduce<Record<string, WordEntry>>((map, entry) => {
  if (map[entry.word] === undefined) map[entry.word] = entry;
  return map;
}, {});

export function lookupWord(word: string): WordEntry | null {
  return WORD_LOOKUP[word.toUpperCase()] ?? null;
}

export const TAG_ORDER: WordTag[] = [
  'cvc',
  'digraph',
  'blend',
  'silent',
  'magicE',
  'vowelteam',
  'bossyR',
  'ending',
  'compound',
  'sight',
  'dino',
];
