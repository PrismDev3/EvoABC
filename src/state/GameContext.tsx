import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  Crate,
  CustomList,
  DailyReward,
  HatchResult,
  Level,
  LevelProgress,
  PlayerProfile,
  SessionState,
  SessionSummary,
  Settings,
  Skin,
  TestPlanState,
  WordTag,
} from '../types';
import {
  advancePhase,
  bumpCounters,
  createTestPlan,
  currentWord,
  defaultListName,
  makeListId,
  mergeResults,
  nextRound,
  recordLearn,
  recordTest,
  wordsToReview,
} from '../game/testplan';
import { VoiceChoice, configureTts, describeCurrentVoice, loadVoices, speakLine, speakWord, stopSpeech, teachWord } from '../lib/tts';
import { lookupWord } from '../data/words';
import { STAGES, skinById } from '../data/dinosaurs';
import { CRATES, crateById } from '../data/crates';
import { ALL_LEVELS, getLevel, isLevelUnlocked, regionStars, totalStars } from '../data/levels';
import { DinoStage } from '../types';
import { applyXp, stageIndexForLevel, STARTER_COINS, STARTER_GEMS } from '../game/economy';
import { SessionOutcome, advance as advanceSession, answerQuestion, createSession, sessionOutcome } from '../game/session';
import { rollCrate } from '../game/loot';
import { dayKey, nextStreak, rewardForCycle } from '../game/streak';
import { defaultProfile, clearProfile, loadProfile, saveProfile } from '../lib/storage';
import { configureAudio, playSfx, playRoar, setMusicEnabled, setSfxEnabled, startMusic, preloadSfx } from '../audio/sfx';
import { configureFeedback, haptic } from '../lib/feedback';

export interface TestRoundResult {
  passed: boolean;
  missed: string[];
  score: number;
  leveledUp: boolean;
  evolved: boolean;
  stageName: string;
}

export interface DailyClaim {
  reward: DailyReward;
  bonus: number;
  streakCount: number;
}

export interface GameApi {
  ready: boolean;
  profile: PlayerProfile;
  stage: DinoStage;
  stageIndex: number;
  equippedSkin: Skin;
  activeCompanion: Skin | null;
  ownedDinos: Skin[];
  ownedCompanions: Skin[];
  totalStars: number;
  nextLevel: Level;
  session: SessionState | null;
  lastSummary: SessionSummary | null;
  canClaimDaily: boolean;
  dailyPreview: DailyReward;
  // session flow
  startLevel: (levelId: string) => void;
  answer: (correct: boolean) => void;
  nextQuestion: () => void;
  finishLevel: () => SessionSummary | null;
  abandonLevel: () => void;
  // collection and shop
  crateStatus: (crateId: string) => { unlocked: boolean; owned: number; affordable: boolean; reason: string };
  buyCrate: (crateId: string) => HatchResult;
  openStoredEgg: (crateId: string) => HatchResult;
  equipSkin: (skinId: string) => void;
  setCompanion: (skinId: string | null) => void;
  claimDaily: () => DailyClaim | null;
  // my spelling test: a school list the grown up types in
  customLists: CustomList[];
  activeList: CustomList | null;
  testPlan: TestPlanState | null;
  createList: (name: string, words: string[]) => CustomList;
  renameList: (listId: string, name: string) => void;
  deleteList: (listId: string) => void;
  startTestPlan: (listId: string, mode: 'all' | 'missed') => void;
  testAnswer: (correct: boolean) => void;
  advanceTestPhase: () => void;
  finishTestRound: () => TestRoundResult | null;
  exitTestPlan: () => void;
  // voice
  voices: VoiceChoice[];
  voiceLabel: string;
  chooseVoice: (id: string | null) => void;
  previewVoice: () => void;
  speakTestWord: (word: string) => void;
  // housekeeping
  completeOnboarding: (starterSkinId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetProfile: () => void;
  levelProgress: (levelId: string) => LevelProgress;
  unlocked: (levelId: string) => boolean;
  starsForRegion: (regionId: string) => number;
  wordStats: () => { correct: number; wrong: number };
}

const GameContext = createContext<GameApi | null>(null);

export function useGame(): GameApi {
  const context = useContext(GameContext);
  if (context === null) throw new Error('useGame must be used inside the GameProvider');
  return context;
}

const EMPTY_PROGRESS: LevelProgress = { stars: 0, cleared: false, attempts: 0, best: 0 };

/** One place where per word practice counters are written, used by levels and tests. */
function applyWordStats(profile: PlayerProfile, word: string, tag: WordTag, correct: boolean, bestCombo?: number): PlayerProfile {
  const tagStats = profile.stats.perTag[tag] ?? { correct: 0, wrong: 0 };
  const wordEntry = profile.stats.perWord[word] ?? { correct: 0, wrong: 0 };
  return {
    ...profile,
    stats: {
      ...profile.stats,
      correct: profile.stats.correct + (correct ? 1 : 0),
      wrong: profile.stats.wrong + (correct ? 0 : 1),
      bestCombo: Math.max(profile.stats.bestCombo, bestCombo ?? profile.stats.bestCombo),
      perTag: {
        ...profile.stats.perTag,
        [tag]: { correct: tagStats.correct + (correct ? 1 : 0), wrong: tagStats.wrong + (correct ? 0 : 1) },
      },
      perWord: {
        ...profile.stats.perWord,
        [word]: { correct: wordEntry.correct + (correct ? 1 : 0), wrong: wordEntry.wrong + (correct ? 0 : 1) },
      },
    },
  };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>(() => defaultProfile());
  const [session, setSession] = useState<SessionState | null>(null);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [testPlan, setTestPlan] = useState<TestPlanState | null>(null);
  const [voices, setVoices] = useState<VoiceChoice[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Boot: load the save file, then wire sound and haptics to the settings.
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await configureAudio();
      const loaded = await loadProfile();
      if (cancelled) return;
      setProfile(loaded);
      setSfxEnabled(loaded.settings.sfx);
      setMusicEnabled(loaded.settings.music);
      configureFeedback({ haptics: loaded.settings.haptics, speech: loaded.settings.speech, speechRate: loaded.settings.speechRate });
      configureTts({
        enabled: loaded.settings.speech,
        speechRate: loaded.settings.speechRate,
        dictationRate: loaded.settings.dictationRate,
        voiceId: loaded.settings.voiceId,
      });
      preloadSfx();
      // Read the installed voices once and prefer the best English one available.
      const installed = await loadVoices(loaded.settings.voiceId);
      if (!cancelled) setVoices(installed);
      if (loaded.settings.music && loaded.onboarded) startMusic();
      setReady(true);
    };
    boot().catch((error) => {
      console.warn('EvoABC failed to boot.', error);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced autosave so rapid taps never hammer the disk.
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProfile(profile).catch(() => {
        // storage helper already logs
      });
    }, 350);
    return () => {
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    };
  }, [profile, ready]);

  const stageIndex = stageIndexForLevel(profile.level);
  const stage = STAGES[Math.min(stageIndex, STAGES.length - 1)] ?? STAGES[0];
  const equippedSkin = skinById(profile.equippedSkinId);
  const activeCompanion = profile.activeCompanionId === null ? null : skinById(profile.activeCompanionId);
  const ownedDinos = useMemo(() => profile.ownedSkinIds.map(skinById), [profile.ownedSkinIds]);
  const ownedCompanions = useMemo(() => profile.companionIds.map(skinById), [profile.companionIds]);
  const stars = useMemo(() => totalStars(profile.progress), [profile.progress]);

  const nextLevel = useMemo(() => {
    const found = ALL_LEVELS.find((level) => isLevelUnlocked(level.id, profile.progress) && !(profile.progress[level.id]?.cleared ?? false));
    return found ?? ALL_LEVELS[0];
  }, [profile.progress]);

  const canClaimDaily = profile.streak.lastClaimDay !== dayKey();

  const dailyPreview = useMemo(() => rewardForCycle(profile.streak.cycleIndex + 1), [profile.streak.cycleIndex]);

  const levelProgress = useCallback((levelId: string) => profile.progress[levelId] ?? EMPTY_PROGRESS, [profile.progress]);
  const unlocked = useCallback((levelId: string) => isLevelUnlocked(levelId, profile.progress), [profile.progress]);
  const starsForRegion = useCallback(
    (regionId: string) => {
      const region = { id: regionId, levels: ALL_LEVELS.filter((level) => level.regionId === regionId) } as Parameters<typeof regionStars>[0];
      return regionStars(region, profile.progress);
    },
    [profile.progress],
  );

  const startLevel = useCallback((levelId: string) => {
    const level = getLevel(levelId);
    const fresh = createSession(level, Math.floor(Math.random() * 100000) + 7);
    setSession(fresh);
    setLastSummary(null);
    setProfile((current) => {
      const previous = current.progress[level.id] ?? EMPTY_PROGRESS;
      return {
        ...current,
        progress: { ...current.progress, [level.id]: { ...previous, attempts: previous.attempts + 1 } },
      };
    });
    playSfx('whoosh');
    haptic('select');
  }, []);

  const answer = useCallback(
    (correct: boolean) => {
      if (session === null || session.outcome !== 'playing') return;
      const question = session.queue[session.index];
      const next = answerQuestion(session, correct);
      setSession(next);
      const word = question?.word;
      if (correct) {
        playSfx('correct');
        if (next.combo > 0 && next.combo % 4 === 0) {
          playRoar();
          playSfx('combo');
          haptic('heavy');
        } else {
          playSfx('coin');
          haptic('success');
        }
      } else {
        playSfx('wrong');
        haptic('error');
      }
      if (word !== undefined) {
        setProfile((current) => applyWordStats(current, word.word, word.tag, correct, next.bestCombo));
      }
    },
    [session],
  );

  const nextQuestion = useCallback(() => {
    setSession((current) => (current === null ? current : advanceSession(current)));
  }, []);

  const finishLevel = useCallback((): SessionSummary | null => {
    if (session === null) return null;
    const level = getLevel(session.levelId);
    const outcome: SessionOutcome = sessionOutcome(session, level);
    const xpResult = applyXp(profile.level, profile.xp, outcome.xp);
    const stageBefore = stageIndexForLevel(profile.level);
    const stageAfter = stageIndexForLevel(xpResult.level);
    const previous = profile.progress[level.id] ?? EMPTY_PROGRESS;
    const nextProgress: Record<string, LevelProgress> = {
      ...profile.progress,
      [level.id]: {
        stars: Math.max(previous.stars, outcome.stars),
        cleared: previous.cleared || outcome.won,
        attempts: previous.attempts,
        best: Math.max(previous.best, outcome.stars),
      },
    };
    const starsAfter = totalStars(nextProgress);
    const newlyUnlocked = CRATES.find((crate) => crate.unlockStars > stars && crate.unlockStars <= starsAfter);

    const summary: SessionSummary = {
      levelId: level.id,
      regionId: level.regionId,
      title: level.title,
      won: outcome.won,
      stars: outcome.stars,
      correct: session.correct,
      mistakes: session.mistakes,
      bestCombo: session.bestCombo,
      coins: outcome.coins,
      gems: outcome.gems,
      xp: outcome.xp,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.level,
      evolved: stageAfter > profile.seenStageIndex,
      stageName: STAGES[Math.min(stageAfter, STAGES.length - 1)]?.name ?? stage.name,
      totalStars: starsAfter,
      unlockedCrate: newlyUnlocked?.id ?? null,
    };

    setProfile((current) => ({
      ...current,
      level: xpResult.level,
      xp: xpResult.xp,
      coins: current.coins + outcome.coins,
      gems: current.gems + outcome.gems,
      stars: starsAfter,
      progress: nextProgress,
      stats: {
        ...current.stats,
        sessions: current.stats.sessions + 1,
        levelsCleared: current.stats.levelsCleared + (outcome.won ? 1 : 0),
      },
      seenStageIndex: Math.max(current.seenStageIndex, stageAfter),
      lastPlayedDay: dayKey(),
      // A brand new egg from the shop shelf is a nice surprise after a good run.
      eggs: newlyUnlocked !== undefined ? { ...current.eggs, [newlyUnlocked.id]: (current.eggs[newlyUnlocked.id] ?? 0) + 1 } : current.eggs,
    }));

    setLastSummary(summary);
    setSession(null);
    playSfx(outcome.won ? 'victory' : 'lose');
    haptic(outcome.won ? 'success' : 'warning');
    if (stageAfter > stageBefore) {
      playSfx('evolve');
      playRoar();
    }
    return summary;
  }, [profile, session, stage.name, stars]);

  const abandonLevel = useCallback(() => {
    setSession(null);
  }, []);

  const crateStatus = useCallback(
    (crateId: string) => {
      const crate = crateById(crateId);
      const owned = profile.eggs[crateId] ?? 0;
      const unlockedFlag = stars >= crate.unlockStars;
      const affordable = crate.currency === 'coins' ? profile.coins >= crate.cost : profile.gems >= crate.cost;
      let reason = '';
      if (!unlockedFlag) reason = `Earn ${crate.unlockStars - stars} more stars to unlock`;
      else if (!affordable && owned === 0) reason = `Needs ${crate.cost} ${crate.currency}`;
      return { unlocked: unlockedFlag, owned, affordable, reason };
    },
    [profile.coins, profile.eggs, profile.gems, stars],
  );

  const grantEggResult = useCallback(
    (crate: Crate, spawnRoar: boolean): HatchResult => {
      const owned = crate.pool === 'companions' ? profile.companionIds : profile.ownedSkinIds;
      const roll = rollCrate({ crate, ownedIds: owned, rand: Math.random });
      const skin = roll.skin;
      if (skin === undefined) return { ok: false, error: 'This egg was empty' };
      if (roll.duplicate) {
        setProfile((current) => ({ ...current, gems: current.gems + roll.gemsBack }));
        return { ok: true, skin, duplicate: true, gemsBack: roll.gemsBack };
      }
      setProfile((current) => ({
        ...current,
        ownedSkinIds: crate.pool === 'companions' ? current.ownedSkinIds : [...current.ownedSkinIds, skin.id],
        companionIds: crate.pool === 'companions' ? [...current.companionIds, skin.id] : current.companionIds,
        activeCompanionId: crate.pool === 'companions' && current.activeCompanionId === null ? skin.id : current.activeCompanionId,
        stats: { ...current.stats, eggsHatched: current.stats.eggsHatched + 1 },
      }));
      playSfx('hatch');
      if (spawnRoar) playRoar();
      haptic('success');
      return { ok: true, skin, duplicate: false, gemsBack: 0 };
    },
    [profile.companionIds, profile.ownedSkinIds],
  );

  const buyCrate = useCallback(
    (crateId: string): HatchResult => {
      const crate = crateById(crateId);
      const status = crateStatus(crateId);
      if (!status.unlocked) return { ok: false, error: status.reason };
      if (!status.affordable) return { ok: false, error: `You need ${crate.cost} ${crate.currency}` };
      setProfile((current) => ({
        ...current,
        coins: crate.currency === 'coins' ? current.coins - crate.cost : current.coins,
        gems: crate.currency === 'gems' ? current.gems - crate.cost : current.gems,
        stats: { ...current.stats, eggsHatched: current.stats.eggsHatched + 1 },
      }));
      return grantEggResult(crate, true);
    },
    [crateStatus, grantEggResult],
  );

  const openStoredEgg = useCallback(
    (crateId: string): HatchResult => {
      const crate = crateById(crateId);
      const owned = profile.eggs[crateId] ?? 0;
      if (owned <= 0) return { ok: false, error: 'No eggs of this kind yet' };
      setProfile((current) => ({
        ...current,
        eggs: { ...current.eggs, [crateId]: Math.max(0, (current.eggs[crateId] ?? 0) - 1) },
      }));
      return grantEggResult(crate, true);
    },
    [grantEggResult, profile.eggs],
  );

  const equipSkin = useCallback((skinId: string) => {
    setProfile((current) => (current.ownedSkinIds.includes(skinId) ? { ...current, equippedSkinId: skinId } : current));
    playSfx('tap');
    haptic('select');
  }, []);

  const setCompanion = useCallback((skinId: string | null) => {
    setProfile((current) => {
      if (skinId === null) return { ...current, activeCompanionId: null };
      if (!current.companionIds.includes(skinId)) return current;
      return { ...current, activeCompanionId: skinId };
    });
    playSfx('tap');
    haptic('select');
  }, []);

  const claimDaily = useCallback((): DailyClaim | null => {
    const today = dayKey();
    if (profile.streak.lastClaimDay === today) return null;
    const streak = nextStreak(profile.streak, today);
    const reward = rewardForCycle(streak.cycleIndex);
    const landing = [3, 7, 14, 30].includes(streak.count) ? streak.count * 50 : 0;
    setProfile((current) => ({
      ...current,
      streak,
      coins: current.coins + (reward.coins ?? 0) + landing,
      gems: current.gems + (reward.gems ?? 0),
      eggs: reward.crateId !== undefined ? { ...current.eggs, [reward.crateId]: (current.eggs[reward.crateId] ?? 0) + 1 } : current.eggs,
    }));
    playSfx('daily');
    playRoar();
    haptic('success');
    return { reward, bonus: landing, streakCount: streak.count };
  }, [profile.streak]);

  const activeList = useMemo(
    () => (testPlan === null ? null : profile.customLists.find((list) => list.id === testPlan.listId) ?? null),
    [profile.customLists, testPlan],
  );

  const createList = useCallback((name: string, words: string[]): CustomList => {
    const now = new Date().toISOString();
    const list: CustomList = {
      id: makeListId(),
      name: name.trim().length > 0 ? name.trim() : defaultListName(dayKey()),
      words: words.slice(),
      createdAt: now,
      updatedAt: now,
      round: 0,
      passed: false,
      bestScore: 0,
      lastPlayedDay: null,
      results: {},
    };
    setProfile((current) => ({ ...current, customLists: [...current.customLists, list] }));
    playSfx('daily');
    haptic('success');
    return list;
  }, []);

  const renameList = useCallback((listId: string, name: string) => {
    const clean = name.trim();
    setProfile((current) => ({
      ...current,
      customLists: current.customLists.map((list) =>
        list.id === listId ? { ...list, name: clean.length > 0 ? clean : list.name, updatedAt: new Date().toISOString() } : list,
      ),
    }));
  }, []);

  const deleteList = useCallback((listId: string) => {
    setTestPlan((current) => (current !== null && current.listId === listId ? null : current));
    setProfile((current) => ({ ...current, customLists: current.customLists.filter((list) => list.id !== listId) }));
    playSfx('whoosh');
  }, []);

  const startTestPlan = useCallback(
    (listId: string, mode: 'all' | 'missed') => {
      const list = profile.customLists.find((entry) => entry.id === listId);
      if (list === undefined) return;
      const requested = mode === 'missed' ? wordsToReview(list.results, list.words) : list.words.slice();
      const order = requested.length > 0 ? requested : list.words.slice();
      setTestPlan(createTestPlan(listId, order, list.round + 1));
      setProfile((current) => ({
        ...current,
        customLists: current.customLists.map((entry) =>
          entry.id === listId ? { ...entry, lastPlayedDay: dayKey() } : entry,
        ),
      }));
      playSfx('whoosh');
      haptic('select');
    },
    [profile.customLists],
  );

  const testAnswer = useCallback(
    (correct: boolean) => {
      if (testPlan === null) return;
      const word = currentWord(testPlan);
      if (word === null) return;
      const next = testPlan.phase === 'test' ? recordTest(testPlan, correct) : recordLearn(testPlan, correct);
      setTestPlan(next);
      const entry = lookupWord(word);
      const tag: WordTag = entry?.tag ?? 'cvc';
      setProfile((current) => {
        const withStats = applyWordStats(current, word, tag, correct);
        return {
          ...withStats,
          customLists: withStats.customLists.map((list) => {
            if (list.id !== testPlan.listId) return list;
            const results =
              testPlan.phase === 'test'
                ? mergeResults(list.results, [word], { [word]: correct })
                : bumpCounters(list.results, word, correct);
            return { ...list, results, updatedAt: new Date().toISOString() };
          }),
        };
      });
      if (correct) {
        playSfx('correct');
        haptic('success');
        if (testPlan.phase === 'test') speakLine('That is right.');
      } else {
        playSfx('wrong');
        haptic('error');
        // A teacher answers a miss by saying the word and spelling it out.
        teachWord(word);
      }
    },
    [testPlan],
  );

  const advanceTestPhase = useCallback(() => {
    setTestPlan((current) => (current === null ? current : advancePhase(current)));
  }, []);

  const finishTestRound = useCallback((): TestRoundResult | null => {
    if (testPlan === null) return null;
    const missed = testPlan.missed.slice();
    const score = testPlan.lastScore;
    const finished = nextRound(testPlan);
    const passed = finished.phase === 'done' && finished.passed;
    const xpGain = passed ? 140 : 25;
    const stageBefore = stageIndexForLevel(profile.level);
    const xpResult = applyXp(profile.level, profile.xp, xpGain);
    const stageAfter = stageIndexForLevel(xpResult.level);
    setTestPlan(finished);
    setProfile((current) => ({
      ...current,
      coins: current.coins + (passed ? 250 : 25),
      gems: current.gems + (passed ? 6 : 0),
      level: xpResult.level,
      xp: xpResult.xp,
      seenStageIndex: Math.max(current.seenStageIndex, stageAfter),
      customLists: current.customLists.map((list) =>
        list.id === testPlan.listId
          ? {
              ...list,
              round: list.round + 1,
              passed: list.passed || passed,
              bestScore: Math.max(list.bestScore, score),
              updatedAt: new Date().toISOString(),
            }
          : list,
      ),
    }));
    if (passed) {
      playSfx('victory');
      playRoar();
      haptic('success');
    } else {
      playSfx('combo');
      haptic('warning');
    }
    return {
      passed,
      missed,
      score,
      leveledUp: xpResult.leveledUp,
      evolved: stageAfter > stageBefore,
      stageName: STAGES[Math.min(stageAfter, STAGES.length - 1)]?.name ?? stage.name,
    };
  }, [profile.level, profile.xp, stage.name, testPlan]);

  const exitTestPlan = useCallback(() => {
    setTestPlan(null);
    stopSpeech();
  }, []);

  const voiceLabel = useMemo(() => describeCurrentVoice(), [profile.settings.voiceId, voices]);

  const chooseVoice = useCallback(
    (id: string | null) => {
      const chosen = id === null ? null : voices.find((voice) => voice.id === id) ?? null;
      setProfile((current) => ({
        ...current,
        settings: { ...current.settings, voiceId: id, voiceName: chosen?.name ?? null },
      }));
      configureTts({
        enabled: profile.settings.speech,
        speechRate: profile.settings.speechRate,
        dictationRate: profile.settings.dictationRate,
        voiceId: id,
      });
      speakLine(chosen === null ? 'This is the system voice.' : `Hi, I am ${chosen.name}. Let us spell.`);
    },
    [profile.settings, voices],
  );

  // The same teaching sequence a child hears for a new word: the word, the
  // letter names, then the word again, all on the chosen voice and pace.
  const previewVoice = useCallback(() => {
    teachWord('CAT');
  }, []);

  const speakTestWord = useCallback((word: string) => {
    speakWord(word);
  }, []);

  const completeOnboarding = useCallback((starterSkinId: string) => {
    setProfile((current) => ({
      ...current,
      onboarded: true,
      starterSkinId,
      equippedSkinId: starterSkinId,
      ownedSkinIds: Array.from(new Set([...current.ownedSkinIds, starterSkinId])),
      coins: Math.max(current.coins, STARTER_COINS),
      gems: Math.max(current.gems, STARTER_GEMS),
    }));
    if (profile.settings.music) startMusic();
  }, [profile.settings.music]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setProfile((current) => {
      const settings = { ...current.settings, ...patch };
      setSfxEnabled(settings.sfx);
      setMusicEnabled(settings.music);
      configureFeedback({ haptics: settings.haptics, speech: settings.speech, speechRate: settings.speechRate });
      configureTts({
        enabled: settings.speech,
        speechRate: settings.speechRate,
        dictationRate: settings.dictationRate,
        voiceId: settings.voiceId,
      });
      return { ...current, settings };
    });
  }, []);

  const resetProfile = useCallback(() => {
    setSession(null);
    setLastSummary(null);
    clearProfile()
      .catch(() => {
        // storage helper already logs
      })
      .finally(() => {
        const fresh = defaultProfile();
        setProfile(fresh);
        setSfxEnabled(fresh.settings.sfx);
        setMusicEnabled(fresh.settings.music);
        configureFeedback({ haptics: fresh.settings.haptics, speech: fresh.settings.speech, speechRate: fresh.settings.speechRate });
      });
  }, []);

  const wordStats = useCallback(() => {
    return { correct: profile.stats.correct, wrong: profile.stats.wrong };
  }, [profile.stats.correct, profile.stats.wrong]);

  const value = useMemo<GameApi>(
    () => ({
      ready,
      profile,
      stage,
      stageIndex,
      equippedSkin,
      activeCompanion,
      ownedDinos,
      ownedCompanions,
      totalStars: stars,
      nextLevel,
      session,
      lastSummary,
      canClaimDaily,
      dailyPreview,
      startLevel,
      answer,
      nextQuestion,
      finishLevel,
      abandonLevel,
      crateStatus,
      buyCrate,
      openStoredEgg,
      equipSkin,
      setCompanion,
      claimDaily,
      completeOnboarding,
      updateSettings,
      resetProfile,
      levelProgress,
      unlocked,
      starsForRegion,
      wordStats,
      customLists: profile.customLists,
      activeList,
      testPlan,
      createList,
      renameList,
      deleteList,
      startTestPlan,
      testAnswer,
      advanceTestPhase,
      finishTestRound,
      exitTestPlan,
      voices,
      voiceLabel,
      chooseVoice,
      previewVoice,
      speakTestWord,
    }),
    [
      ready,
      profile,
      stage,
      stageIndex,
      equippedSkin,
      activeCompanion,
      ownedDinos,
      ownedCompanions,
      stars,
      nextLevel,
      session,
      lastSummary,
      canClaimDaily,
      dailyPreview,
      startLevel,
      answer,
      nextQuestion,
      finishLevel,
      abandonLevel,
      crateStatus,
      buyCrate,
      openStoredEgg,
      equipSkin,
      setCompanion,
      claimDaily,
      completeOnboarding,
      updateSettings,
      resetProfile,
      levelProgress,
      unlocked,
      starsForRegion,
      wordStats,
      activeList,
      testPlan,
      createList,
      renameList,
      deleteList,
      startTestPlan,
      testAnswer,
      advanceTestPhase,
      finishTestRound,
      exitTestPlan,
      voices,
      voiceLabel,
      chooseVoice,
      previewVoice,
      speakTestWord,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
