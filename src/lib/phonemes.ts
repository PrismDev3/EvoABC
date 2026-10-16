/**
 * How a word is read out loud.
 *
 * This is the teaching half of the voice, kept pure and free of any device
 * API so `npm run selfcheck` can prove the letter names and the sound it out
 * chunks are right. src/lib/tts.ts does the actual talking.
 *
 * A dictation engine reads capitals letter by letter in its own way, and it
 * reads a bare `c` as the letter name rather than the sound, so both are
 * written the way they have to be spelled for a voice to say them properly.
 */

/** Strips anything a spelling word should never contain. */
export function cleanWord(word: string): string {
  return word.replace(/[^A-Za-z]/g, '');
}

/** A sentence the voice can breathe through. */
export function tidySentence(text: string): string {
  const trimmed = text.trim().replace(/[.?!]$/, '');
  return trimmed.length === 0 ? '' : `${trimmed}.`;
}

/** Lower case words are read as words, not as a string of capitals. */
export function spokenWord(word: string): string {
  const clean = cleanWord(word);
  if (clean.length === 0) return '';
  return clean.length === 1 ? clean.toUpperCase() : `${clean.charAt(0).toUpperCase()}${clean.slice(1).toLowerCase()}`;
}

/** The letter names, the way they are said out loud. */
export const LETTER_NAMES: Record<string, string> = {
  A: 'ay',
  B: 'bee',
  C: 'see',
  D: 'dee',
  E: 'ee',
  F: 'ef',
  G: 'jee',
  H: 'aitch',
  I: 'eye',
  J: 'jay',
  K: 'kay',
  L: 'el',
  M: 'em',
  N: 'en',
  O: 'oh',
  P: 'pee',
  Q: 'cue',
  R: 'ar',
  S: 'es',
  T: 'tee',
  U: 'you',
  V: 'vee',
  W: 'double you',
  X: 'ex',
  Y: 'why',
  Z: 'zee',
};

/** Turns CAT into "see, ay and tee", which is how a spelling is dictated. */
export function spokenLetters(word: string): string {
  const names = cleanWord(word)
    .toUpperCase()
    .split('')
    .map((letter) => LETTER_NAMES[letter] ?? letter.toLowerCase());
  if (names.length === 0) return '';
  if (names.length === 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] ?? ''}`;
}

/**
 * How each letter or letter team sounds, written the way it has to be spelled
 * for a voice to say the sound instead of the letter name.
 */
export const SOUND_NAMES: Record<string, string> = {
  A: 'ah',
  E: 'eh',
  I: 'ih',
  O: 'aw',
  U: 'uh',
  Y: 'yuh',
  B: 'buh',
  C: 'kuh',
  D: 'duh',
  F: 'fff',
  G: 'guh',
  H: 'huh',
  J: 'juh',
  K: 'kuh',
  L: 'lll',
  M: 'mmm',
  N: 'nnn',
  P: 'puh',
  Q: 'kwuh',
  R: 'rrr',
  S: 'sss',
  T: 'tuh',
  V: 'vvv',
  W: 'wuh',
  X: 'ks',
  Z: 'zzz',
  BB: 'buh',
  CC: 'kuh',
  DD: 'duh',
  FF: 'fff',
  GG: 'guh',
  LL: 'lll',
  MM: 'mmm',
  NN: 'nnn',
  PP: 'puh',
  RR: 'rrr',
  SS: 'sss',
  TT: 'tuh',
  ZZ: 'zzz',
  CK: 'kuh',
  SH: 'shh',
  CH: 'ch',
  TH: 'th',
  WH: 'wuh',
  PH: 'fff',
  GH: 'guh',
  KN: 'n',
  WR: 'r',
  MB: 'm',
  NG: 'ng',
  QU: 'kw',
  LE: 'ul',
  AI: 'ay',
  AY: 'ay',
  EA: 'ee',
  EE: 'ee',
  OA: 'oh',
  OO: 'oo',
  OU: 'ow',
  OW: 'ow',
  OI: 'oy',
  OY: 'oy',
  AR: 'ar',
  OR: 'or',
  ER: 'er',
  IR: 'er',
  UR: 'er',
  ING: 'ing',
  OUGH: 'uff',
  IGH: 'eye',
};

const VOWELS = 'AEIOU';

/** The name a vowel says when a magic e is holding the door open for it. */
const LONG_VOWELS: Record<string, string> = { A: 'ay', E: 'ee', I: 'eye', O: 'oh', U: 'you' };

/** True for the magic e, which lengthens the vowel but is never pronounced. */
function isSilentFinalE(letters: string, index: number): boolean {
  if (index !== letters.length - 1 || letters.length < 4 || index < 2) return false;
  if (letters[index] !== 'E') return false;
  return VOWELS.includes(letters[index - 1] ?? '') === false;
}

/** The vowel the magic e is working on, or -1 when the word has no magic e. */
function magicVowelIndex(letters: string): number {
  if (letters.length < 4 || !letters.endsWith('E')) return -1;
  if (VOWELS.includes(letters[letters.length - 2] ?? '')) return -1;
  for (let index = letters.length - 3; index > 0; index -= 1) {
    if (VOWELS.includes(letters[index] ?? '')) return index;
  }
  return -1;
}

/** Splits a word into the graphemes a teacher would sound out. */
export function soundChunks(word: string): string[] {
  const letters = cleanWord(word).toUpperCase();
  const chunks: string[] = [];
  let index = 0;
  while (index < letters.length) {
    if (isSilentFinalE(letters, index)) break;
    const rest = letters.slice(index);
    const four = rest.slice(0, 4);
    const three = rest.slice(0, 3);
    const two = rest.slice(0, 2);
    // A consonant team is read as one sound, and le at the end says ul.
    const pairIsSound = two.length === 2 && SOUND_NAMES[two] !== undefined && !(two === 'LE' && index + 2 !== letters.length);
    if (four.length === 4 && SOUND_NAMES[four] !== undefined) {
      chunks.push(four);
      index += 4;
      continue;
    }
    if (three.length === 3 && SOUND_NAMES[three] !== undefined) {
      chunks.push(three);
      index += 3;
      continue;
    }
    if (pairIsSound) {
      chunks.push(two);
      index += 2;
      continue;
    }
    chunks.push(rest.charAt(0));
    index += 1;
  }
  return chunks;
}

/** The sound a chunk makes, taking its place in the word into account. */
function soundForChunk(chunk: string, letters: string, index: number): string {
  if (chunk === 'Y' && index + 1 === letters.length && letters.length >= 3) return 'ee';
  const magic = magicVowelIndex(letters);
  if (chunk.length === 1 && index === magic && LONG_VOWELS[chunk] !== undefined) return LONG_VOWELS[chunk] ?? chunk;
  return SOUND_NAMES[chunk] ?? chunk.toLowerCase();
}

/**
 * The sounds of a word, one at a time, as a line the voice can read:
 * DOLPHIN becomes "duh, aw, lll, fff, ih, nnn".
 *
 * Returns null when the word is too short or too plain to be worth sounding
 * out, in which case the caller should just say the word slowly instead.
 */
export function soundOutText(word: string): string | null {
  const letters = cleanWord(word).toUpperCase();
  const chunks = soundChunks(letters);
  if (chunks.length <= 1) return null;
  let cursor = 0;
  return chunks
    .map((chunk) => {
      const sound = soundForChunk(chunk, letters, cursor);
      cursor += chunk.length;
      return sound;
    })
    .join(', ');
}
