import * as Speech from 'expo-speech';

import { SpeechStep, cleanWord, dictationSteps, endingHintSteps, spokenLetterList, spokenWord, tidySentence } from './phonemes';
import {
  CLEARER_VOICE_STEPS,
  DEFAULT_SENTENCE_PACE,
  DEFAULT_WORD_PACE,
  SENTENCE_PITCH,
  WORD_PITCH,
  VoiceKind,
  VoiceRank,
  classifyVoice,
  dictatedPace,
  languageForVoice,
  rankVoice,
  speechMsFor,
  speechRateFor,
  voiceIsClear,
} from './speechProfile';

/**
 * Text to speech for EvoABC.
 *
 * This uses the voices built into the device, Apple's on iOS and the Google
 * engine on Android, because those are the ones that sound like a person
 * reading instead of a robot. The helpers below rank every installed voice and
 * pick the best one, and a grown up can override the choice in the parent zone.
 *
 * Four rules make the voice usable for a six year old:
 *
 * 1. Speeds are normalised in one place. An app speed of 1 means the pace the
 *    system itself calls normal, and every other speed is a fraction of it.
 *    The conversion lives in src/lib/speechProfile.ts, because expo-speech
 *    scales the number again inside the native layer and getting that wrong
 *    once halved every word the app ever said.
 * 2. Only one thing is ever spoken at a time. A new request cancels whatever
 *    is playing and runs its own short sequence, so tapping three buttons in a
 *    row never piles three voices on top of each other.
 * 3. Words are taught the way a teacher does it: say the word, sound it out or
 *    spell it with letter names, then say the word again, with a breath between
 *    each step. The word itself is always said twice with a gap, because one
 *    pass at speed is genuinely easy to miss.
 * 4. A word is read at a speaking pace, never dragged out. Slowing a synthesiser
 *    down stretches its vowels and evens out its melody, which is the machine
 *    voice this app is trying not to have; the gap between repeats is what makes
 *    a word easy to follow. The band, the pitch and the voice's own language are
 *    all decided in src/lib/speechProfile.ts. The voice tells the rest of the
 *    app when it is talking too, so the background music drops and reward
 *    chimes wait: words competing with music is the other half of why a word is
 *    hard to make out.
 */

export interface VoiceChoice extends VoiceRank {
  id: string;
}

/** App level speeds. 1 is normal grown up speech, lower is slower and kinder. */
const DEFAULT_LINE_SPEED = DEFAULT_SENTENCE_PACE;
const DEFAULT_WORD_SPEED = DEFAULT_WORD_PACE;

let voices: VoiceChoice[] = [];
let chosenVoiceId: string | null = null;
let speechEnabled = true;
let lineSpeed = DEFAULT_LINE_SPEED;
let wordSpeed = DEFAULT_WORD_SPEED;
let loaded = false;


/** Reads the installed voices once and returns them best first. */
export async function loadVoices(preferredId: string | null = null): Promise<VoiceChoice[]> {
  try {
    const available = await Speech.getAvailableVoicesAsync();
    voices = available
      .map((voice) => {
        const rank = rankVoice({
          name: voice.name,
          identifier: voice.identifier,
          language: voice.language,
          quality: String(voice.quality ?? 'default'),
        });
        return { ...rank, id: voice.identifier };
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

/** What the parent zone needs to tell the truth about the voice in use. */
export interface VoiceReport {
  /** The voice name shown to a grown up. */
  name: string;
  kind: VoiceKind;
  /** False for the muddy compact voices, which is what the hint is for. */
  clear: boolean;
  /** False when the device listed no usable voices at all. */
  known: boolean;
  /** The steps to a clearer voice, ready to show beside an unclear one. */
  steps: string;
}

/**
 * The voice that will actually read the words, judged honestly.
 *
 * When no voice has been chosen the app hands the job to the system default,
 * which is the same compact voice the device lists as its best English one on
 * a phone where nothing was ever downloaded. That is the case worth telling a
 * grown up about, so the report falls back to the best English voice it can see
 * rather than claiming everything is fine.
 */
export function activeVoiceReport(): VoiceReport {
  const id = getVoiceId();
  const chosen = id === null ? undefined : voices.find((voice) => voice.id === id);
  const english = englishVoices();
  const fallback = english.find((voice) => voice.score > 0) ?? english[0];
  const voice = chosen ?? fallback;
  if (voice === undefined) {
    return { name: 'the device voice', kind: 'standard', clear: true, known: false, steps: CLEARER_VOICE_STEPS };
  }
  const kind = classifyVoice(voice);
  return { name: voice.name, kind, clear: voiceIsClear(kind), known: true, steps: CLEARER_VOICE_STEPS };
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
const LEAD_IN_MS = 130;

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
  return Math.round(speechMsFor(step.text, step.speed) * 2.2) + 300 + step.pauseAfter;
}

/** The language the chosen voice actually speaks, so its phonetics are its own. */
function languageOfCurrentVoice(): string {
  const id = getVoiceId();
  const voice = id === null ? undefined : voices.find((entry) => entry.id === id);
  return languageForVoice(voice);
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
        rate: speechRateFor(step.speed),
        pitch: step.pitch,
        language: languageOfCurrentVoice(),
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
  speakSteps([{ text: clean, speed: options.rate ?? lineSpeed, pitch: options.pitch ?? SENTENCE_PITCH, pauseAfter: 0 }]);
}

/** Says a word once at the dictation pace. Pass rate to slow it down further. */
export function speakWord(word: string, options: Speech.SpeechOptions = {}): void {
  const text = spokenWord(word);
  if (text.length === 0) return;
  const letters = cleanWord(word).length;
  speakSteps([
    {
      text: asSentence(text),
      speed: dictatedPace(wordSpeed * (options.rate ?? 1), 1, letters),
      pitch: options.pitch ?? WORD_PITCH,
      pauseAfter: 0,
    },
  ]);
}

/** The word twice, with a real gap, then nothing to cut off. */
export function speakWordSlow(word: string): void {
  const text = spokenWord(word);
  if (text.length === 0) return;
  const said = asSentence(text);
  const letters = cleanWord(word).length;
  speakSteps([
    { text: said, speed: dictatedPace(wordSpeed, 1, letters), pitch: WORD_PITCH, pauseAfter: 680 },
    { text: said, speed: dictatedPace(wordSpeed, 0.9, letters), pitch: WORD_PITCH, pauseAfter: 0 },
  ]);
}

/**
 * Turns the plan a pure module built into utterances. The pace for a step is the
 * dictation pace from the settings, scaled by the factor the plan asked for and
 * then held inside the band a word can be read clearly in, so a plan can say
 * "the same word, a little slower" without ever dragging the voice into the
 * range where it stretches vowels and smears endings. Every step is spoken on
 * its own, which is what keeps a letter name or a sound from running into the
 * next.
 */
function speakPlan(plan: SpeechStep[], letters: number): void {
  if (plan.length === 0) return;
  speakSteps(
    plan.map((step) => ({
      text: step.text,
      speed: dictatedPace(wordSpeed, step.speedFactor, letters),
      pitch: WORD_PITCH,
      pauseAfter: step.pauseAfterMs,
    })),
  );
}

/**
 * Says the word, then each of its sounds with a word that proves the sound,
 * then the word twice more, which is the order a grown up uses at the kitchen
 * table: it is the practice plan in src/lib/phonemes.ts.
 */
export function soundOut(word: string): void {
  speakPlan(dictationSteps(word, 'practice'), cleanWord(word).length);
}

/** One step per letter, so each letter name lands on its own. */
function letterSteps(word: string, pauseAfter: number): Step[] {
  return spokenLetterList(word).map((name) => ({ text: `${name},`, speed: lineSpeed, pitch: SENTENCE_PITCH, pauseAfter }));
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
      ...(text.length === 0
        ? []
        : [{ text: asSentence(text), speed: dictatedPace(wordSpeed, 1, cleanWord(word).length), pitch: WORD_PITCH, pauseAfter: 0 }]),
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
  const count = cleanWord(word).length;
  speakSteps([
    { text: said, speed: dictatedPace(wordSpeed, 1, count), pitch: WORD_PITCH, pauseAfter: 520 },
    ...letters,
    { text: said, speed: dictatedPace(wordSpeed, 0.9, count), pitch: WORD_PITCH, pauseAfter: 0 },
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
  const count = cleanWord(word ?? '').length;
  if (clean.length > 0) steps.push({ text: clean, speed: lineSpeed, pitch: SENTENCE_PITCH, pauseAfter: said.length > 0 ? 680 : 0 });
  if (said.length > 0) {
    steps.push({ text: said, speed: dictatedPace(wordSpeed, 1, count), pitch: WORD_PITCH, pauseAfter: 620 });
    steps.push({ text: said, speed: dictatedPace(wordSpeed, 0.9, count), pitch: WORD_PITCH, pauseAfter: 0 });
  }
  if (steps.length === 0) return;
  speakSteps(steps);
}

/**
 * Dictates a spelling word. Practice includes the sounds, because that is how a
 * child learns the word; a test says it plainly three times, because that is
 * what a school test sounds like. Which is which lives in the pure plan.
 */
export function dictateWord(word: string, phase: 'practice' | 'test' = 'practice'): void {
  speakPlan(dictationSteps(word, phase), cleanWord(word).length);
}

/**
 * The rescue after a miss: the word, then the sound it ends with and a word that
 * proves it. This exists because "/p/" at the end of a word is the quietest
 * sound a phone speaker has to reproduce, and a child who was marked wrong for
 * spelling what they actually heard deserves to be told what the ending was.
 */
export function hintEnding(word: string): void {
  speakPlan(endingHintSteps(word), cleanWord(word).length);
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
