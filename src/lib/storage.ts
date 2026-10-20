import AsyncStorage from '@react-native-async-storage/async-storage';

import { PlayerProfile, WordTag } from '../types';
import { STARTER_COINS, STARTER_GEMS } from '../game/economy';
import { DEFAULT_REMINDER_TIMES } from '../game/reminders';
import { DEFAULT_SENTENCE_PACE, DEFAULT_WORD_PACE, nearestPace } from './speechProfile';

export const PROFILE_VERSION = 2;
const STORAGE_KEY = 'evoabc:profile:v1';

const emptyTagStats = (): Record<WordTag, { correct: number; wrong: number }> => ({
  cvc: { correct: 0, wrong: 0 },
  sight: { correct: 0, wrong: 0 },
  blend: { correct: 0, wrong: 0 },
  digraph: { correct: 0, wrong: 0 },
  silent: { correct: 0, wrong: 0 },
  magicE: { correct: 0, wrong: 0 },
  vowelteam: { correct: 0, wrong: 0 },
  bossyR: { correct: 0, wrong: 0 },
  ending: { correct: 0, wrong: 0 },
  compound: { correct: 0, wrong: 0 },
  dino: { correct: 0, wrong: 0 },
});

export function defaultProfile(): PlayerProfile {
  return {
    version: PROFILE_VERSION,
    onboarded: false,
    starterSkinId: 'rex_verdant',
    equippedSkinId: 'rex_verdant',
    activeCompanionId: null,
    xp: 0,
    level: 1,
    coins: STARTER_COINS,
    gems: STARTER_GEMS,
    stars: 0,
    ownedSkinIds: ['rex_verdant'],
    companionIds: [],
    eggs: {},
    progress: {},
    customLists: [],
    streak: { count: 0, best: 0, lastClaimDay: null, claimedToday: false, cycleIndex: 0 },
    settings: {
      sfx: true,
      music: true,
      haptics: true,
      speech: true,
      speechRate: DEFAULT_SENTENCE_PACE,
      voiceId: null,
      voiceName: null,
      dictationRate: DEFAULT_WORD_PACE,
      // Reminders start off on purpose. iOS only shows the permission prompt
      // once, so it is asked for when a grown up turns them on, or from the
      // card on the home screen, rather than in the middle of first run.
      reminders: false,
      reminderTimes: DEFAULT_REMINDER_TIMES.slice(),
    },
    stats: {
      correct: 0,
      wrong: 0,
      bestCombo: 0,
      sessions: 0,
      levelsCleared: 0,
      eggsHatched: 0,
      perTag: emptyTagStats(),
      perWord: {},
    },
    seenStageIndex: 0,
    createdAt: new Date().toISOString(),
    lastPlayedDay: null,
  };
}

/** A saved reminder schedule that is always usable and in order. */
function sanitiseReminderTimes(value: unknown): number[] {
  if (!Array.isArray(value)) return DEFAULT_REMINDER_TIMES.slice();
  const clean = value
    .filter((minute): minute is number => typeof minute === 'number' && Number.isFinite(minute))
    .map((minute) => Math.round(minute))
    .filter((minute) => minute >= 0 && minute < 1440);
  const unique = Array.from(new Set(clean)).sort((a, b) => a - b);
  return unique.length > 0 ? unique : DEFAULT_REMINDER_TIMES.slice();
}

/** Fills in anything a newer build added so old saves keep working. */
export function migrateProfile(raw: unknown): PlayerProfile {
  const base = defaultProfile();
  if (raw === null || typeof raw !== 'object') return base;
  const input = raw as Partial<PlayerProfile>;
  return {
    ...base,
    ...input,
    settings: {
      ...base.settings,
      ...(input.settings ?? {}),
      // A save from a build before reminders existed has no times saved, and a
      // hand edited file could hold rubbish, so the list is checked here too.
      reminderTimes: sanitiseReminderTimes((input.settings ?? {}).reminderTimes),
      // Paces are snapped onto the three the app offers. A save made by an
      // earlier build can hold 0.6 or 0.72, paces so slow that the voice engine
      // stretched every vowel and the settings screen could no longer show a
      // choice that matched, so both are moved to the nearest readable pace.
      speechRate: nearestPace(input.settings?.speechRate ?? DEFAULT_SENTENCE_PACE),
      dictationRate: nearestPace(input.settings?.dictationRate ?? DEFAULT_WORD_PACE),
    },
    streak: { ...base.streak, ...(input.streak ?? {}) },
    stats: {
      ...base.stats,
      ...(input.stats ?? {}),
      perTag: { ...base.stats.perTag, ...(input.stats?.perTag ?? {}) },
      perWord: { ...base.stats.perWord, ...(input.stats?.perWord ?? {}) },
    },
    progress: input.progress ?? {},
    eggs: input.eggs ?? {},
    customLists: (input.customLists ?? []).filter(
      (list) => list !== null && typeof list === 'object' && typeof list.id === 'string' && Array.isArray(list.words),
    ),
    ownedSkinIds: input.ownedSkinIds && input.ownedSkinIds.length > 0 ? input.ownedSkinIds : base.ownedSkinIds,
    companionIds: input.companionIds ?? [],
    version: PROFILE_VERSION,
  };
}

export async function loadProfile(): Promise<PlayerProfile> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === null) return defaultProfile();
    return migrateProfile(JSON.parse(stored));
  } catch (error) {
    console.warn('EvoABC could not read the saved profile, starting fresh.', error);
    return defaultProfile();
  }
}

export async function saveProfile(profile: PlayerProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn('EvoABC could not save the profile.', error);
  }
}

export async function clearProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('EvoABC could not clear the profile.', error);
  }
}
