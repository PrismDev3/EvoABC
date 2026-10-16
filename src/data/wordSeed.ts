import { RegionRule, Unit, WordEntry, WordTag } from '../types';

/**
 * The shared shape every word unit file uses. Keeping the contract here means
 * the curriculum can grow one unit at a time without touching the aggregation.
 */

export interface RegionSeed {
  /** Stable id, also used to build level ids such as r_sh_l3. */
  id: string;
  /** Unit id from UNITS below. */
  unit: string;
  name: string;
  blurb: string;
  tag: WordTag;
  /** Picture cue key from src/art/cues. */
  cue: string;
  gradient: [string, string];
  accent: string;
  rule: RegionRule;
  /** Between eight and twelve words, all real 1st grade words. */
  words: WordEntry[];
}

/** Word helper: focus marks the letters that carry the pattern, silent marks the quiet ones. */
export function w(
  word: string,
  tag: WordTag,
  cue: string,
  hint: string,
  extra: Partial<WordEntry> = {},
): WordEntry {
  return { word: word.toUpperCase(), tag, cue, hint, ...extra };
}

export const UNITS: Unit[] = [
  { id: 'u1', title: 'Sound It Out', blurb: 'Three sound words with short vowels', cue: 'sound-it-out' },
  { id: 'u2', title: 'Two Letters, One Sound', blurb: 'sh, ch, th, wh and ck', cue: 'two-letters-one-sound' },
  { id: 'u3', title: 'Blend Starters', blurb: 'st, br, fl and friends', cue: 'blend-starters' },
  { id: 'u4', title: 'Tricky Letter Teams', blurb: 'ph says f, plus silent k, w and b', cue: 'tricky-letter-teams' },
  { id: 'u5', title: 'Magic e', blurb: 'The silent e that makes a vowel say its name', cue: 'magic-e' },
  { id: 'u6', title: 'Vowel Teams', blurb: 'ai, ay, ee, ea, oa, oo, ou and oi', cue: 'vowel-teams' },
  { id: 'u7', title: 'Bossy R', blurb: 'ar, or, er, ir and ur', cue: 'bossy-r' },
  { id: 'u8', title: 'Bigger Words', blurb: 'ing endings, twin letters and compound words', cue: 'bigger-words' },
  { id: 'u9', title: 'Heart Words', blurb: 'Words we learn by heart', cue: 'heart-words' },
  { id: 'u10', title: 'Kaiju Summit', blurb: 'Long dinosaur and monster words', cue: 'kaiju-summit' },
];

export function findUnit(unitId: string): Unit {
  return UNITS.find((unit) => unit.id === unitId) ?? UNITS[0];
}
