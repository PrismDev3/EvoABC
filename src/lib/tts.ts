import * as Speech from 'expo-speech';

/**
 * Text to speech for EvoABC.
 *
 * This deliberately uses the voice built into the device: Apple's voices on
 * iOS and the Google voice engine on Android. Those are neural or high quality
 * system voices, so words sound like a person reading them rather than a
 * robotic desktop synthesiser. The helpers below rank every installed voice and
 * pick the best one, and a grown up can override the choice in the parent zone.
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

let voices: VoiceChoice[] = [];
let chosenVoiceId: string | null = null;
let speechEnabled = true;
let lineRate = 0.85;
let wordRate = 0.72;
let loaded = false;

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
    // Saved voice is gone, for example after an iOS update, so fall back.
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
  lineRate = options.speechRate;
  wordRate = options.dictationRate;
  setVoice(options.voiceId);
}

function utter(text: string, options: Speech.SpeechOptions = {}, onDone?: () => void): void {
  if (!speechEnabled || text.trim().length === 0) {
    onDone?.();
    return;
  }
  const voiceId = getVoiceId();
  try {
    Speech.speak(text, {
      rate: lineRate,
      pitch: 1.02,
      language: 'en-US',
      useApplicationAudioSession: true,
      ...(voiceId !== null ? { voice: voiceId } : {}),
      ...options,
      onDone: () => onDone?.(),
      onError: () => onDone?.(),
    });
  } catch (error) {
    console.warn('EvoABC could not speak.', error);
    onDone?.();
  }
}

/** A spoken line, such as a rule explanation or a praise message. */
export function speakLine(text: string, options: Speech.SpeechOptions = {}): void {
  utter(text, options);
}

/** The word on its own, slowed down so every sound is audible. */
export function speakWord(word: string, options: Speech.SpeechOptions = {}): void {
  utter(word, { rate: options.rate ?? wordRate, pitch: 1, ...options });
}

/** "C, A, and T" then the whole word, which is how teachers correct a spelling. */
export function spellOut(word: string, then?: () => void): void {
  const letters = word
    .split('')
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1');
  utter(letters, { rate: Math.max(0.6, wordRate), pitch: 1 }, () => {
    utter(word, { rate: wordRate, pitch: 1 }, then);
  });
}

/** Says the word, spells it out loud and says it again. The teaching voice. */
export function teachWord(word: string): void {
  utter(word, { rate: wordRate, pitch: 1 }, () => {
    spellOut(word);
  });
}

export function speakSentence(sentence: string, word?: string): void {
  if (word === undefined) {
    utter(sentence, { rate: lineRate, pitch: 1.04 });
    return;
  }
  utter(`${sentence} ${word}.`, { rate: lineRate, pitch: 1.04 });
}

export function stopSpeech(): void {
  Speech.stop().catch(() => {
    // nothing to stop
  });
}

export function ttsRates(): { line: number; word: number } {
  return { line: lineRate, word: wordRate };
}
