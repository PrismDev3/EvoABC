import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { cleanWord, soundOutText, spokenLetters, spokenWord, tidySentence } from './phonemes';

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
 *    each step.
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
const DEFAULT_WORD_SPEED = 0.72;

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

/** Converts an app speed into the number this platform understands. */
function platformRate(speed: number): number {
  const scaled = speed * normalRate();
  const minimum = Platform.OS === 'ios' ? 0.1 : 0.3;
  // iOS keeps climbing well past a comfortable reading pace, so it is capped
  // below its own maximum no matter what the setting says.
  const maximum = Platform.OS === 'ios' ? 0.7 : 1.5;
  return Math.max(minimum, Math.min(maximum, scaled));
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

function clearQueueTimer(): void {
  if (queueTimer !== null) {
    clearTimeout(queueTimer);
    queueTimer = null;
  }
}

/**
 * A generous guess at how long a step takes, used only as a safety net for the
 * engines that forget to tell us when they have finished.
 */
function estimateMs(step: Step): number {
  const characters = Math.max(1, step.text.length);
  return 700 + (characters * 105) / Math.max(0.3, step.speed) + step.pauseAfter;
}

/** Speaks a short sequence, cancelling whatever was playing before it. */
function speakSteps(steps: Step[], onDone?: () => void): void {
  const token = queueToken + 1;
  queueToken = token;
  clearQueueTimer();
  Speech.stop().catch(() => {
    // nothing was playing
  });

  const play = (index: number) => {
    if (token !== queueToken) return;
    const step = steps[index];
    if (step === undefined || step.text.length === 0 || !speechEnabled) {
      onDone?.();
      return;
    }
    let finished = false;
    const advance = () => {
      if (finished || token !== queueToken) return;
      finished = true;
      clearQueueTimer();
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

  play(0);
}

/** A spoken line, such as a rule explanation or a praise message. */
export function speakLine(text: string, options: Speech.SpeechOptions = {}): void {
  const clean = tidySentence(text);
  if (clean.length === 0) return;
  speakSteps([{ text: clean, speed: options.rate ?? lineSpeed, pitch: options.pitch ?? 1.05, pauseAfter: 0 }]);
}

/** Says a word at the dictation speed. Pass rate to slow it down further. */
export function speakWord(word: string, options: Speech.SpeechOptions = {}): void {
  const text = spokenWord(word);
  if (text.length === 0) return;
  speakSteps([{ text, speed: wordSpeed * (options.rate ?? 1), pitch: options.pitch ?? 1, pauseAfter: 0 }]);
}

/** The word as slowly as the setting allows, said twice so it can be copied. */
export function speakWordSlow(word: string): void {
  const text = spokenWord(word);
  if (text.length === 0) return;
  const speed = wordSpeed * 0.62;
  speakSteps([
    { text, speed, pitch: 1, pauseAfter: 520 },
    { text, speed, pitch: 1, pauseAfter: 0 },
  ]);
}

/**
 * Says the word, then each of its sounds, then the word twice more, which is
 * the order a grown up uses at the kitchen table. Very short or very plain
 * words have nothing to sound out, so they are simply said slowly.
 */
export function soundOut(word: string): void {
  const text = spokenWord(word);
  if (text.length === 0) return;
  const sounds = soundOutText(word);
  if (sounds === null) {
    speakWordSlow(word);
    return;
  }
  speakSteps([
    { text, speed: wordSpeed, pitch: 1, pauseAfter: 460 },
    { text: sounds, speed: wordSpeed * 0.95, pitch: 1, pauseAfter: 420 },
    { text, speed: wordSpeed, pitch: 1, pauseAfter: 300 },
    { text, speed: wordSpeed, pitch: 1, pauseAfter: 0 },
  ]);
}

/** Spells the word out loud in letter names, then says it. */
export function spellOut(word: string, then?: () => void): void {
  const text = spokenWord(word);
  const letters = spokenLetters(word);
  if (letters.length === 0) {
    onDoneAfterOnly(then);
    return;
  }
  speakSteps(
    [
      { text: letters, speed: lineSpeed, pitch: 1, pauseAfter: text.length === 0 ? 0 : 480 },
      ...(text.length === 0 ? [] : [{ text, speed: wordSpeed, pitch: 1, pauseAfter: 0 }]),
    ],
    then,
  );
}

function onDoneAfterOnly(then?: () => void): void {
  if (then !== undefined) setTimeout(then, 0);
}

/** Says the word, spells it with letter names, then says it again. */
export function teachWord(word: string): void {
  const text = spokenWord(word);
  if (text.length === 0) return;
  speakSteps([
    { text, speed: wordSpeed, pitch: 1, pauseAfter: 520 },
    { text: spokenLetters(word), speed: lineSpeed, pitch: 1, pauseAfter: 520 },
    { text, speed: wordSpeed, pitch: 1, pauseAfter: 0 },
  ]);
}

/** A hint sentence, then the word it belongs to. */
export function speakSentence(sentence: string, word?: string): void {
  const clean = tidySentence(sentence);
  const text = word === undefined ? '' : spokenWord(word);
  const steps: Step[] = [];
  if (clean.length > 0) steps.push({ text: clean, speed: lineSpeed, pitch: 1.05, pauseAfter: text.length > 0 ? 420 : 0 });
  if (text.length > 0) steps.push({ text, speed: wordSpeed, pitch: 1, pauseAfter: 0 });
  if (steps.length === 0) return;
  speakSteps(steps);
}

/** Stops the voice and empties the queue, used when a screen closes. */
export function stopSpeech(): void {
  queueToken += 1;
  clearQueueTimer();
  Speech.stop().catch(() => {
    // nothing to stop
  });
}

/** The current app level speeds, for the settings screen. */
export function ttsRates(): { line: number; word: number } {
  return { line: lineSpeed, word: wordSpeed };
}
