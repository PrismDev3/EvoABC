/**
 * The two decisions that decide whether a dictated word can be understood: how
 * fast the voice reads it, and which voice on the device reads it.
 *
 * Both are plain functions with no device API anywhere near them, so
 * `npm run selfcheck` can prove them and src/lib/tts.ts only has to talk to the
 * phone.
 */

/**
 * expo-speech does not hand our number to the device untouched, and assuming it
 * did is exactly what made every word hard to follow.
 *
 * - iOS: node_modules/expo-speech/ios/SpeechModule.swift does
 *     utterance.rate = Float(rate) * AVSpeechUtteranceDefaultSpeechRate
 *   and AVSpeechUtteranceDefaultSpeechRate is 0.5. So a JS rate of 1 is what
 *   iOS itself calls normal speech, 0.5 is half that pace and 2 is its ceiling.
 *   (The 0.5 in that native line is the scale factor, not the normal speed.)
 * - Android: SpeechModule.kt does textToSpeech.setSpeechRate(rate), where 1 is
 *   normal.
 * - Web: SpeechSynthesisUtterance.rate, where 1 is normal.
 *
 * So on every platform 1 means normal and 0.7 means seven tenths of that pace,
 * which is how the settings screen speaks about it. An earlier version treated
 * the iOS number as if the native layer used it raw and halved every speed
 * first, so a word set to 0.72 of normal arrived at about 0.36 of normal, and
 * iOS stretches and slurs badly when it is slowed that far. That half speed was
 * the muffled voice this file exists to prevent.
 */
export const SPEECH_SLOWEST = 0.6;
export const SPEECH_FASTEST = 1.4;

/**
 * The number to hand expo-speech for an app speed, where 1 is normal speech.
 *
 * The band is there because the ends of the range are not usable: below about
 * 0.6 the voice draws every vowel out and swallows final consonants, which
 * turns "map" into a long "maaay", and above 1.4 letter names run together.
 */
export function speechRateFor(speed: number): number {
  if (!Number.isFinite(speed)) return 1;
  return Math.min(SPEECH_FASTEST, Math.max(SPEECH_SLOWEST, speed));
}

/** The same speed as a percentage of normal speech, for the settings copy. */
export function speechPacePercent(speed: number): number {
  return Math.round(speechRateFor(speed) * 100);
}

/** How much clearer one kind of voice is than another, worst last. */
export type VoiceKind = 'premium' | 'enhanced' | 'standard' | 'compact' | 'novelty';

export interface VoiceFacts {
  name: string;
  identifier: string;
  language: string;
  /**
   * expo-speech reports "Default" or "Enhanced" only, and it reports a premium
   * voice as "Default", so the identifier carries most of the truth here.
   */
  quality: string;
}

export interface VoiceRank extends VoiceFacts {
  kind: VoiceKind;
  /** Higher is better. */
  score: number;
  note: string;
}

/**
 * The voices a person actually wants a six year old to hear a spelling word in.
 * Siri voices are not on this list on purpose: Apple does not allow an app to
 * pick them, and they are reported under a different identifier anyway.
 */
const PREFERRED_NAMES = ['Samantha', 'Ava', 'Allison', 'Susan', 'Nicky', 'Zoe', 'Evan', 'Nathan', 'Serena', 'Daniel', 'Karen', 'Moira', 'Tessa'];

/**
 * The joke voices every Apple device ships. They are funny once and useless for
 * spelling, and a stale voice setting could otherwise land on one.
 */
const NOVELTY_HINTS = [
  'novelty',
  'bad news',
  'good news',
  'bells',
  'bahh',
  'jester',
  'organ',
  'superstar',
  'wobble',
  'boing',
  'trinoids',
  'whisper',
  'zarvox',
  'albert',
  'fred',
  'junior',
  'kathy',
  'ralph',
  'deranged',
  'hysterical',
  'cellos',
  'bubbles',
  'bruce',
  'agnes',
  'princess',
];

/**
 * Sorts a voice into one of five kinds.
 *
 * The identifier is the giveaway: iOS downloads enhanced and premium voices as
 * com.apple.voice.enhanced.xx-XX.Name and com.apple.voice.premium.xx-XX.Name
 * while the voices that come with the phone end in "-compact" or sit under
 * com.apple.ttsbundle. Android names its voices by engine, so they land in
 * "standard", which reads perfectly well.
 */
export function classifyVoice(facts: Pick<VoiceFacts, 'name' | 'identifier' | 'quality'>): VoiceKind {
  const text = `${facts.name} ${facts.identifier}`.toLowerCase();
  if (NOVELTY_HINTS.some((hint) => text.includes(hint))) return 'novelty';
  if (text.includes('premium')) return 'premium';
  if (text.includes('enhanced') || facts.quality.toLowerCase().includes('enhanced')) return 'enhanced';
  if (text.includes('compact') || text.includes('eloquence') || text.includes('espeak')) return 'compact';
  return 'standard';
}

/** True for a voice worth dictating a word in: anything but the muddy ones. */
export function voiceIsClear(kind: VoiceKind): boolean {
  return kind !== 'compact' && kind !== 'novelty';
}

/** Scores one installed voice so the best English one can be picked. */
export function rankVoice(facts: VoiceFacts): VoiceRank {
  const kind = classifyVoice(facts);
  const language = facts.language.toLowerCase();
  const notes: string[] = [];
  let score = 0;

  if (language.startsWith('en-us') || language.startsWith('en_us')) {
    score += 6;
    notes.push('US English');
  } else if (language.startsWith('en')) {
    score += 4;
    notes.push('English');
  } else {
    score -= 6;
    notes.push('not English');
  }

  if (kind === 'premium') {
    score += 8;
    notes.push('premium voice');
  } else if (kind === 'enhanced') {
    score += 6;
    notes.push('enhanced voice');
  } else if (kind === 'compact') {
    score -= 5;
    notes.push('compact voice');
  } else if (kind === 'novelty') {
    score -= 12;
    notes.push('novelty voice');
  }

  if (PREFERRED_NAMES.some((preferred) => facts.name.toLowerCase().startsWith(preferred.toLowerCase()))) score += 3;

  return { ...facts, kind, score, note: notes.join(', ') };
}

/**
 * Where a grown up downloads a clearer voice, in the order the taps happen. It
 * is plain text on purpose: an app cannot open the Accessibility pages of the
 * device settings, and a button that landed on the wrong page would be worse
 * than the three taps it takes to walk there.
 */
export const CLEARER_VOICE_STEPS =
  'Download a clearer one: device Settings, then Accessibility, then Spoken Content, then Voices, then English, then pick Ava or Zoe (Premium) or Samantha (Enhanced). EvoABC switches to it the next time it opens.';
