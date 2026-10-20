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
  const names = spokenLetterList(word);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] ?? ''}`;
}

/**
 * The letter names, one per letter. The voice says these as separate steps so
 * each one lands on its own instead of running together into a blur.
 */
export function spokenLetterList(word: string): string[] {
  return cleanWord(word)
    .toUpperCase()
    .split('')
    .map((letter) => LETTER_NAMES[letter] ?? letter.toLowerCase());
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

/**
 * A short real word that begins with the sound. A voice engine guesses at a
 * bare spelling like "nnn" or "ah", so every sound is spoken with one of these
 * as proof: "nnn, as in no" cannot be misheard the way "nnn" alone can.
 */
export const SOUND_ANCHORS: Record<string, string> = {
  A: 'at',
  E: 'egg',
  I: 'it',
  O: 'on',
  U: 'up',
  Y: 'yes',
  B: 'bat',
  C: 'cat',
  D: 'dog',
  F: 'fish',
  G: 'gap',
  H: 'hat',
  J: 'jam',
  K: 'kit',
  L: 'leg',
  M: 'map',
  N: 'no',
  P: 'pig',
  Q: 'queen',
  R: 'red',
  S: 'sun',
  T: 'top',
  V: 'van',
  W: 'wet',
  X: 'box',
  Z: 'zoo',
  BB: 'bat',
  CC: 'cat',
  DD: 'dog',
  FF: 'fish',
  GG: 'gap',
  LL: 'leg',
  MM: 'map',
  NN: 'no',
  PP: 'pig',
  RR: 'red',
  SS: 'sun',
  TT: 'top',
  ZZ: 'zoo',
  CK: 'duck',
  SH: 'ship',
  CH: 'chip',
  TH: 'thin',
  WH: 'when',
  PH: 'phone',
  GH: 'ghost',
  KN: 'knee',
  WR: 'wrist',
  MB: 'lamb',
  NG: 'song',
  QU: 'queen',
  LE: 'apple',
  AI: 'rain',
  AY: 'day',
  EA: 'seat',
  EE: 'see',
  OA: 'boat',
  OO: 'moon',
  OU: 'out',
  OW: 'cow',
  OI: 'coin',
  OY: 'boy',
  AR: 'car',
  OR: 'fork',
  ER: 'her',
  IR: 'bird',
  UR: 'turn',
  ING: 'ring',
  OUGH: 'tough',
  IGH: 'light',
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

/** One sounding out step: the sound on its own, plus the word that proves it. */
export interface SoundStep {
  chunk: string;
  sound: string;
  /** A short real word the sound can be heard in, such as "no" for n. */
  anchor: string;
}

/**
 * The sounds of a word, one at a time, each with a word that shows it: DOLPHIN
 * becomes duh as in dog, aw as in on, lll as in leg, and so on.
 *
 * Returns null when the word is too short or too plain to be worth sounding
 * out, in which case the caller should just say the word slowly instead.
 */
export function soundOutSteps(input: string): SoundStep[] | null {
  const letters = cleanWord(input).toUpperCase();
  const chunks = soundChunks(letters);
  if (chunks.length <= 1) return null;
  let cursor = 0;
  return chunks.map((chunk) => {
    const sound = soundForChunk(chunk, letters, cursor);
    cursor += chunk.length;
    const anchor = SOUND_ANCHORS[chunk] ?? (SOUND_ANCHORS[sound.toUpperCase()] ?? '');
    return { chunk, sound, anchor };
  });
}

/**
 * The silence after a word before the next thing is said, in milliseconds.
 *
 * It grows with the word, because a long word takes longer to say and therefore
 * needs a longer rest behind it before the next one starts; a gap sized for CAT
 * would run straight into the front of TYRANNOSAURUS.
 */
export function wordGapMs(letters: number): number {
  const clean = Number.isFinite(letters) ? Math.max(0, Math.min(14, Math.round(letters))) : 0;
  return 560 + clean * 40;
}

/** One thing the voice says, as data. src/lib/tts.ts turns these into speech. */
export interface SpeechStep {
  text: string;
  /** Scales the pace from the settings. 1 is the pace a grown up chose. */
  speedFactor: number;
  /** Quiet gap after this step, in milliseconds. */
  pauseAfterMs: number;
}

/** A word on its own is a sentence, so the voice keeps its last consonant. */
function asSentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/**
 * How a spelling word is dictated.
 *
 * A child cannot tell "nap" from "nat" out of a phone speaker: p is the quietest
 * of the voiceless stops and its burst lasts about fifteen milliseconds, which is
 * precisely what a small speaker eats. That is why the two phases differ, and
 * why the sounds are the thing that settles an ending:
 *
 * - **practice** says the word, then every sound with a real word that proves it,
 *   then the word twice. The child hears "nnn, ah, puh" and knows it ends in p.
 * - **test** says the word three times, plainly, the way a school test sounds,
 *   with the last pass a little slower. A test that read the sounds out loud
 *   would not be a test, so a miss is answered with the ending instead
 *   (endingHintSteps below), which is what a teacher does when asked.
 *
 * Neither phase drags the voice out to make itself clear. Each pass is a normal
 * reading of the word, a hair slower every time, and the passes are separated by
 * most of a second of silence, sized by wordGapMs below so a longer word gets a
 * longer rest. That is how a person dictates a word, and it keeps every
 * consonant intact, where a very slow reading would smear them. The pace itself
 * is held inside the band in src/lib/speechProfile.ts.
 */
export function dictationSteps(word: string, phase: 'practice' | 'test' = 'practice'): SpeechStep[] {
  const text = spokenWord(word);
  if (text.length === 0) return [];
  const said: SpeechStep = { text: asSentence(text), speedFactor: 1, pauseAfterMs: 0 };
  const gap = wordGapMs(text.length);

  // The last pass is always the slowest one, because that is the pass a child
  // copies: the last thing heard is what they say back to themselves.
  if (phase === 'test') {
    return [
      { ...said, speedFactor: 1, pauseAfterMs: gap },
      { ...said, speedFactor: 0.96, pauseAfterMs: gap + 120 },
      { ...said, speedFactor: 0.9 },
    ];
  }

  const sounds = soundOutSteps(word);
  if (sounds === null) {
    // Nothing worth sounding out, so the word is simply said twice, slowly.
    return [
      { ...said, speedFactor: 1, pauseAfterMs: gap },
      { ...said, speedFactor: 0.9 },
    ];
  }
  // A sound is proved by a different word. "shh, as in ship" while the child is
  // spelling SHIP proves nothing, so a word never acts as its own anchor.
  const plain = text.toLowerCase();
  return [
    { ...said, pauseAfterMs: gap },
    ...sounds.map((step) => {
      const useAnchor = step.anchor.length > 0 && step.anchor.toLowerCase() !== plain;
      return {
        text: useAnchor ? `${step.sound}, as in ${step.anchor}.` : `${step.sound}.`,
        speedFactor: 0.97,
        pauseAfterMs: 300,
      };
    }),
    { ...said, speedFactor: 0.96, pauseAfterMs: gap },
    { ...said, speedFactor: 0.9 },
  ];
}

/**
 * The word, then the sound it ends with and a word that proves it: the answer to
 * a child who heard "nat" when the app said "nap".
 *
 * It is two steps and ends on the sound on purpose. A missed word is followed by
 * the next one a couple of seconds later, so a hint that said the word again at
 * the end would be cut off half way through; and the sound is the part that was
 * missing, so that is the part worth finishing on.
 */
export function endingHintSteps(word: string): SpeechStep[] {
  const text = spokenWord(word);
  if (text.length === 0) return [];
  const sounds = soundOutSteps(word);
  const last = sounds === null ? undefined : sounds[sounds.length - 1];
  if (last === undefined) return [{ text: asSentence(text), speedFactor: 0.9, pauseAfterMs: 0 }];
  return [
    { text: asSentence(text), speedFactor: 1, pauseAfterMs: Math.max(520, wordGapMs(text.length) - 120) },
    {
      text: last.anchor.length > 0 ? `It ends with ${last.sound}, as in ${last.anchor}.` : `It ends with ${last.sound}.`,
      speedFactor: 0.96,
      pauseAfterMs: 0,
    },
  ];
}

/**
 * The same sounds as one plain line, without the example words:
 * DOLPHIN becomes "duh, aw, lll, fff, ih, nnn".
 */
export function soundOutText(word: string): string | null {
  const steps = soundOutSteps(word);
  if (steps === null) return null;
  return steps.map((step) => step.sound).join(', ');
}
