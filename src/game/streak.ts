import { DailyReward, StreakState } from '../types';
import { DAILY_REWARDS } from '../data/crates';

/** Local calendar day key such as 2026-10-15, no timezone surprises. */
export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysBetween(fromKey: string, toKey: string): number {
  const from = new Date(`${fromKey}T00:00:00`);
  const to = new Date(`${toKey}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return Number.MAX_SAFE_INTEGER;
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function canClaimToday(streak: StreakState, today: string = dayKey()): boolean {
  return streak.lastClaimDay !== today;
}

/** Claiming after a normal day adds one, a skipped day resets, same day is ignored. */
export function nextStreak(streak: StreakState, today: string = dayKey()): StreakState {
  if (streak.lastClaimDay === today) return streak;
  const gap = streak.lastClaimDay === null ? 1 : daysBetween(streak.lastClaimDay, today);
  const count = streak.lastClaimDay === null || gap > 1 ? 1 : streak.count + 1;
  return {
    count,
    best: Math.max(streak.best, count),
    lastClaimDay: today,
    claimedToday: true,
    cycleIndex: streak.cycleIndex >= DAILY_REWARDS.length ? 1 : streak.cycleIndex + 1,
  };
}

export function rewardForCycle(cycleIndex: number): DailyReward {
  const index = ((cycleIndex - 1) % DAILY_REWARDS.length + DAILY_REWARDS.length) % DAILY_REWARDS.length;
  return DAILY_REWARDS[index] ?? DAILY_REWARDS[0];
}

export function streakFlameTier(count: number): number {
  if (count >= 30) return 4;
  if (count >= 14) return 3;
  if (count >= 7) return 2;
  if (count >= 3) return 1;
  return 0;
}

export const FLAME_COLORS = ['#FFC531', '#FF9A3C', '#FF6B35', '#FF3D5F', '#8A2BE2'];
