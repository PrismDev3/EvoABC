import { Level, LevelProgress, Region, WordEntry } from '../types';
import { REGION_SEEDS, RegionSeed } from './words';

/** Six levels per region, five words per level. */
export const WORDS_PER_LEVEL = 5;
export const LEVELS_PER_REGION = 6;

const rotate = <T,>(items: T[], start: number, count: number): T[] => {
  const out: T[] = [];
  if (items.length === 0) return out;
  for (let i = 0; i < count; i += 1) {
    const item = items[(start + i) % items.length];
    if (item !== undefined) out.push(item);
  }
  return out;
};

function buildLevels(regionId: string, pool: WordEntry[]): Level[] {
  const levels: Level[] = [];
  for (let i = 0; i < LEVELS_PER_REGION; i += 1) {
    const boss = i === LEVELS_PER_REGION - 1;
    levels.push({
      id: `${regionId}_l${i + 1}`,
      regionId,
      index: i,
      title: boss ? `Boss Trial ${i + 1}` : `Level ${i + 1}`,
      words: rotate(pool, i * 2, WORDS_PER_LEVEL),
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
  emoji: seed.emoji,
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
