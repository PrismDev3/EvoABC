/**
 * Verifies the rules that make EvoABC fair and fun, straight from the pure
 * modules in src/game, with no test framework and no device. Runs in CI and
 * locally with `npm run selfcheck`.
 */

declare const console: { log: (...args: unknown[]) => void; warn: (...args: unknown[]) => void };
declare const process: { exitCode: number };
declare const require: (id: string) => unknown;

/**
 * The icon packs are plain JSON glyph maps, so the self check can prove that
 * every cue points at a glyph that actually exists in the shipped font.
 */
function loadGlyphs(fileName: string): Record<string, number> {
  // The compiled self check lives in .selfcheck/scripts, hence the two hops up.
  try {
    return require(`../../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/${fileName}`) as Record<
      string,
      number
    >;
  } catch {
    throw new Error(
      `Could not read the icon glyph map ${fileName}. If @expo/vector-icons changed where it keeps its fonts, update loadGlyphs in scripts/selfcheck.ts and scripts/list-icons.js together.`,
    );
  }
}

import {
  ALL_LEVELS,
  LEVELS_PER_REGION,
  REGIONS,
  WORDS_PER_LEVEL,
  getLevel,
  isLevelUnlocked,
  nextPlayableLevel,
  regionStars,
  totalStars,
} from '../src/data/levels';
import { UNITS } from '../src/data/wordSeed';
import { REGION_SEEDS, lookupWord } from '../src/data/words';
import { COMPANION_SKINS, DINOSAUR_SKINS, STAGES } from '../src/data/dinosaurs';
import { CRATES, DAILY_REWARDS, crateById } from '../src/data/crates';
import { applyXp, levelBonusGems, stageIndexForLevel, starsForLevel, xpForLevel } from '../src/game/economy';
import { MAX_HEARTS, advance, answerQuestion, buildQuestion, createSession, currentQuestion, sessionOutcome } from '../src/game/session';
import { rollCrate, rollRarity } from '../src/game/loot';
import { dayKey, nextStreak, rewardForCycle } from '../src/game/streak';
import {
  PASS_SCORE,
  advancePhase,
  buildTrayLetters,
  createTestPlan,
  currentWord,
  inspectWordList,
  isRoundComplete,
  nextRound,
  recordLearn,
  recordTest,
  roundPassed,
  spokenSpelling,
} from '../src/game/testplan';
import { chunkWord, detectPattern, patternForWord } from '../src/game/phonics';
import {
  CADENCES,
  DEFAULT_CADENCE,
  DEFAULT_REMINDER_TIMES,
  cadenceFor,
  clockLabel,
  planFitsIosLimit,
  reminderPlan,
  titlesAreDistinct,
} from '../src/game/reminders';
import { CUE_CATALOGS, cueSpec } from '../src/art/cues';
import {
  SOUND_ANCHORS,
  SOUND_NAMES,
  soundChunks,
  dictationSteps,
  endingHintSteps,
  soundOutSteps,
  soundOutText,
  spokenLetterList,
  spokenLetters,
  spokenWord,
  tidySentence,
} from '../src/lib/phonemes';
import {
  CLEARER_VOICE_STEPS,
  SPEECH_FASTEST,
  SPEECH_SLOWEST,
  classifyVoice,
  rankVoice,
  speechPacePercent,
  speechRateFor,
  voiceIsClear,
} from '../src/lib/speechProfile';
import { LevelProgress } from '../src/types';

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail.length > 0 ? ` (${detail})` : ''}`);
    console.log(`  FAIL ${name}${detail.length > 0 ? ` (${detail})` : ''}`);
  }
}

const seeded = (value: number) => () => value;

console.log('\nXP and levels');
check('level 1 needs 60 XP', xpForLevel(1) === 60, String(xpForLevel(1)));
check('enough XP levels up', applyXp(1, 0, 60).level === 2);
check('one short does not level up', applyXp(1, 0, 59).level === 1);
check('overflow XP carries over', applyXp(1, 0, 61).xp === 1, String(applyXp(1, 0, 61).xp));
check('big XP jumps several levels', applyXp(1, 0, 400).levelsGained >= 3, String(applyXp(1, 0, 400).levelsGained));

console.log('\nEvolution stages');
check('level 1 is a hatchling', stageIndexForLevel(1) === 0);
check('level 3 is a teen', stageIndexForLevel(3) === 1);
check('level 6 is armoured', stageIndexForLevel(6) === 2);
check('level 10 is a kaiju', stageIndexForLevel(10) === 3);
check('level 15 is a titan', stageIndexForLevel(15) === 4);
check('stages stay in order', STAGES.every((stage, index) => index === 0 || stage.minLevel > (STAGES[index - 1]?.minLevel ?? 0)));
check('stars match the mistakes', starsForLevel(0, true) === 3 && starsForLevel(1, true) === 2 && starsForLevel(4, true) === 1 && starsForLevel(0, false) === 0);
check('boss levels pay gems', levelBonusGems(crateSafeLevel(), 3) >= 3);

function crateSafeLevel() {
  const boss = ALL_LEVELS.find((level) => level.boss);
  if (boss === undefined) throw new Error('no boss level found');
  return boss;
}

console.log('\nWord bank and levels');
check('twenty nine teaching regions', REGIONS.length === 29, String(REGIONS.length));
check('every seed becomes a region', REGIONS.length === REGION_SEEDS.length, `${REGIONS.length} of ${REGION_SEEDS.length}`);
check('six levels per region', LEVELS_PER_REGION === 6 && REGIONS.every((region) => region.levels.length === 6));
check('five words per level', WORDS_PER_LEVEL === 5 && ALL_LEVELS.every((level) => level.words.length === 5));
check('every level id is unique', new Set(ALL_LEVELS.map((level) => level.id)).size === ALL_LEVELS.length);
check(
  'words are uppercase letters only',
  ALL_LEVELS.every((level) => level.words.every((word) => /^[A-Z]{3,14}$/.test(word.word))),
  String(Math.max(...ALL_LEVELS.flatMap((level) => level.words.map((word) => word.word.length)))),
);
check('every word has a hint', ALL_LEVELS.every((level) => level.words.every((word) => word.hint.length > 3)));
check('regions cover every word type', new Set(REGIONS.map((region) => region.tag)).size >= 5);
check(
  'a level never asks for the same word twice',
  ALL_LEVELS.every((level) => new Set(level.words.map((word) => word.word)).size === level.words.length),
);
check(
  'the words in a level all come from its own region',
  REGIONS.every((region) =>
    region.levels.every((level) => level.words.every((word) => region.words.some((entry) => entry.word === word.word))),
  ),
);
/**
 * Walking a region level by level is the thing a child actually feels, so this
 * counts the words the next level shares with the one just played. A pool of
 * ten words cannot give two levels of five with nothing in common twice over,
 * so the bar is the tightest one the pool allows.
 */
const bounceBacks: string[] = [];
for (const region of REGIONS) {
  const allowed = Math.max(0, WORDS_PER_LEVEL * 2 - region.words.length);
  for (let index = 1; index < region.levels.length; index += 1) {
    const previous = new Set((region.levels[index - 1]?.words ?? []).map((word) => word.word));
    const shared = (region.levels[index]?.words ?? []).filter((word) => previous.has(word.word)).map((word) => word.word);
    if (shared.length > allowed) bounceBacks.push(`${region.id} level ${index + 1}: ${shared.join('+')} of ${region.words.length} words`);
  }
}
check('no word bounces straight back beyond what the pool forces', bounceBacks.length === 0, bounceBacks.slice(0, 4).join(' '));
const tenWordShare = REGIONS.filter((region) => region.words.length === 10).every((region) =>
  region.levels.every((level, index) => {
    if (index === 0) return true;
    const previous = new Set((region.levels[index - 1]?.words ?? []).map((word) => word.word));
    return level.words.every((word) => !previous.has(word.word));
  }),
);
check('a ten word region never repeats a word in the next level', tenWordShare);
const untaught = REGIONS.filter((region) =>
  region.words.some((word) => region.levels.every((level) => level.words.every((entry) => entry.word !== word.word))),
);
check('every word of a region turns up in one of its levels', untaught.length === 0, untaught.slice(0, 4).map((region) => region.id).join(' '));

console.log('\nSessions and hearts');
const firstLevel = ALL_LEVELS[0];
const session = createSession(firstLevel, 42);
check('three hearts to start', session.hearts === MAX_HEARTS && session.maxHearts === 3);
check('five words in the queue', session.queue.length === 5);
check('the first question is ready', currentQuestion(session) !== null);
check('letters keep the word letters', session.queue.every((question) => [...question.letters].sort().join('') === [...question.word.word].sort().join('')));
check('missing letter questions offer four choices', session.queue.every((question) => question.mode !== 'missing' || question.choices.length === 4));
check('missing letter choices include the answer', session.queue.every((question) => question.mode !== 'missing' || question.choices.includes(question.word.word[question.missingIndex] ?? '!')));

const replayA = createSession(firstLevel, 100).queue.map((question) => question.word.word).join(',');
const replayB = createSession(firstLevel, 201).queue.map((question) => question.word.word).join(',');
check('replaying a level asks the words in a fresh order', replayA !== replayB, `${replayA} / ${replayB}`);

let losing = createSession(firstLevel, 7);
const missedWord = losing.queue[0]?.word.word ?? '';
losing = answerQuestion(losing, false);
check('a mistake costs one heart', losing.hearts === 2, String(losing.hearts));
check('the missed word comes back', losing.queue.length === 6);
const retry = losing.queue.find((question) => question.word.word === missedWord && question.attempt === 1);
check('the retry is a build question', retry?.mode === 'build', retry?.mode ?? 'missing');
check('the retry is marked as an attempt', (retry?.attempt ?? 0) === 1);
check('the same word is not served again straight away', losing.queue[1]?.attempt === 0 && losing.queue[1]?.word.word !== missedWord, losing.queue[1]?.word.word ?? 'none');
check('the combo resets on a mistake', losing.combo === 0);
losing = answerQuestion(advance(losing), false);
losing = answerQuestion(advance(losing), false);
check('running out of hearts ends the run', losing.outcome === 'lost' && losing.finished);
check('a lost run still counts the mistakes', losing.mistakes >= 3, String(losing.mistakes));

let winning = createSession(firstLevel, 11);
for (let i = 0; i < 5; i += 1) {
  winning = advance(answerQuestion(winning, true));
}
check('five correct answers win', winning.outcome === 'won' && winning.finished, winning.outcome);
check('a perfect run scores three stars', sessionOutcome(winning, firstLevel).stars === 3);
check('a perfect run pays coins and a gem', sessionOutcome(winning, firstLevel).coins > 0 && sessionOutcome(winning, firstLevel).gems >= 1);
check('a perfect run awards XP', sessionOutcome(winning, firstLevel).xp > 0);

const sloppy = answerQuestion(createSession(firstLevel, 5), false);
const sloppyOutcome = sessionOutcome(advance(sloppy), firstLevel);
check('a careless run scores fewer stars', sloppyOutcome.stars <= 2, String(sloppyOutcome.stars));
check('a combo pays more coins', winning.bestCombo === 5);

console.log('\nQuestion building');
const longWord = { word: 'SPIKES', tag: 'dino' as const, cue: '', hint: 'Sharp points along a tail' };
const built = buildQuestion(longWord, 0, seeded(0.4));
check('build questions shuffle six letters', built.letters.length === 6);
const missing = buildQuestion({ word: 'CAT', tag: 'cvc' as const, cue: '', hint: 'A furry pet' }, 1, seeded(0.5), 0);
check('short words can ask for the missing letter', missing.mode === 'build' || missing.choices.length === 4);

console.log('\nEgg crates and loot');
check('five crates in the shop', CRATES.length === 5);
check('crate odds sum to about one hundred', CRATES.every((crate) => Math.abs(Object.values(crate.weights).reduce((sum, weight) => sum + weight, 0) - 100) < 0.001));
check('the titan egg is legendary heavy', rollRarity(crateById('egg_titan'), 0.9) === 'legendary');
check('the titan egg still rolls epics', rollRarity(crateById('egg_titan'), 0.5) === 'epic');
check('the mossy egg can roll a legendary', rollRarity(crateById('egg_mossy'), 0.999) === 'legendary');
const fresh = rollCrate({ crate: crateById('egg_mossy'), ownedIds: [], rand: seeded(0.3) });
check('a fresh roll gives a real dinosaur', DINOSAUR_SKINS.some((skin) => skin.id === fresh.skin?.id) && fresh.duplicate === false);
const buddyRoll = rollCrate({ crate: crateById('egg_buddy'), ownedIds: [], rand: seeded(0.2) });
check('buddy eggs only hatch companions', COMPANION_SKINS.some((skin) => skin.id === buddyRoll.skin?.id));
const allOwned = DINOSAUR_SKINS.map((skin) => skin.id);
const dupe = rollCrate({ crate: crateById('egg_crystal'), ownedIds: allOwned, rand: seeded(0.6) });
check('a full collection turns into gems', dupe.duplicate === true && (dupe.gemsBack ?? 0) > 0, String(dupe.gemsBack));
const almostOwned = allOwned.filter((id) => id !== DINOSAUR_SKINS[2]?.id);
const lastOne = rollCrate({ crate: crateById('egg_kaiju'), ownedIds: almostOwned, rand: seeded(0.42) });
check('loot prefers what the player does not own yet', lastOne.duplicate === false, lastOne.skin?.id ?? 'none');

console.log('\nDaily streak');
const streakLevel = (value: number) => {
  const ladder = [0, 3, 7, 14];
  return ladder.includes(value) ? value : 1;
};
check('the first claim starts a streak', nextStreak({ count: 0, best: 0, lastClaimDay: null, claimedToday: false, cycleIndex: 0 }, '2026-01-01').count === 1);
check('the same day cannot be claimed twice', nextStreak({ count: 4, best: 4, lastClaimDay: '2026-01-02', claimedToday: true, cycleIndex: 4 }, '2026-01-02').count === 4);
check('the next day continues the streak', nextStreak({ count: 4, best: 4, lastClaimDay: '2026-01-02', claimedToday: false, cycleIndex: 4 }, '2026-01-03').count === 5);
check('a missed day resets to one', nextStreak({ count: 9, best: 9, lastClaimDay: '2026-01-02', claimedToday: false, cycleIndex: 2 }, '2026-01-09').count === 1);
check('the best streak is remembered', nextStreak({ count: 9, best: 12, lastClaimDay: '2026-01-02', claimedToday: false, cycleIndex: 2 }, '2026-01-03').best === 12);
check('seven daily rewards in the cycle', DAILY_REWARDS.length === 7);
check('the seventh day pays an egg', rewardForCycle(7).crateId !== undefined);
check('a day key looks like a date', /^\d{4}-\d{2}-\d{2}$/.test(dayKey(new Date('2026-05-04T10:00:00'))));
check('the cycle wraps around', rewardForCycle(8).day === 1);
check('streak milestones are reachable', streakLevel(3) === 3 && streakLevel(7) === 7);

console.log('\nLevel unlocking');
const empty: Record<string, LevelProgress> = {};
check('the first level is always open', isLevelUnlocked(firstLevel.id, empty));
const secondLevel = ALL_LEVELS[1];
check('the second level starts locked', isLevelUnlocked(secondLevel.id, empty) === false);
const cleared: Record<string, LevelProgress> = { [firstLevel.id]: { stars: 2, cleared: true, attempts: 1, best: 2 } };
check('clearing a level opens the next', isLevelUnlocked(secondLevel.id, cleared));
check('stars add up', totalStars(cleared) === 2);
check('region stars add up', regionStars(REGIONS[0], cleared) === 2);
const stuck: Record<string, LevelProgress> = { [firstLevel.id]: { stars: 0, cleared: false, attempts: 3, best: 0 } };
check('three attempts open the next level anyway', isLevelUnlocked(secondLevel.id, stuck));
check('the recommendation is the first open level', nextPlayableLevel(cleared).id === secondLevel.id);
check('a saved level keeps its words', getLevel(firstLevel.id).words.length === 5);

console.log('\nPractice reminders');
check('three reminder settings are offered', CADENCES.length === 3);
check(
  'every setting lists its times in order',
  CADENCES.every((option) => option.times.every((minute, index) => index === 0 || minute > (option.times[index - 1] ?? 0))),
);
check(
  'no reminder fires in the middle of the night',
  CADENCES.every((option) => option.times.every((minute) => minute >= 900 && minute <= 1290)),
  CADENCES.flatMap((option) => option.times).join(','),
);
check('the shipped setting is five a day', DEFAULT_CADENCE === 'five' && DEFAULT_REMINDER_TIMES.length === 5);
check(
  'the five a day times are 75 minutes apart',
  DEFAULT_REMINDER_TIMES.every((minute, index) => index === 0 || minute - (DEFAULT_REMINDER_TIMES[index - 1] ?? 0) === 75),
  DEFAULT_REMINDER_TIMES.join(','),
);
check('a clock label reads like a clock', clockLabel(960) === '4:00 PM' && clockLabel(1260) === '9:00 PM' && clockLabel(0) === '12:00 AM', clockLabel(960));
check('each setting is recognised from its times', CADENCES.every((option) => cadenceFor(option.times) === option.id));
check('a made up time list is not a setting', cadenceFor([1000, 1001]) === null);

const planFive = reminderPlan({ times: DEFAULT_REMINDER_TIMES, streakCount: 0, playedToday: false, wordsReady: 5 });
check('five reminders are planned', planFive.length === 5, String(planFive.length));
check('the plan keeps the chosen times', planFive.map((reminder) => reminder.minute).join(',') === DEFAULT_REMINDER_TIMES.join(','));
check('no two reminders say the same thing', titlesAreDistinct(planFive));
check('the plan fits inside the iOS limit', planFitsIosLimit(planFive));
check('the first reminder invites a session', planFive[0]?.role === 'open' && planFive[0]?.body.includes('5 words'), planFive[0]?.body ?? 'none');
check('the last reminder is the one that defends the streak', planFive[4]?.role === 'last');
check(
  'a child with no streak is invited, not warned',
  reminderPlan({ times: DEFAULT_REMINDER_TIMES, streakCount: 0, playedToday: false, wordsReady: 5 })[4]?.title === 'One word before bed',
  reminderPlan({ times: DEFAULT_REMINDER_TIMES, streakCount: 0, playedToday: false, wordsReady: 5 })[4]?.title ?? 'none',
);
const streakPlan = reminderPlan({ times: DEFAULT_REMINDER_TIMES, streakCount: 6, playedToday: false, wordsReady: 5 });
check('a streak is named in the last reminder', streakPlan[4]?.title.includes('6 day streak') === true, streakPlan[4]?.title ?? 'none');
const playedPlan = reminderPlan({ times: DEFAULT_REMINDER_TIMES, streakCount: 6, playedToday: true, wordsReady: 5 });
check('a child who already played is nudged once, not three times', playedPlan.length === 1, String(playedPlan.length));
check('the friendly nudge still lands at the last time of day', playedPlan[0]?.minute === (DEFAULT_REMINDER_TIMES[4] ?? 0));
check('reminders can be switched off completely', reminderPlan({ times: [], streakCount: 3, playedToday: false, wordsReady: 5 }).length === 0);
const messyPlan = reminderPlan({ times: [1260, 960, 960, -5, 2000, 1000.6], streakCount: 2, playedToday: false, wordsReady: 5 });
check('odd times are cleaned up and put in order', messyPlan.map((reminder) => reminder.minute).join(',') === '960,1001,1260', messyPlan.map((reminder) => reminder.minute).join(','));
check(
  'every reminder has a short title and a readable line',
  [...planFive, ...streakPlan, ...playedPlan, ...messyPlan].every(
    (reminder) => reminder.title.length > 4 && reminder.title.length <= 44 && reminder.body.length > 12 && reminder.body.length <= 90,
  ),
);
check(
  'reminder copy is plain text a child can read',
  [...planFive, ...streakPlan, ...playedPlan, ...messyPlan].every(
    (reminder) => /^[ -~]+$/.test(reminder.title) && /^[ -~]+$/.test(reminder.body),
  ),
);

console.log('\nMy spelling test: reading the grown up list');
const parsed = inspectWordList('cat, dog\nship');
check('commas, spaces and new lines all split words', parsed.words.join(',') === 'CAT,DOG,SHIP', parsed.words.join(','));
check('pasted words are uppercased', parsed.words.every((word) => word === word.toUpperCase()));
check('punctuation is stripped, not the word', inspectWordList('cat!').words[0] === 'CAT', inspectWordList('cat!').words.join(','));
check('a lone symbol is dropped', inspectWordList('!!!').words.length === 0);
const mixed = inspectWordList('cat 1234');
check('numbers do not become words', mixed.words.length === 1 && mixed.words[0] === 'CAT', mixed.words.join(','));
const repeated = inspectWordList('cat CAT cat');
check('duplicates are dropped', repeated.words.length === 1, String(repeated.words.length));
check('duplicates are counted', repeated.duplicateCount === 2, String(repeated.duplicateCount));
const tooLong = inspectWordList('abcdefghijklmno');
check('a word over fourteen letters is rejected', tooLong.words.length === 0 && tooLong.tooLongCount === 1);
check('a rejected word is reported back', tooLong.rejected.length === 1, String(tooLong.rejected.length));
const manyWords = Array.from(
  { length: 35 },
  (_, index) => `${String.fromCharCode(65 + Math.floor(index / 25))}${String.fromCharCode(65 + (index % 25))}ZZ`,
).join(' ');
const capped = inspectWordList(manyWords);
check('a list is capped at thirty words', capped.words.length === 30, String(capped.words.length));
check('the capped words are counted', capped.cappedCount === 5, String(capped.cappedCount));
check('an empty paste gives no words', inspectWordList('   ').words.length === 0);

console.log('\nMy spelling test: the study plan');
const plan = createTestPlan('list_1', ['CAT', 'DOG']);
check('a plan starts by teaching', plan.phase === 'learn' && plan.index === 0);
check('the plan keeps the word order', plan.order.join(',') === 'CAT,DOG');
check('the first word is up', currentWord(plan) === 'CAT');
check('past the last word there is nothing', currentWord({ ...plan, index: 2 }) === null);
const taughtOnce = recordLearn(plan, true);
check('teaching a word moves on', taughtOnce.index === 1, String(taughtOnce.index));
check('a taught word is marked correct', taughtOnce.roundResults.CAT === true);
check('a partial learn round is not finished', isRoundComplete(taughtOnce) === false);
const taught = recordLearn(taughtOnce, false);
check('the learn phase records a miss as well', taught.roundResults.DOG === false);
const notYetPractising = advancePhase(taughtOnce);
check('a half taught list stays in learning', notYetPractising.phase === 'learn' && notYetPractising.index === 1);
const practising = advancePhase(taught);
check('learning all the words leads to practice', practising.phase === 'practice' && practising.index === 0);
check('practice keeps the same words in order', practising.order.join(',') === 'CAT,DOG');
const testing = advancePhase({ ...practising, index: 2 });
check('practice leads to the test', testing.phase === 'test' && testing.index === 0);
check('a fresh test round starts empty', Object.keys(testing.roundResults).length === 0 && testing.missed.length === 0);
check('the test resets the round index', testing.index === 0);
const firstTest = recordTest(testing, true);
check('a right answer is recorded in the test', firstTest.roundResults.CAT === true);
check('a test round is not finished early', isRoundComplete(firstTest) === false);
const missedTest = recordTest(firstTest, false);
check('a missed word is recorded as wrong', missedTest.roundResults.DOG === false);
check('a missed word is listed for review', missedTest.missed.join(',') === 'DOG', missedTest.missed.join(','));
check('the round finishes after every word', isRoundComplete(missedTest));
check('one miss scores half', missedTest.lastScore === 50, String(missedTest.lastScore));
check('one miss does not pass the test', roundPassed(missedTest) === false);
const redo = nextRound(missedTest);
check('the next round teaches again', redo.phase === 'learn');
check('the next round counts up', redo.round === 2, String(redo.round));
check('only the missed words come back', redo.order.join(',') === 'DOG', redo.order.join(','));
check('the new round starts clean', redo.index === 0 && Object.keys(redo.roundResults).length === 0);
const perfect = recordTest(recordTest(testing, true), true);
check('spelling every word scores one hundred', perfect.lastScore === 100, String(perfect.lastScore));
check('a perfect round passes the test', roundPassed(perfect));
const finishedList = nextRound(perfect);
check('a perfect round finishes the list', finishedList.phase === 'done' && finishedList.passed === true);
check('a passed list is not taught again', nextRound(finishedList) === finishedList);

console.log('\nMy spelling test: letter tiles and dictation');
const learnTray = buildTrayLetters('CAT', 'learn', 5);
check('the learn tray is exactly the word letters', [...learnTray].sort().join('') === 'ACT', learnTray.join(''));
check('the learn tray has no extra letters', learnTray.length === 3, String(learnTray.length));
const testTray = buildTrayLetters('CAT', 'test', 7);
check('the test tray adds decoy letters', testTray.length > 3, String(testTray.length));
check('the test tray still holds every letter of the word', ['C', 'A', 'T'].every((letter) => testTray.includes(letter)));
check('the dictation reads the letters out', spokenSpelling('CAT') === 'C, A and T', spokenSpelling('CAT'));
check('a spelling test is passed only outright', PASS_SCORE === 100);

console.log('\nPattern spotting for words the app has never seen');
const ship = detectPattern('SHIP');
check('sh is spotted', ship !== null && ship.pair === 'sh' && ship.focus.join(',') === '0,1', ship?.pair ?? 'none');
const duck = detectPattern('DUCK');
check('ck is spotted', duck !== null && duck.pair === 'ck', duck?.pair ?? 'none');
const knee = detectPattern('KNEE');
check('kn is spotted as a quiet k', knee !== null && knee.pair === 'kn' && knee.silent.join(',') === '0', `${knee?.pair} silent ${knee?.silent.join(',')}`);
check('the quiet k is not counted as a sound', knee !== null && knee.focus.includes(0) === false);
const write = detectPattern('WRITE');
check('wr is spotted with a quiet w', write !== null && write.pair === 'wr' && write.silent.join(',') === '0', `${write?.pair} silent ${write?.silent.join(',')}`);
const lamb = detectPattern('LAMB');
check('mb is spotted with a quiet b', lamb !== null && lamb.pair === 'mb' && lamb.silent.join(',') === '3', `${lamb?.pair} silent ${lamb?.silent.join(',')}`);
const phone = detectPattern('PHONE');
check('ph is spotted', phone !== null && phone.pair === 'ph', phone?.pair ?? 'none');
const her = detectPattern('HER');
check('the er team is spotted', her !== null && her.pair === 'er', her?.pair ?? 'none');
const jumping = detectPattern('JUMPING');
check('ing at the end of a word is spotted', jumping !== null && jumping.pair === 'ing', jumping?.pair ?? 'none');
const cake = detectPattern('CAKE');
check('the magic e is spotted', cake !== null && cake.pair === 'magic e', cake?.pair ?? 'none');
check('the magic e is silent at the end', cake !== null && cake.silent.join(',') === '3', cake?.silent.join(',') ?? 'none');
check('the magic e points at the vowel', cake !== null && cake.focus.join(',') === '1', cake?.focus.join(',') ?? 'none');
const plain = detectPattern('CAT');
check('a plain word falls back to its short vowel', plain !== null && plain.pair === 'short vowel', plain?.pair ?? 'none');
check('a word with no vowel has no pattern at all', detectPattern('XYZ') === null);
const spikePattern = patternForWord('SPIKES', lookupWord('SPIKES'));
check('the word bank focus beats detection', spikePattern !== null && spikePattern.focus.length === 6, String(spikePattern?.focus.length ?? 0));
check('a fully focused word is one chunk', chunkWord('SPIKES', spikePattern).length === 1, chunkWord('SPIKES', spikePattern).join('|'));
const cakePattern = patternForWord('CAKE', lookupWord('CAKE'));
check('the bank knows the magic e word too', cakePattern !== null && cakePattern.silent.join(',') === '3', cakePattern?.silent.join(',') ?? 'none');
const unknownPattern = patternForWord('SPLASH', null);
check('a word outside the bank is still taught', unknownPattern !== null, unknownPattern?.pair ?? 'none');

console.log('\nPicture cues, not emoji');
const allWordCues = REGIONS.flatMap((region) => region.words.map((word) => word.cue));
const allCues = [...REGIONS.map((region) => region.cue), ...UNITS.map((unit) => unit.cue), ...allWordCues];
/** A real cue key is lowercase kebab case. Anything else, such as an emoji, fails. */
const isCueKey = (key: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(key);
check('every word carries a picture cue', allWordCues.length >= 280, String(allWordCues.length));
check(
  'no cue is still an emoji',
  allCues.every(isCueKey),
  [...new Set(allCues.filter((key) => !isCueKey(key)))].slice(0, 8).join(' '),
);
const missingCues = [...new Set(allCues)].filter((key) => cueSpec(key) === null);
check('every cue key has a picture drawn for it', missingCues.length === 0, `${missingCues.length}: ${missingCues.slice(0, 8).join(', ')}`);
const glyphs: Record<string, Record<string, number>> = {
  mci: loadGlyphs('MaterialCommunityIcons.json'),
  fa6: loadGlyphs('FontAwesome6Free.json'),
};
const badNames: string[] = [];
const conflicts: string[] = [];
const seenCue = new Map<string, string>();
for (const { catalog } of CUE_CATALOGS) {
  for (const [key, spec] of Object.entries(catalog)) {
    const pack = spec.pack ?? 'mci';
    if (glyphs[pack]?.[spec.name] === undefined) badNames.push(`${key}=${pack}:${spec.name}`);
    const id = `${pack}:${spec.name}`;
    const previous = seenCue.get(key);
    if (previous !== undefined && previous !== id) conflicts.push(`${key} (${previous} or ${id})`);
    seenCue.set(key, id);
  }
}
check('every cue points at a real icon name', badNames.length === 0, badNames.slice(0, 8).join(', '));
check('a shared cue key always means the same picture', conflicts.length === 0, conflicts.slice(0, 5).join(', '));
check(
  'the icon library is filled in',
  CUE_CATALOGS.every((entry) => Object.keys(entry.catalog).length > 0),
  CUE_CATALOGS.filter((entry) => Object.keys(entry.catalog).length === 0).map((entry) => entry.file).join(', '),
);

console.log('\nThe voice that reads words out loud');
check('a spelling is dictated with letter names', spokenLetters('CAT') === 'see, ay and tee', spokenLetters('CAT'));
check('one letter is read as its name', spokenLetters('A') === 'ay', spokenLetters('A'));
check('punctuation never reaches the voice', spokenLetters('c-a t!') === 'see, ay and tee', spokenLetters('c-a t!'));
check('a word is said as a word, not as capitals', spokenWord('CAT') === 'Cat', spokenWord('CAT'));
check('a single letter keeps its name', spokenWord('A') === 'A', spokenWord('A'));
check('a spoken line gets one full stop', tidySentence('Hear the word') === 'Hear the word.', tidySentence('Hear the word'));
check('a line that already ends is left alone', tidySentence('Well done!') === 'Well done.', tidySentence('Well done!'));
check('an empty line stays empty', tidySentence('   ') === '');
check('a plain word sounds out letter by letter', soundOutText('CAT') === 'kuh, ah, tuh', String(soundOutText('CAT')));
check(
  'every sound has a real word that proves it',
  Object.keys(SOUND_NAMES).every((key) => (SOUND_ANCHORS[key] ?? '').length > 1),
  Object.keys(SOUND_NAMES).filter((key) => (SOUND_ANCHORS[key] ?? '').length <= 1).join(', '),
);
check('a spelling is dictated one letter at a time', spokenLetterList('CAT').join(',') === 'see,ay,tee', spokenLetterList('CAT').join(','));
check('a letter name is clean for the voice', spokenLetterList('c-a t!').join(',') === 'see,ay,tee');
// A child cannot tell "nap" from "nat" out of a phone speaker, so the ending of
// a word is the thing a dictation has to make certain. These are the rules that
// keep it that way for every word in the curriculum, not just the one that was
// reported.
const practiceNap = dictationSteps('NAP', 'practice');
const testNap = dictationSteps('NAP', 'test');
const napEnding = endingHintSteps('NAP');
check('a practice word is said before it is sounded out', practiceNap[0]?.text === 'Nap.', practiceNap[0]?.text ?? 'none');
check(
  'a practice word names every one of its sounds',
  ['nnn', 'ah', 'puh'].every((sound) => practiceNap.some((step) => step.text.startsWith(`${sound},`))),
  practiceNap.map((step) => step.text).join(' | ').slice(0, 90),
);
check('a practice word ends on the word itself', practiceNap[practiceNap.length - 1]?.text === 'Nap.');
check(
  'the last pass of a practice word is slower than the first',
  (practiceNap[practiceNap.length - 1]?.speedFactor ?? 1) < (practiceNap[0]?.speedFactor ?? 1),
);
check(
  'a test word is the word three times and nothing else',
  testNap.length === 3 && testNap.every((step) => step.text === 'Nap.'),
  testNap.map((step) => step.text).join(' | '),
);
check('a test word never gives away a letter or a sound', !testNap.some((step) => /as in/.test(step.text)));
check('the last pass of a test word is slower too', (testNap[2]?.speedFactor ?? 1) < (testNap[0]?.speedFactor ?? 1));
check(
  'the ending hint names the last sound with a word that proves it',
  napEnding[1]?.text === 'It ends with puh, as in pig.',
  napEnding[1]?.text ?? 'none',
);
check('the ending hint says the word before the ending', napEnding[0]?.text === 'Nap.' && napEnding.length === 2, napEnding.map((s) => s.text).join(' | '));
check('a word with nothing to sound out still gets a plain hint', endingHintSteps('A').length >= 1);
const wordsWithAQuietEnding = ALL_LEVELS.flatMap((level) => level.words).filter((word) => {
  const sounds = soundOutSteps(word.word);
  const last = sounds === null ? undefined : sounds[sounds.length - 1];
  if (last === undefined) return false;
  return !dictationSteps(word.word, 'practice').some((step) => step.text.includes(last.sound));
});
const wordsThatProveThemselves = ALL_LEVELS.flatMap((level) => level.words).filter((word) =>
  dictationSteps(word.word, 'practice').some((step) => step.text.toLowerCase().includes(`as in ${word.word.toLowerCase()}.`)),
);
check(
  'no word is used as the proof of its own sound',
  wordsThatProveThemselves.length === 0,
  wordsThatProveThemselves.map((word) => word.word).slice(0, 6).join(', '),
);
check(
  'every school word says its last sound when it is practised',
  wordsWithAQuietEnding.length === 0,
  wordsWithAQuietEnding.map((word) => word.word).slice(0, 6).join(', '),
);
check(
  'every school word is said first and last in a practice dictation',
  ALL_LEVELS.flatMap((level) => level.words).every((word) => {
    const plan = dictationSteps(word.word, 'practice');
    const said = `${spokenWord(word.word)}.`;
    return plan[0]?.text === said && plan[plan.length - 1]?.text === said;
  }),
);

const napSounds = soundOutSteps('NAP');
check('sounding out carries the sound and its word', napSounds?.length === 3, String(napSounds?.length ?? 0));
check('the sound of n comes with a word that starts with it', napSounds?.[0]?.anchor === 'no', napSounds?.[0]?.anchor ?? 'none');
check('the short a is proved by a word', napSounds?.[1]?.anchor === 'at', napSounds?.[1]?.anchor ?? 'none');
check(
  'every sound of every school word has a word to prove it',
  ALL_LEVELS.flatMap((level) => level.words).every((word) => (soundOutSteps(word.word) ?? []).every((step) => step.anchor.length > 1)),
  String(
    ALL_LEVELS.flatMap((level) => level.words)
      .flatMap((word) => soundOutSteps(word.word) ?? [])
      .filter((step) => step.anchor.length <= 1)
      .map((step) => step.chunk)
      .slice(0, 6)
      .join(','),
  ),
);
check('a letter team sounds as one', soundOutText('SHIP') === 'shh, ih, puh', String(soundOutText('SHIP')));
check('ph says f', soundOutText('DOLPHIN') === 'duh, aw, lll, fff, ih, nnn', String(soundOutText('DOLPHIN')));
check('a silent k is not sounded', soundOutText('KNEE') === 'n, ee', String(soundOutText('KNEE')));
check('a silent b is not sounded', soundOutText('LAMB') === 'lll, ah, m', String(soundOutText('LAMB')));
check('a magic e lengthens the vowel and stays quiet', soundOutText('CAKE') === 'kuh, ay, kuh', String(soundOutText('CAKE')));
check('a bossy r makes one sound', soundOutText('FORK') === 'fff, or, kuh', String(soundOutText('FORK')));
check('a vowel team makes one sound', soundOutText('RAINBOW') === 'rrr, ay, nnn, buh, ow', String(soundOutText('RAINBOW')));
check('an ending is sounded as a chunk', soundOutText('SPRING') === 'sss, puh, rrr, ing', String(soundOutText('SPRING')));
check('a word with nothing to sound out says so', soundOutText('A') === null);
check('a two sound word still sounds out', soundOutText('AT') === 'ah, tuh', String(soundOutText('AT')));
check(
  'every school word can be sounded out or said slowly',
  ALL_LEVELS.flatMap((level) => level.words).every((word) => soundOutText(word.word) !== null || soundChunks(word.word).length <= 1),
);
check(
  'sounding out covers every letter of every word',
  REGIONS.every((region) =>
    region.words.every((word) => {
      const spelled = soundChunks(word.word).join('');
      // The only letter the sounds may drop is a silent final e.
      return spelled === word.word || spelled === word.word.slice(0, -1);
    }),
  ),
  REGIONS.flatMap((region) => region.words.map((word) => word.word)).find((word) => {
    const spelled = soundChunks(word).join('');
    return spelled !== word && spelled !== word.slice(0, -1);
  }) ?? '',
);

console.log('\nThe pace and the voice a word is read in');
// These numbers are not taste. expo-speech multiplies a JavaScript rate by
// AVSpeechUtteranceDefaultSpeechRate (0.5) in its iOS layer, so a rate of 1 is
// the pace iOS itself calls normal. An earlier version scaled the rate again in
// JavaScript and halved every word the app ever said.
check('a speed of one is exactly normal speech', speechRateFor(1) === 1, String(speechRateFor(1)));
check('the dictation speed is not halved on the way out', Math.abs(speechRateFor(0.72) - 0.72) < 1e-9, String(speechRateFor(0.72)));
check('every pace in the app passes through untouched', [0.6, 0.72, 0.82, 0.9, 1].every((speed) => speechRateFor(speed) === speed));
check('a word is never read below the clarity floor', speechRateFor(0.2) === SPEECH_SLOWEST, String(speechRateFor(0.2)));
check('nothing is spoken faster than the ceiling', speechRateFor(3) === SPEECH_FASTEST, String(speechRateFor(3)));
check('the very slow pass is held at the floor', speechRateFor(0.72 * 0.7) === SPEECH_SLOWEST, String(speechRateFor(0.72 * 0.7)));
check('a nonsense speed falls back to normal', speechRateFor(Number.NaN) === 1, String(speechRateFor(Number.NaN)));
check('a pace reads as a percentage for the settings screen', speechPacePercent(0.72) === 72, String(speechPacePercent(0.72)));

const voiceFacts = (name: string, identifier: string, language: string, quality = 'Default'): { name: string; identifier: string; language: string; quality: string } => ({
  name,
  identifier,
  language,
  quality,
});
const compactSamantha = rankVoice(voiceFacts('Samantha', 'com.apple.voice.compact.en-US.Samantha', 'en-US'));
const enhancedSamantha = rankVoice(voiceFacts('Samantha', 'com.apple.voice.enhanced.en-US.Samantha', 'en-US', 'Enhanced'));
const premiumAva = rankVoice(voiceFacts('Ava', 'com.apple.voice.premium.en-US.Ava', 'en-US'));
const noveltyVoice = rankVoice(voiceFacts('Bells', 'com.apple.speech.synthesis.voice.Bells', 'en-US'));
const frenchVoice = rankVoice(voiceFacts('Amelie', 'com.apple.voice.compact.fr-FR.Amelie', 'fr-FR'));
const androidVoice = rankVoice(voiceFacts('English (United States)', 'en-us-x-sfg#female_1-local', 'en-US'));
check('the voice that comes with the phone is flagged as the muddy one', compactSamantha.kind === 'compact', compactSamantha.kind);
check('an enhanced voice beats the compact voice of the same name', enhancedSamantha.score > compactSamantha.score, `${enhancedSamantha.score} vs ${compactSamantha.score}`);
check(
  'a premium voice is spotted even though expo-speech reports it as Default',
  classifyVoice(premiumAva) === 'premium',
  premiumAva.kind,
);
check('a downloaded voice is judged clear', voiceIsClear(enhancedSamantha.kind) && voiceIsClear(premiumAva.kind));
check('the basic voice is judged unclear', voiceIsClear(compactSamantha.kind) === false);
check('a joke voice can never outrank a real one', noveltyVoice.score < compactSamantha.score, `${noveltyVoice.score} vs ${compactSamantha.score}`);
check('a voice that does not speak English loses to one that does', frenchVoice.score < compactSamantha.score);
check('an Android voice reads clearly', androidVoice.kind === 'standard' && voiceIsClear(androidVoice.kind));
check(
  'the clearer voice hint names where to tap',
  CLEARER_VOICE_STEPS.includes('Accessibility') && CLEARER_VOICE_STEPS.includes('Voices'),
);

console.log('\nCurriculum integrity');
check('every region id is unique', new Set(REGIONS.map((region) => region.id)).size === REGIONS.length);
check('every region belongs to a real unit', REGIONS.every((region) => UNITS.some((unit) => unit.id === region.unit)));
check('every unit has at least one region', UNITS.every((unit) => REGIONS.some((region) => region.unit === unit.id)));
check('every region teaches eight to twelve words', REGIONS.every((region) => region.words.length >= 8 && region.words.length <= 12));
check('every region has a rule title and text', REGIONS.every((region) => region.rule.title.length > 2 && region.rule.text.length >= 15));
check('every region shows three or more examples', REGIONS.every((region) => region.rule.examples.length >= 3));
check('every region names its letter pair', REGIONS.every((region) => region.rule.focusPair.length > 0));
check('every region has a name and a blurb', REGIONS.every((region) => region.name.length > 2 && region.blurb.length > 5));
check(
  'every region has a two colour gradient',
  REGIONS.every((region) => region.gradient.length === 2 && region.gradient.every((colour) => /^#[0-9A-Fa-f]{6}$/.test(colour))),
);
check('every region has a dark accent', REGIONS.every((region) => /^#[0-9A-Fa-f]{6}$/.test(region.accent)));
check('every word is letters only', REGIONS.every((region) => region.words.every((word) => /^[A-Z]{3,14}$/.test(word.word))));
check('every word has a spoken hint', REGIONS.every((region) => region.words.every((word) => word.hint.length > 5)));
check('no region repeats a word inside itself', REGIONS.every((region) => new Set(region.words.map((word) => word.word)).size === region.words.length));
check(
  'authored focus points at real letters',
  REGIONS.every((region) => region.words.every((word) => (word.focus ?? []).every((index) => index >= 0 && index < word.word.length))),
);
check(
  'authored silent points at real letters',
  REGIONS.every((region) => region.words.every((word) => (word.silent ?? []).every((index) => index >= 0 && index < word.word.length))),
);
check(
  'a silent letter is a consonant or the magic e',
  REGIONS.every((region) =>
    region.words.every((word) =>
      (word.silent ?? []).every((index) => 'AEIOU'.includes(word.word[index] ?? '') === false || index === word.word.length - 1),
    ),
  ),
);
check(
  'the heart words carry a sentence',
  REGIONS.filter((region) => region.tag === 'sight').every((region) => region.words.every((word) => (word.sentence ?? '').length > 5)),
);
check('the curriculum teaches the quiet letters', REGIONS.some((region) => region.tag === 'silent'));
check(
  'the tricky units come after the basics',
  REGIONS.findIndex((region) => region.tag === 'silent') > REGIONS.findIndex((region) => region.tag === 'cvc'),
  String(REGIONS.findIndex((region) => region.tag === 'silent')),
);
check('the kaiju words come last', REGIONS[REGIONS.length - 1]?.tag === 'dino', REGIONS[REGIONS.length - 1]?.tag ?? 'none');

console.log(`\n${passed} checks passed, ${failures.length} failed`);
if (failures.length > 0) {
  console.warn('\nFailures:');
  failures.forEach((failure) => console.warn(`  - ${failure}`));
  process.exitCode = 1;
}
