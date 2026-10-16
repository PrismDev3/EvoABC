import { Level } from '../types';
import { STAGES } from '../data/dinosaurs';

/**
 * All the numbers that make the reward loop feel good live here, as pure
 * functions, so they can be tested without React.
 */

export const STARTER_COINS = 150;
export const STARTER_GEMS = 3;

/** XP needed to move from `level` to the next one. */
export function xpForLevel(level: number): number {
  const safe = Math.max(1, Math.floor(level));
  return 60 + (safe - 1) * 35;
}

export function xpForCorrect(combo: number, attempt: number): number {
  const base = attempt === 0 ? 12 : 6;
  const comboBonus = Math.min(6, Math.floor(combo / 3) * 2);
  return base + comboBonus;
}

export function coinsForCorrect(combo: number, attempt: number): number {
  const base = attempt === 0 ? 5 : 2;
  return base + Math.min(10, combo * 2);
}

export function starsForLevel(mistakes: number, won: boolean): number {
  if (!won) return 0;
  if (mistakes === 0) return 3;
  if (mistakes === 1) return 2;
  return 1;
}

export function levelBonusCoins(level: Level, stars: number): number {
  return level.reward.coins + stars * 12;
}

export function levelBonusGems(level: Level, stars: number): number {
  return level.reward.gems + (stars === 3 ? 1 : 0);
}

/** Applies gained XP to a level plus in level XP pair. */
export function applyXp(level: number, xp: number, gained: number): { level: number; xp: number; leveledUp: boolean; levelsGained: number } {
  let nextLevel = Math.max(1, Math.floor(level));
  let nextXp = xp + gained;
  let levelsGained = 0;
  while (nextXp >= xpForLevel(nextLevel)) {
    nextXp -= xpForLevel(nextLevel);
    nextLevel += 1;
    levelsGained += 1;
  }
  return { level: nextLevel, xp: nextXp, leveledUp: levelsGained > 0, levelsGained };
}

export function stageIndexForLevel(level: number): number {
  let index = 0;
  STAGES.forEach((stage, i) => {
    if (level >= stage.minLevel) index = i;
  });
  return index;
}

/** Total XP banked across every level, used for the parent report. */
export function lifetimeXp(level: number, xp: number): number {
  let total = xp;
  for (let i = 1; i < level; i += 1) total += xpForLevel(i);
  return total;
}

export const UPGRADE_COSTS = {
  heartRefill: 60,
  streakFreeze: 120,
} as const;
