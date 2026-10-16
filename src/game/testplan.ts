import { CustomListWord, TestPhase, TestPlanState } from '../types';
import { mulberry32 } from './session';

/**
 * The study plan behind "My Spelling Test". A grown up types in the words from
 * this week's school test and the app then teaches them one at a time, drills
 * them with the word hidden, then gives a real dictation test. Any word that is
 * missed is taught again in a fresh round until the whole list is passed.
 *
 * Everything here is a pure function so the whole plan can be tested without a
 * device.
 */

export const MAX_WORDS_PER_LIST = 30;
export const MAX_WORD_LENGTH = 14;
/** A spelling test is passed by spelling every word correctly. */
export const PASS_SCORE = 100;
/** Extra letters dropped into the tray for the test phase, so it is not an anagram. */
export const TEST_DECOYS = 4;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export interface WordListReport {
  words: string[];
  /** Tokens that were dropped, so the screen can say what it ignored. */
  rejected: string[];
  duplicateCount: number;
  tooLongCount: number;
  cappedCount: number;
}

/** Splits anything a grown up pastes, cleans it up and reports what was dropped. */
export function inspectWordList(input: string): WordListReport {
  const rejected: string[] = [];
  const seen = new Set<string>();
  const words: string[] = [];
  let duplicateCount = 0;
  let tooLongCount = 0;
  let cappedCount = 0;

  for (const rawToken of input.split(/[\s,;]+/)) {
    const token = rawToken.trim();
    if (token.length === 0) continue;
    const letters = token.toUpperCase().replace(/[^A-Z]/g, '');
    if (letters.length === 0) {
      rejected.push(token);
      continue;
    }
    if (letters.length > MAX_WORD_LENGTH) {
      tooLongCount += 1;
      rejected.push(token);
      continue;
    }
    if (seen.has(letters)) {
      duplicateCount += 1;
      continue;
    }
    if (words.length >= MAX_WORDS_PER_LIST) {
      cappedCount += 1;
      continue;
    }
    seen.add(letters);
    words.push(letters);
  }

  return { words, rejected, duplicateCount, tooLongCount, cappedCount };
}

export function parseWordList(input: string): string[] {
  return inspectWordList(input).words;
}

const shuffle = <T,>(items: T[], rand: () => number): T[] => {
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
};

export function createTestPlan(listId: string, words: string[], round = 1): TestPlanState {
  return {
    listId,
    round,
    phase: 'learn',
    order: words.slice(),
    index: 0,
    roundResults: {},
    missed: [],
    lastScore: 0,
    passed: false,
  };
}

export function currentWord(plan: TestPlanState): string | null {
  return plan.order[plan.index] ?? null;
}

export function planProgress(plan: TestPlanState): { done: number; total: number } {
  return { done: Math.min(plan.index, plan.order.length), total: plan.order.length };
}

export function phaseTitle(phase: TestPhase): string {
  switch (phase) {
    case 'learn':
      return 'Learn the word';
    case 'practice':
      return 'Practice from memory';
    case 'test':
      return 'Spelling test';
    default:
      return 'Test passed';
  }
}

export function phaseHint(phase: TestPhase): string {
  switch (phase) {
    case 'learn':
      return 'Look at the word, listen, then build it with the letters';
    case 'practice':
      return 'The word is hiding now. Spell what you heard';
    case 'test':
      return 'Listen carefully and spell it. One try for each word';
    default:
      return 'You passed this spelling test';
  }
}

/** Letters offered in the tray, shuffled, with extra decoys only in the test. */
export function buildTrayLetters(word: string, phase: TestPhase, seed = 1, decoys = TEST_DECOYS): string[] {
  const rand = mulberry32(seed);
  const base = word.split('');
  if (phase !== 'test') return shuffle(base, rand);
  const extras = ALPHABET.filter((letter) => !base.includes(letter));
  const picked = shuffle(extras, rand).slice(0, Math.max(0, decoys));
  return shuffle(base.concat(picked), rand);
}

/** The letters read out loud, for example "C, A, T". */
export function spokenSpelling(word: string): string {
  return word
    .split('')
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1');
}

function recordAnswer(plan: TestPlanState, word: string, correct: boolean): TestPlanState {
  const previous = plan.roundResults[word];
  const roundResults = { ...plan.roundResults, [word]: correct && previous !== false };
  const missed = correct ? plan.missed : plan.missed.includes(word) ? plan.missed : [...plan.missed, word];
  return { ...plan, roundResults, missed };
}

/** Learn phase never punishes: the word is visible and the child copies it. */
export function recordLearn(plan: TestPlanState, correct: boolean): TestPlanState {
  const word = currentWord(plan);
  if (word === null) return plan;
  const withResult = recordAnswer(plan, word, correct);
  return { ...withResult, index: plan.index + 1 };
}

/** Practice phase is the same build but from memory, still with the letters. */
export function recordPractice(plan: TestPlanState, correct: boolean): TestPlanState {
  return recordLearn(plan, correct);
}

/** Test phase is dictation: the result counts towards passing the list. */
export function recordTest(plan: TestPlanState, correct: boolean): TestPlanState {
  const word = currentWord(plan);
  if (word === null) return plan;
  const withResult = recordAnswer(plan, word, correct);
  const index = plan.index + 1;
  if (index < plan.order.length) return { ...withResult, index };
  const total = plan.order.length;
  const right = plan.order.filter((entry) => withResult.roundResults[entry] === true).length;
  const score = total === 0 ? 100 : Math.round((right / total) * 100);
  return { ...withResult, index, lastScore: score };
}

export function isRoundComplete(plan: TestPlanState): boolean {
  return plan.phase === 'test' && plan.index >= plan.order.length;
}

export function roundPassed(plan: TestPlanState): boolean {
  return isRoundComplete(plan) && plan.lastScore >= PASS_SCORE && plan.missed.length === 0;
}

/**
 * Moves from a finished test to either the celebration or a fresh round that
 * teaches only the words that were missed.
 */
export function nextRound(plan: TestPlanState): TestPlanState {
  if (!isRoundComplete(plan)) return plan;
  if (plan.missed.length === 0 && plan.lastScore >= PASS_SCORE) {
    return { ...plan, phase: 'done', passed: true };
  }
  return {
    listId: plan.listId,
    round: plan.round + 1,
    phase: 'learn',
    order: plan.missed.slice(),
    index: 0,
    roundResults: {},
    missed: [],
    lastScore: plan.lastScore,
    passed: false,
  };
}

/** Moves from learn to practice to test, and from test back to review. */
export function advancePhase(plan: TestPlanState): TestPlanState {
  if (plan.phase === 'learn' && plan.index >= plan.order.length) {
    return { ...plan, phase: 'practice', index: 0, roundResults: {}, missed: [] };
  }
  if (plan.phase === 'practice' && plan.index >= plan.order.length) {
    return { ...plan, phase: 'test', index: 0, roundResults: {}, missed: [] };
  }
  return plan;
}

export function isPhaseComplete(plan: TestPlanState): boolean {
  return plan.index >= plan.order.length;
}

export function emptyResult(word: string): CustomListWord {
  return { word, correct: 0, wrong: 0, passed: false };
}

/** Merges one round's answers into the list record kept in the save file. */
export function mergeResults(
  results: Record<string, CustomListWord>,
  words: string[],
  roundResults: Record<string, boolean>,
): Record<string, CustomListWord> {
  const next = { ...results };
  for (const word of words) {
    const previous = next[word] ?? emptyResult(word);
    const correct = roundResults[word] === true;
    next[word] = {
      word,
      correct: previous.correct + (correct ? 1 : 0),
      wrong: previous.wrong + (correct ? 0 : 1),
      // Once a word has been passed in a real test it stays passed.
      passed: previous.passed || correct,
    };
  }
  return next;
}

/** Counts a practice attempt without ever marking the word as passed. */
export function bumpCounters(
  results: Record<string, CustomListWord>,
  word: string,
  correct: boolean,
): Record<string, CustomListWord> {
  const previous = results[word] ?? emptyResult(word);
  return {
    ...results,
    [word]: {
      ...previous,
      correct: previous.correct + (correct ? 1 : 0),
      wrong: previous.wrong + (correct ? 0 : 1),
    },
  };
}

export function listProgress(results: Record<string, CustomListWord>, words: string[]): { passed: number; total: number } {
  const passed = words.filter((word) => results[word]?.passed === true).length;
  return { passed, total: words.length };
}

export function wordsToReview(results: Record<string, CustomListWord>, words: string[]): string[] {
  return words.filter((word) => results[word]?.passed !== true);
}

export function makeListId(seed: number = Date.now()): string {
  return `list_${seed.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export function defaultListName(day: string): string {
  return `Spelling test ${day}`;
}
