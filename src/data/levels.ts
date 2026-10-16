import { Level, LevelProgress, Region, WordEntry } from '../types';
import { REGION_SEEDS, RegionSeed } from './words';

/** Six levels per region, five words per level. */
export const WORDS_PER_LEVEL = 5;
export const LEVELS_PER_REGION = 6;

/** A stable number from a region id, so every install meets the words in the same order. */
function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** A deterministic shuffle, so the trail is identical on every device. */
function shuffled<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = out.length - 1; index > 0; index -= 1) {
    const j = Math.floor(next() * (index + 1));
    const a = out[index];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[index] = b;
      out[j] = a;
    }
  }
  return out;
}

/**
 * Deals the region's words into six levels of five.
 *
 * This used to rotate the pool by two words per level, which put the same word
 * in three levels in a row and made a whole region feel like one word on
 * repeat. Instead every level gets its own shuffle and the words the child has
 * just practised are pushed to the back of the queue, so a word never comes
 * back in the level straight after it and never twice inside one level. With a
 * pool of ten words or more, two levels in a row share nothing at all.
 */
function buildLevels(regionId: string, pool: WordEntry[]): Level[] {
  const levels: Level[] = [];

  for (let i = 0; i < LEVELS_PER_REGION; i += 1) {
    const boss = i === LEVELS_PER_REGION - 1;
    const previousWords = new Set((levels[levels.length - 1]?.words ?? []).map((word) => word.word));
    const order = shuffled(pool, hashSeed(`${regionId}:l${i + 1}`));
    const words: WordEntry[] = [];

    for (const word of [...order.filter((item) => !previousWords.has(item.word)), ...order.filter((item) => previousWords.has(item.word))]) {
      if (words.length >= WORDS_PER_LEVEL) break;
      if (!words.some((entry) => entry.word === word.word)) words.push(word);
    }

    levels.push({
      id: `${regionId}_l${i + 1}`,
      regionId,
      index: i,
      title: boss ? `Boss Trial ${i + 1}` : `Level ${i + 1}`,
      words,
      boss,
      reward: { coins: 30 + i * 6 + (boss ? 40 : 0), gems: boss ? 2 : 0 },
    });
  }
  return levels;
}

export const REGIONS: Region[] = REGION_SEEDS.map((seed: RegionSeed) => ({
  id: seed.id,
  name: seed.name,
  blurb: seed.blurb,
  tag: seed.tag,
  cue: seed.cue,
  gradient: seed.gradient,
  accent: seed.accent,
  unit: seed.unit,
  rule: seed.rule,
  words: seed.words,
  levels: buildLevels(seed.id, seed.words),
}));

export const ALL_LEVELS: Level[] = REGIONS.flatMap((region) => region.levels);

/** Every region id mapped to stars available in it: six levels, three stars each. */
export const STARS_PER_REGION = LEVELS_PER_REGION * 3;

export function getRegion(id: string): Region {
  return REGIONS.find((region) => region.id === id) ?? REGIONS[0];
}

export function getLevel(id: string): Level {
  return ALL_LEVELS.find((level) => level.id === id) ?? ALL_LEVELS[0];
}

export function levelNumber(id: string): number {
  const index = ALL_LEVELS.findIndex((level) => level.id === id);
  return index < 0 ? 1 : index + 1;
}

export function findWord(word: string): WordEntry | null {
  const upper = word.toUpperCase();
  for (const region of REGIONS) {
    const match = region.words.find((entry) => entry.word === upper);
    if (match !== undefined) return match;
  }
  return null;
}

/** A hint for a word that is not in the school word bank. */
export function describeUnknownWord(word: string): string {
  return `School word with ${word.length} letters`;
}

const progressOf = (progress: Record<string, LevelProgress>, level: Level): LevelProgress =>
  progress[level.id] ?? { stars: 0, cleared: false, attempts: 0, best: 0 };

/**
 * A level opens as soon as the one before it has a star. Three attempts are
 * always allowed even without a star so a stuck speller is never walled off.
 */
export function isLevelUnlocked(levelId: string, progress: Record<string, LevelProgress>): boolean {
  const index = ALL_LEVELS.findIndex((level) => level.id === levelId);
  if (index <= 0) return true;
  const previous = ALL_LEVELS[index - 1];
  if (previous === undefined) return true;
  const prevProgress = progressOf(progress, previous);
  return prevProgress.cleared || prevProgress.attempts >= 3;
}

export function totalStars(progress: Record<string, LevelProgress>): number {
  return Object.values(progress).reduce((sum, entry) => sum + (entry.stars ?? 0), 0);
}

export function clearedCount(progress: Record<string, LevelProgress>): number {
  return Object.values(progress).filter((entry) => entry.cleared).length;
}

export function regionStars(region: Region, progress: Record<string, LevelProgress>): number {
  return region.levels.reduce((sum, level) => sum + progressOf(progress, level).stars, 0);
}

export function unitProgress(
  unitId: string,
  progress: Record<string, LevelProgress>,
): { stars: number; total: number; cleared: number; levels: number } {
  const regions = REGIONS.filter((region) => region.unit === unitId);
  const stars = regions.reduce((sum, region) => sum + regionStars(region, progress), 0);
  const levels = regions.reduce((sum, region) => sum + region.levels.length, 0);
  const cleared = regions.reduce(
    (sum, region) => sum + region.levels.filter((level) => (progress[level.id]?.cleared ?? false)).length,
    0,
  );
  return { stars, total: levels * 3, cleared, levels };
}

export function nextPlayableLevel(progress: Record<string, LevelProgress>): Level {
  const found = ALL_LEVELS.find((level) => isLevelUnlocked(level.id, progress) && !progressOf(progress, level).cleared);
  return found ?? ALL_LEVELS[ALL_LEVELS.length - 1] ?? ALL_LEVELS[0];
}

export function levelAfter(levelId: string): Level | null {
  const index = ALL_LEVELS.findIndex((level) => level.id === levelId);
  if (index < 0 || index + 1 >= ALL_LEVELS.length) return null;
  return ALL_LEVELS[index + 1] ?? null;
}
