import { Crate, DailyReward } from '../types';

/** Mystery egg crates. Stars unlock the shop shelf, coins or gems buy the egg. */
export const CRATES: Crate[] = [
  {
    id: 'egg_mossy',
    name: 'Mossy Egg',
    blurb: 'A cosy starter egg from Fern Valley.',
    cost: 400,
    currency: 'coins',
    gradient: ['#9BE39B', '#3DDC84'],
    unlockStars: 0,
    pool: 'dinosaurs',
    weights: { common: 76, rare: 19, epic: 4.2, legendary: 0.8 },
  },
  {
    id: 'egg_buddy',
    name: 'Buddy Egg',
    blurb: 'Hatches a little companion that follows you.',
    cost: 5,
    currency: 'gems',
    gradient: ['#FFC48A', '#FF8A5C'],
    unlockStars: 18,
    pool: 'companions',
    weights: { common: 52, rare: 38, epic: 10, legendary: 0 },
  },
  {
    id: 'egg_crystal',
    name: 'Crystal Egg',
    blurb: 'Shiny shell, much better odds of a rare dino.',
    cost: 1200,
    currency: 'coins',
    gradient: ['#9BE7FF', '#1899CC'],
    unlockStars: 30,
    pool: 'dinosaurs',
    weights: { common: 34, rare: 46, epic: 17, legendary: 3 },
  },
  {
    id: 'egg_kaiju',
    name: 'Kaiju Egg',
    blurb: 'Something huge is scratching from inside.',
    cost: 6,
    currency: 'gems',
    gradient: ['#B39CFF', '#5533D6'],
    unlockStars: 45,
    pool: 'dinosaurs',
    weights: { common: 0, rare: 30, epic: 54, legendary: 16 },
  },
  {
    id: 'egg_titan',
    name: 'Titan Egg',
    blurb: 'Legendary only. The rarest egg in the valley.',
    cost: 15,
    currency: 'gems',
    gradient: ['#FFE07A', '#D9930B'],
    unlockStars: 70,
    pool: 'dinosaurs',
    weights: { common: 0, rare: 0, epic: 68, legendary: 32 },
  },
];

export function crateById(id: string): Crate {
  return CRATES.find((crate) => crate.id === id) ?? CRATES[0];
}

/** Seven day streak cycle, then it repeats with a bigger bonus egg. */
export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, label: '100 coins', coins: 100 },
  { day: 2, label: '5 gems', gems: 5 },
  { day: 3, label: 'Buddy Egg', crateId: 'egg_buddy' },
  { day: 4, label: '250 coins', coins: 250 },
  { day: 5, label: '10 gems', gems: 10 },
  { day: 6, label: 'Mossy Egg', crateId: 'egg_mossy' },
  { day: 7, label: 'Kaiju Egg', crateId: 'egg_kaiju' },
];

export const STREAK_MILESTONES: { days: number; label: string; bonus: number }[] = [
  { days: 3, label: 'Three day flame', bonus: 100 },
  { days: 7, label: 'One week streak', bonus: 300 },
  { days: 14, label: 'Two week blaze', bonus: 700 },
  { days: 30, label: 'Dino legend month', bonus: 2000 },
];
