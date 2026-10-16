import { Level, PlayMode, SessionQuestion, SessionState, WordEntry } from '../types';
import { coinsForCorrect, levelBonusCoins, levelBonusGems, starsForLevel, xpForCorrect } from './economy';

/**
 * One learning session is one level. The session is a plain object so the
 * whole spelling flow can be tested by calling these functions directly.
 */

export const MAX_HEARTS = 3;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const CONSONANTS = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'W', 'Y', 'Z'];

/** Letters that are easy to mix up with the answer make better distractors. */
const CONFUSABLES: Record<string, string[]> = {
  A: ['E', 'O', 'U'],
  E: ['A', 'I', 'O'],
  I: ['E', 'Y', 'O'],
  O: ['A', 'U', 'E'],
  U: ['O', 'A', 'E'],
  B: ['D', 'P', 'V'],
  C: ['K', 'S', 'G'],
  D: ['B', 'T', 'G'],
  F: ['V', 'P', 'H'],
  G: ['C', 'J', 'D'],
  H: ['N', 'F', 'K'],
  J: ['G', 'Y', 'Z'],
  K: ['C', 'G', 'X'],
  L: ['R', 'T', 'I'],
  M: ['N', 'W', 'H'],
  N: ['M', 'H', 'R'],
  P: ['B', 'Q', 'T'],
  Q: ['P', 'G', 'K'],
  R: ['L', 'W', 'N'],
  S: ['C', 'Z', 'T'],
  T: ['D', 'P', 'F'],
  V: ['F', 'W', 'B'],
  W: ['M', 'V', 'U'],
  X: ['K', 'S', 'Z'],
  Y: ['I', 'J', 'W'],
  Z: ['S', 'X', 'J'],
};

function pickDistractors(answer: string, rand: () => number): string[] {
  const pool = shuffle([...(CONFUSABLES[answer] ?? []), ...(VOWELS.includes(answer) ? VOWELS : CONSONANTS)], rand);
  const out: string[] = [];
  for (const letter of pool) {
    if (letter !== answer && !out.includes(letter)) out.push(letter);
    if (out.length === 3) break;
  }
  return out;
}

function modeFor(index: number, word: WordEntry): PlayMode {
  if (word.word.length <= 3) {
    if (word.tag === 'sight') return index % 2 === 0 ? 'listen' : 'missing';
    return 'build';
  }
  if (word.tag === 'sight') return index % 2 === 0 ? 'listen' : 'build';
  if (word.tag === 'dino') return index % 2 === 0 ? 'build' : 'listen';
  return index % 3 === 1 ? 'missing' : index % 3 === 2 ? 'listen' : 'build';
}

export function buildQuestion(word: WordEntry, index: number, rand: () => number, attempt = 0): SessionQuestion {
  const mode = attempt > 0 ? 'build' : modeFor(index, word);
  const letters = word.word.split('');
  const missingIndex = mode === 'missing' ? Math.max(1, Math.floor(rand() * (letters.length - 1)) + (letters.length > 4 ? 1 : 0)) % letters.length : 0;
  const answerLetter = letters[missingIndex] ?? 'A';
  const choices = mode === 'missing' ? shuffle([answerLetter, ...pickDistractors(answerLetter, rand)], rand) : [];
  return {
    word,
    mode,
    letters: shuffle(letters, rand),
    missingIndex,
    choices,
    attempt,
  };
}

export function createSession(level: Level, seed = Date.now()): SessionState {
  const rand = mulberry32(seed);
  const queue = level.words.map((word, index) => buildQuestion(word, index, rand));
  const first = queue[0];
  return {
    levelId: level.id,
    regionId: level.regionId,
    title: level.title,
    mode: first?.mode ?? 'build',
    queue,
    index: 0,
    total: level.words.length,
    hearts: MAX_HEARTS,
    maxHearts: MAX_HEARTS,
    combo: 0,
    bestCombo: 0,
    correct: 0,
    mistakes: 0,
    coins: 0,
    gems: 0,
    xp: 0,
    outcome: 'playing',
    lastAnswer: null,
    finished: false,
  };
}

export function currentQuestion(session: SessionState): SessionQuestion | null {
  return session.queue[session.index] ?? null;
}

/** Records an answer. Wrong answers requeue the word for another try later. */
export function answerQuestion(session: SessionState, correct: boolean): SessionState {
  if (session.outcome !== 'playing') return session;
  const question = currentQuestion(session);
  if (question === null) return { ...session, finished: true, outcome: 'won' };

  if (correct) {
    const combo = session.combo + 1;
    return {
      ...session,
      combo,
      bestCombo: Math.max(session.bestCombo, combo),
      correct: session.correct + 1,
      coins: session.coins + coinsForCorrect(combo, question.attempt),
      xp: session.xp + xpForCorrect(combo, question.attempt),
      lastAnswer: { correct: true, word: question.word.word, expected: question.word.word },
    };
  }

  const hearts = session.hearts - 1;
  const queue = session.queue.concat([{ ...question, attempt: question.attempt + 1, mode: 'build' as PlayMode }]);
  return {
    ...session,
    hearts,
    combo: 0,
    mistakes: session.mistakes + 1,
    queue,
    outcome: hearts <= 0 ? 'lost' : 'playing',
    finished: hearts <= 0,
    lastAnswer: { correct: false, word: question.word.word, expected: question.word.word },
  };
}

export function advance(session: SessionState): SessionState {
  if (session.finished) return session;
  const nextIndex = session.index + 1;
  if (nextIndex >= session.queue.length) {
    return { ...session, outcome: 'won', finished: true, lastAnswer: null };
  }
  const next = session.queue[nextIndex];
  return { ...session, index: nextIndex, mode: next?.mode ?? 'build', lastAnswer: null };
}

export interface SessionOutcome {
  won: boolean;
  stars: number;
  coins: number;
  gems: number;
  xp: number;
  wordsAnswered: number;
}

export function sessionOutcome(session: SessionState, level: Level): SessionOutcome {
  const won = session.outcome === 'won';
  const stars = starsForLevel(session.mistakes, won);
  const coins = session.coins + (won ? levelBonusCoins(level, stars) : 0);
  const gems = (won ? levelBonusGems(level, stars) : 0) + session.gems;
  return {
    won,
    stars,
    coins,
    gems,
    xp: session.xp + (won ? stars * 5 : 0),
    wordsAnswered: session.correct,
  };
}

/** Encouraging line used when a session ends with zero hearts left. */
export function encouragement(mistakes: number): string {
  if (mistakes <= 1) return 'So close! One more try and those words are yours.';
  if (mistakes <= 3) return 'Every dino stumbles before it stomps. Try again!';
  return 'Brave effort! Real explorers always take another run.';
}
