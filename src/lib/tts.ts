import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { soundOutSteps, spokenLetterList, spokenWord, tidySentence } from './phonemes';

/**
 * Text to speech for EvoABC.
 *
 * This uses the voices built into the device, Apple's on iOS and the Google
 * engine on Android, because those are the ones that sound like a person
 * reading instead of a robot. The helpers below rank every installed voice and
 * pick the best one, and a grown up can override the choice in the parent zone.
 *
 * Three rules make the voice usable for a six year old:
 *
 * 1. Speeds are normalised in one place. iOS calls 0.5 normal speech and 1.0
 *    very fast, while Android calls 1.0 normal, so an app speed of 1 means
 *    normal here and is converted per platform. Passing an iOS rate straight
 *    through is what made words rattle past far too quickly to follow.
 * 2. Only one thing is ever spoken at a time. A new request cancels whatever
 *    is playing and runs its own short sequence, so tapping three buttons in a
 *    row never piles three voices on top of each other.
 * 3. Words are taught the way a teacher does it: say the word, sound it out or
 *    spell it with letter names, then say the word again, with a breath between
 *    each step. The word itself is always said twice with a gap, because one
 *    pass at speed is genuinely easy to miss.
 * 4. The voice tells the rest of the app when it is talking, so the background
 *    music can drop to a whisper and reward chimes can wait. Words competing
 *    with music is the other half of why a word is hard to make out.
 */

export interface VoiceChoice {
  id: string;
  name: string;
  language: string;
  quality: string;
  /** Higher is better. */
  score: number;
  note: string;
}

const PREFERRED_NAMES = [
  'Samantha',
  'Ava',
  'Allison',
  'Susan',
  'Nicky',
  'Zoe',
  'Evan',
  'Nathan',
  'Serena',
  'Daniel',
  'Karen',
  'Moira',
  'Tessa',
  'Siri',
];

/** App level speeds. 1 is normal grown up speech, lower is slower and kinder. */
const DEFAULT_LINE_SPEED = 0.82;
const DEFAULT_WORD_SPEED = 0.76;

let voices: VoiceChoice[] = [];
let chosenVoiceId: string | null = null;
let speechEnabled = true;
let lineSpeed = DEFAULT_LINE_SPEED;
let wordSpeed = DEFAULT_WORD_SPEED;
let loaded = false;

/** The rate the platform calls normal speech. */
function normalRate(): number {
  return Platform.OS === 'ios' ? 0.5 : 1;
}

/**
 * Converts an app speed into the number this platform understands.
 *
 * iOS does not stay clear at the bottom of its range. Below about 0.42 it
 * stretches every vowel and swallows the final consonant, which is how "map"
 * comes back sounding like "may". Lower speeds are therefore squashed up into
 * the band where the voice stays crisp, while a speed of 1 still means exactly
 * the pace iOS itself calls normal.
 */
function platformRate(speed: number): number {
  if (Platform.OS === 'ios') {
    const clamped = Math.max(0.55, Math.min(1.4, speed));
    return 0.5 * (0.62 + 0.38 * clamped);
  }
  return Math.max(0.7, Math.min(1.3, speed * 1.04));
}

function scoreVoice(name: string, identifier: string, language: string, quality: string): { score: number; note: string } {
  const lower = `${name} ${identifier}`.toLowerCase();
  const qualityLower = quality.toLowerCase();
  let score = 0;
  const notes: string[] = [];

  if (language.toLowerCase().startsWith('en-us')) {
    score += 6;
    notes.push('US English');
  } else if (language.toLowerCase().startsWith('en')) {
    score += 4;
    notes.push('English');
  } else {
    score -= 6;
  }

  if (qualityLower.includes('premium')) {
    score += 8;
    notes.push('premium voice');
  } else if (qualityLower.includes('enhanced')) {
    score += 6;
    notes.push('enhanced voice');
  }

  if (lower.includes('premium')) {
    score += 5;
    notes.push('premium');
  } else if (lower.includes('enhanced')) {
    score += 4;
    notes.push('enhanced');
  }

  if (PREFERRED_NAMES.some((preferred) => name.toLowerCase().startsWith(preferred.toLowerCase()))) score += 3;

  // Compact and older bundled voices are exactly the robotic ones to avoid.
  if (lower.includes('compact')) {
    score -= 5;
    notes.push('compact');
  }
  if (lower.includes('ttsbundle') || lower.includes('eloquence') || lower.includes('espeak')) {
    score -= 4;
    notes.push('basic engine');
  }
  if (lower.includes('novelty') || lower.includes('bad news') || lower.includes('bells')) {
    score -= 12;
    notes.push('novelty');
  }

  return { score, note: notes.length > 0 ? notes.join(', ') : 'system voice' };
}

/** Reads the installed voices once and returns them best first. */
export async function loadVoices(preferredId: string | null = null): Promise<VoiceChoice[]> {
  try {
    const available = await Speech.getAvailableVoicesAsync();
    voices = available
      .map((voice) => {
        const { score, note } = scoreVoice(voice.name, voice.identifier, voice.language, String(voice.quality ?? ''));
        return {
          id: voice.identifier,
          name: voice.name,
          language: voice.language,
          quality: String(voice.quality ?? 'default'),
          score,
          note,
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  } catch (error) {
    console.warn('EvoABC could not read the installed voices.', error);
    voices = [];
  }
  loaded = true;
  setVoice(preferredId);
  return voices;
}

export function isVoiceListLoaded(): boolean {
  return loaded;
}

export function listVoices(): VoiceChoice[] {
  return voices;
}

/** English voices only, which is all a spelling app needs. */
export function englishVoices(): VoiceChoice[] {
  const english = voices.filter((voice) => voice.language.toLowerCase().startsWith('en'));
  return english.length > 0 ? english : voices;
}

export function defaultVoice(): VoiceChoice | null {
  return englishVoices().find((voice) => voice.score > 0) ?? null;
}

export function setVoice(id: string | null): void {
  if (id !== null && voices.length > 0 && !voices.some((voice) => voice.id === id)) {
    // The saved voice is gone, for example after an iOS update, so fall back.
    chosenVoiceId = null;
    return;
  }
  chosenVoiceId = id;
}

export function getVoiceId(): string | null {
  return chosenVoiceId ?? defaultVoice()?.id ?? null;
}

export function describeCurrentVoice(): string {
  const id = getVoiceId();
  if (id === null) return 'System default voice';
  const match = voices.find((voice) => voice.id === id);
  if (match === undefined) return 'System default voice';
  return `${match.name} (${match.note})`;
}

export function configureTts(options: { enabled: boolean; speechRate: number; dictationRate: number; voiceId: string | null }): void {
  speechEnabled = options.enabled;
  lineSpeed = options.speechRate;
  wordSpeed = options.dictationRate;
  setVoice(options.voiceId);
}

// --------------------------------------------------------------- speaking

interface Step {
  text: string;
  /** App level speed, 1 being normal speech. */
  speed: number;
  pitch: number;
  /** Quiet gap after this step, in milliseconds, before the next one. */
  pauseAfter: number;
}

let queueToken = 0;
let queueTimer: ReturnType<typeof setTimeout> | null = null;
let leadTimer: ReturnType<typeof setTimeout> | null = null;
/** Told whether the voice is talking, so the app can get out of its way. */
let speechActivityListener: ((active: boolean) => void) | null = null;

/** Registered once by the game shell and wired to the music and the effects. */
export function setSpeechActivityListener(listener: ((active: boolean) => void) | null): void {
  speechActivityListener = listener;
}

function reportSpeech(active: boolean): void {
  try {
    speechActivityListener?.(active);
  } catch (error) {
    // A listener that throws must never stop the voice from finishing.
    console.warn('EvoABC could not report the speech state.', error);
  }
}

/**
 * True while the voice engine may still be talking. Cancelling the voice and
 * starting the next utterance in the same tick is what clips the first syllable
 * off a word, so a new request waits for the cancellation to land first, and
 * only pays that wait when something really was playing.
 */
let busy = false;

/** A short breath between cancelling the voice and the first sound. */
const LEAD_IN_MS = 90;

function clearTimers(): void {
  if (queueTimer !== null) {
    clearTimeout(queueTimer);
    queueTimer = null;
  }
  if (leadTimer !== null) {
    clearTimeout(leadTimer);
    leadTimer = null;
  }
}

/**
 * A generous guess at how long a step takes, used only as a safety net for the
 * engines that forget to tell us when they have finished. It must never come
 * out shorter than the real thing, or the next step would cut this one off.
 */
function estimateMs(step: Step): number {
  const characters = Math.max(1, step.text.length);
  const rate = Math.max(0.25, platformRate(step.speed));
  return 950 + (characters * 70) / rate + step.pauseAfter;
}

/** A word spoken on its own is a sentence, so it keeps its last consonant. */
function asSentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/** Speaks a short sequence, cancelling whatever was playing before it. */
function speakSteps(steps: Step[], onDone?: () => void): void {
  const token = queueToken + 1;
  queueToken = token;
  clearTimers();
  const wasBusy = busy;
  busy = true;

  const play = (index: number) => {
    if (token !== queueToken) return;
    const step = steps[index];
    if (step === undefined || step.text.length === 0 || !speechEnabled) {
      busy = false;
      if (token === queueToken) reportSpeech(false);
      onDone?.();
      return;
    }
    if (index === 0) reportSpeech(true);
    let finished = false;
    const advance = () => {
      if (finished || token !== queueToken) return;
      finished = true;
      if (queueTimer !== null) {
        clearTimeout(queueTimer);
        queueTimer = null;
      }
      if (step.pauseAfter <= 0) {
        play(index + 1);
        return;
      }
      queueTimer = setTimeout(() => {
        if (token === queueToken) play(index + 1);
      }, step.pauseAfter);
    };

    const voiceId = getVoiceId();
    try {
      Speech.speak(step.text, {
        rate: platformRate(step.speed),
        pitch: step.pitch,
        language: 'en-US',
        useApplicationAudioSession: true,
        ...(voiceId !== null ? { voice: voiceId } : {}),
        onDone: advance,
        onStopped: advance,
        onError: advance,
      });
    } catch (error) {
      console.warn('EvoABC could not speak.', error);
      advance();
      return;
    }
    // Some engines never call back at all, so the queue always keeps moving.
    queueTimer = setTimeout(advance, estimateMs(step));
  };

  const begin = () => {
    if (token !== queueToken) return;
    play(0);
  };

  if (!wasBusy) {
    leadTimer = setTimeout(begin, LEAD_IN_MS);
    return;
  }

  Speech.stop()
    .catch(() => undefined)
    .then(() => {
      if (token !== queueToken) return;
      leadTimer = setTimeout(begin, LEAD_IN_MS);
    });
}

/** A spoken line, such as a rule explanation or a praise message. */
export function speakLine(text: string, options: Speech.SpeechOptions = {}): void {
  const clean = tidySentence(text);
  if (clean.length === 0) return;
  speakSteps([{ text: clean, speed: options.rate ?? lineSpeed, pitch: options.pitch ?? 1.05, pauseAfter: 0 }]);
}

/** Says a word once at the dictation speed. Pass rate to slow it down further. */
export function speakWord(word: string, options: Speech.SpeechOptions = {}): void {
  const text = spokenWord(word);
  if (text.length === 0) return;
  speakSteps([{ text: asSentence(text), speed: wordSpeed * (options.rate ?? 1), pitch: options.pitch ?? 1, pauseAfter: 0 }]);
}

/** The word as slowly as the setting allows, said twice so it can be copied. */
export function speakWordSlow(word: string): void {
  const text = spokenWord(word);
  if (text.length === 0) return;
  const said = asSentence(text);
  const speed = wordSpeed * 0.7;
  speakSteps([
    { text: said, speed, pitch: 1, pauseAfter: 560 },
    { text: said, speed, pitch: 1, pauseAfter: 0 },
  ]);
}

/**
 * Says the word, then each of its sounds with a word that proves the sound,
 * then the word twice more, which is the order a grown up uses at the kitchen
 * table. Very short or very plain words have nothing to sound out, so they are
 * simply said slowly instead.
 */
export function soundOut(word: string): void {
  const text = spokenWord(word);
  if (text.length === 0) return;
  const steps = soundOutSteps(word);
  if (steps === null) {
    speakWordSlow(word);
    return;
  }
  const said = asSentence(text);
  speakSteps([
    { text: said, speed: wordSpeed, pitch: 1, pauseAfter: 430 },
    ...steps.map((step) => ({
      text: step.anchor.length > 0 ? `${step.sound}, as in ${step.anchor}.` : `${step.sound}.`,
      speed: wordSpeed * 0.98,
      pitch: 1,
      pauseAfter: 230,
    })),
    { text: said, speed: wordSpeed * 0.92, pitch: 1, pauseAfter: 360 },
    { text: said, speed: wordSpeed, pitch: 1, pauseAfter: 0 },
  ]);
}

/** One step per letter, so each letter name lands on its own. */
function letterSteps(word: string, pauseAfter: number): Step[] {
  return spokenLetterList(word).map((name) => ({ text: `${name},`, speed: lineSpeed, pitch: 1, pauseAfter }));
}

/** Spells the word out loud in letter names, then says it. */
export function spellOut(word: string, then?: () => void): void {
  const text = spokenWord(word);
  const letters = letterSteps(word, 250);
  if (letters.length === 0) {
    onDoneAfterOnly(then);
    return;
  }
  speakSteps(
    [
      ...letters,
      ...(text.length === 0 ? [] : [{ text: asSentence(text), speed: wordSpeed, pitch: 1, pauseAfter: 0 }]),
    ],
    then,
  );
}

function onDoneAfterOnly(then?: () => void): void {
  if (then !== undefined) setTimeout(then, 0);
}

/** Says the word, spells it one letter at a time, then says it again. */
export function teachWord(word: string): void {
  const text = spokenWord(word);
  if (text.length === 0) return;
  const letters = letterSteps(word, 260);
  if (letters.length === 0) return;
  const said = asSentence(text);
  speakSteps([
    { text: said, speed: wordSpeed, pitch: 1, pauseAfter: 470 },
    ...letters,
    { text: said, speed: wordSpeed, pitch: 1, pauseAfter: 0 },
  ]);
}

/**
 * A hint sentence, then the word twice. The repeat matters most here, because
 * this is the mode where the child has to spell a word they have only heard.
 */
export function speakSentence(sentence: string, word?: string): void {
  const clean = tidySentence(sentence);
  const text = word === undefined ? '' : spokenWord(word);
  const said = text.length === 0 ? '' : asSentence(text);
  const steps: Step[] = [];
  if (clean.length > 0) steps.push({ text: clean, speed: lineSpeed, pitch: 1.05, pauseAfter: said.length > 0 ? 640 : 0 });
  if (said.length > 0) {
    steps.push({ text: said, speed: wordSpeed, pitch: 1, pauseAfter: 560 });
    steps.push({ text: said, speed: wordSpeed, pitch: 1, pauseAfter: 0 });
  }
  if (steps.length === 0) return;
  speakSteps(steps);
}

/**
 * The word on its own, said twice with a breath between, which is what a grown
 * up does at the kitchen table when the first go was not caught.
 */
export function dictateWord(word: string): void {
  const text = spokenWord(word);
  if (text.length === 0) return;
  const said = asSentence(text);
  speakSteps([
    { text: said, speed: wordSpeed, pitch: 1, pauseAfter: 540 },
    { text: said, speed: wordSpeed, pitch: 1, pauseAfter: 0 },
  ]);
}

/** Stops the voice and empties the queue, used when a screen closes. */
export function stopSpeech(): void {
  queueToken += 1;
  busy = false;
  reportSpeech(false);
  clearTimers();
  Speech.stop().catch(() => {
    // nothing to stop
  });
}

/** The current app level speeds, for the settings screen. */
export function ttsRates(): { line: number; word: number } {
  return { line: lineSpeed, word: wordSpeed };
}
