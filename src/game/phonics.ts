import { WordEntry } from '../types';

/**
 * Finds the teaching hook inside any word. The word bank ships authored focus
 * and silent indexes, but a school spelling list can contain anything, so this
 * detects the pattern from scratch. That is what lets the custom test screen
 * teach a word the app has never seen before.
 */

export interface Pattern {
  /** The letter team or rule this word practises, for example sh, magic e, bossy r. */
  pair: string;
  /** Indexes of the letters that carry the sound. */
  focus: number[];
  /** Indexes of letters that are not pronounced. */
  silent: number[];
  /** Short label for the badge, for example Letter team. */
  label: string;
  /** One sentence the voice reads out as the tip. */
  tip: string;
}

interface Rule {
  letters: string;
  pair: string;
  label: string;
  tip: string;
  where: 'anywhere' | 'start' | 'end';
  silentStart?: boolean;
}

const TEAM_RULES: Rule[] = [
  { letters: 'CK', pair: 'ck', label: 'Letter team', tip: 'c and k work together to say k at the end of a word.', where: 'anywhere' },
  { letters: 'SH', pair: 'sh', label: 'Letter team', tip: 's and h together say sh, like a quiet shush.', where: 'anywhere' },
  { letters: 'CH', pair: 'ch', label: 'Letter team', tip: 'c and h together say ch, like a choo choo train.', where: 'anywhere' },
  { letters: 'TH', pair: 'th', label: 'Letter team', tip: 't and h together say th, put your tongue between your teeth.', where: 'anywhere' },
  { letters: 'WH', pair: 'wh', label: 'Letter team', tip: 'In wh the h stays quiet, so it just says w.', where: 'start' },
  { letters: 'PH', pair: 'ph', label: 'Tricky team', tip: 'p and h together make the f sound.', where: 'anywhere' },
  { letters: 'KN', pair: 'kn', label: 'Quiet letter', tip: 'In kn the k is silent, so knee starts with the n sound.', where: 'start', silentStart: true },
  { letters: 'WR', pair: 'wr', label: 'Quiet letter', tip: 'In wr the w is silent, so write starts with the r sound.', where: 'start', silentStart: true },
  { letters: 'MB', pair: 'mb', label: 'Quiet letter', tip: 'At the end of mb the b is silent, so lamb ends with the m sound.', where: 'end', silentStart: false },
  { letters: 'AI', pair: 'ai', label: 'Vowel team', tip: 'a and i together say the long a sound.', where: 'anywhere' },
  { letters: 'AY', pair: 'ay', label: 'Vowel team', tip: 'a and y at the end say the long a sound.', where: 'anywhere' },
  { letters: 'EE', pair: 'ee', label: 'Vowel team', tip: 'e and e together say the long e sound.', where: 'anywhere' },
  { letters: 'EA', pair: 'ea', label: 'Vowel team', tip: 'e and a together usually say the long e sound.', where: 'anywhere' },
  { letters: 'OA', pair: 'oa', label: 'Vowel team', tip: 'o and a together say the long o sound.', where: 'anywhere' },
  { letters: 'OO', pair: 'oo', label: 'Vowel team', tip: 'o and o together say the oo sound, as in moon.', where: 'anywhere' },
  { letters: 'OU', pair: 'ou', label: 'Vowel team', tip: 'o and u together say the ou sound, as in out.', where: 'anywhere' },
  { letters: 'OW', pair: 'ow', label: 'Vowel team', tip: 'o and w can say the ow sound, as in cow or snow.', where: 'anywhere' },
  { letters: 'OI', pair: 'oi', label: 'Vowel team', tip: 'o and i together say the oi sound, as in coin.', where: 'anywhere' },
  { letters: 'OY', pair: 'oy', label: 'Vowel team', tip: 'o and y at the end say the oy sound, as in boy.', where: 'end' },
  { letters: 'AR', pair: 'ar', label: 'Bossy r', tip: 'The r bosses the a, so ar says ar as in car.', where: 'anywhere' },
  { letters: 'OR', pair: 'or', label: 'Bossy r', tip: 'The r bosses the o, so or says or as in fork.', where: 'anywhere' },
  { letters: 'ER', pair: 'er', label: 'Bossy r', tip: 'er says the er sound, as in her.', where: 'anywhere' },
  { letters: 'IR', pair: 'ir', label: 'Bossy r', tip: 'ir says the same er sound, as in bird.', where: 'anywhere' },
  { letters: 'UR', pair: 'ur', label: 'Bossy r', tip: 'ur says the same er sound, as in turn.', where: 'anywhere' },
  { letters: 'ING', pair: 'ing', label: 'Word ending', tip: 'The ing ending says ing, as in jumping.', where: 'end' },
];

const DOUBLE_LETTERS = ['LL', 'SS', 'FF', 'ZZ', 'TT', 'NN', 'MM', 'PP', 'RR', 'GG', 'DD', 'BB', 'CC'];
const VOWELS = 'AEIOU';

function indexesOf(word: string, from: number, length: number): number[] {
  return Array.from({ length }, (_, offset) => from + offset);
}

function findTeam(word: string, rule: Rule): number[] | null {
  const at = word.indexOf(rule.letters);
  if (at < 0) return null;
  if (rule.where === 'start' && at !== 0) return null;
  if (rule.where === 'end' && at + rule.letters.length !== word.length) return null;
  return indexesOf(word, at, rule.letters.length);
}

/** Detects the most useful teaching pattern in a word, or null for plain words. */
export function detectPattern(input: string): Pattern | null {
  const word = input.toUpperCase().replace(/[^A-Z]/g, '');
  if (word.length < 2) return null;

  for (const rule of TEAM_RULES) {
    const found = findTeam(word, rule);
    if (found === null) continue;
    const silent = rule.silentStart === true ? [found[0] ?? 0] : rule.silentStart === false ? [found[found.length - 1] ?? 0] : [];
    const focus = rule.silentStart === undefined ? found : found.filter((index) => !silent.includes(index));
    return { pair: rule.pair, focus, silent, label: rule.label, tip: rule.tip };
  }

  for (const pair of DOUBLE_LETTERS) {
    const at = word.indexOf(pair);
    if (at > 0 && at + 2 <= word.length) {
      return {
        pair: pair.toLowerCase(),
        focus: indexesOf(word, at, 2),
        silent: [],
        label: 'Twin letters',
        tip: 'Two of the same letter together still say one sound.',
      };
    }
  }

  // Magic e: a silent e at the end that pushes the vowel into its own name.
  if (word.length >= 4 && word.endsWith('E')) {
    const lastVowel = word.slice(0, -1).split('').reduce((found, letter, index) => (VOWELS.includes(letter) ? index : found), -1);
    const consonantsAfter = word.slice(lastVowel + 1, -1).replace(/[^A-Z]/g, '').length;
    if (lastVowel > 0 && consonantsAfter === 1) {
      return {
        pair: 'magic e',
        focus: [lastVowel],
        silent: [word.length - 1],
        label: 'Magic e',
        tip: 'The e at the end is silent, but it makes the vowel say its own name.',
      };
    }
  }

  const blends = ['ST', 'SP', 'SK', 'SM', 'SN', 'SW', 'BL', 'CL', 'FL', 'GL', 'PL', 'SL', 'BR', 'CR', 'DR', 'FR', 'GR', 'PR', 'TR', 'SC', 'TH'];
  for (const blend of blends) {
    if (word.startsWith(blend)) {
      return {
        pair: blend.toLowerCase(),
        focus: indexesOf(word, 0, 2),
        silent: [],
        label: 'Blend',
        tip: 'Say each of the two starting sounds, then slide them together.',
      };
    }
  }

  const firstVowel = word.split('').findIndex((letter) => VOWELS.includes(letter));
  if (firstVowel >= 0 && word.length <= 4) {
    return {
      pair: 'short vowel',
      focus: [firstVowel],
      silent: [],
      label: 'Short vowel',
      tip: 'Sound out each letter, and give the vowel its short sound.',
    };
  }

  return null;
}

/** Prefers the authored focus and silent indexes, then falls back to detection. */
export function patternForWord(word: string, entry: WordEntry | null): Pattern | null {
  if (entry !== null && ((entry.focus?.length ?? 0) > 0 || (entry.silent?.length ?? 0) > 0)) {
    return {
      pair: entry.tag,
      focus: entry.focus ?? [],
      silent: entry.silent ?? [],
      label: 'Sound focus',
      tip: entry.sentence ?? entry.hint,
    };
  }
  return detectPattern(word);
}

/** Splits a word into its chunks for step by step teaching. */
export function chunkWord(word: string, pattern: Pattern | null): string[] {
  if (pattern === null || pattern.focus.length < 2) return word.split('');
  const focus = new Set(pattern.focus);
  const chunks: string[] = [];
  let current = '';
  for (let index = 0; index < word.length; index += 1) {
    const letter = word[index] ?? '';
    if (focus.has(index)) {
      current += letter;
    } else {
      if (current.length > 0) {
        chunks.push(current);
        current = '';
      }
      chunks.push(letter);
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
