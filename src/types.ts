/**
 * EvoABC shared types.
 * Everything the screens and the game state machine agree on lives here.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type WordTag =
  | 'cvc'
  | 'sight'
  | 'blend'
  | 'digraph'
  | 'silent'
  | 'magicE'
  | 'vowelteam'
  | 'bossyR'
  | 'ending'
  | 'compound'
  | 'dino';

/** Interactive spelling modes. */
export type PlayMode = 'build' | 'missing' | 'listen';

export type ScreenName =
  | 'onboarding'
  | 'home'
  | 'map'
  | 'play'
  | 'result'
  | 'eggs'
  | 'collection'
  | 'streak'
  | 'settings'
  | 'test'
  | 'testSession';

export interface WordEntry {
  /** Uppercase, letters only. */
  word: string;
  tag: WordTag;
  /** Picture cue key from src/art/cues. Empty string means "use the letter badge". */
  cue: string;
  /** Short kid friendly description, also used as the read aloud sentence. */
  hint: string;
  /** Optional sentence shown for sight words. */
  sentence?: string;
  /** Indexes of the letters that carry the pattern, highlighted when teaching. */
  focus?: number[];
  /** Indexes of letters that are not pronounced, shown dimmed and struck. */
  silent?: number[];
}

/** The teaching card that opens a region: what the pattern does, in kid words. */
export interface RegionRule {
  /** Very short headline such as "ph says f". */
  title: string;
  /** One or two short sentences a six year old can follow. */
  text: string;
  /** Three example words, usually taken from the region itself. */
  examples: string[];
  /** Letter pair this rule is about, used for the badge. */
  focusPair: string;
}

export interface Unit {
  id: string;
  title: string;
  blurb: string;
  /** Picture cue key from src/art/cues. */
  cue: string;
}

export interface Level {
  id: string;
  regionId: string;
  index: number;
  title: string;
  words: WordEntry[];
  boss: boolean;
  reward: { coins: number; gems: number };
}

export interface Region {
  id: string;
  name: string;
  blurb: string;
  tag: WordTag;
  /** Picture cue key from src/art/cues. */
  cue: string;
  gradient: [string, string];
  accent: string;
  words: WordEntry[];
  levels: Level[];
  /** Which teaching unit this region belongs to on the map. */
  unit: string;
  /** The sound rule taught before the region starts. */
  rule: RegionRule;
}

export interface LevelProgress {
  stars: number;
  cleared: boolean;
  attempts: number;
  best: number;
}

export interface SkinColors {
  body: string;
  bodyDark: string;
  belly: string;
  accent: string;
  glow: string;
  eye: string;
}

export interface SkinTraits {
  horns: boolean;
  armor: boolean;
  fins: boolean;
  wings: boolean;
  spikes: boolean;
  glowEyes: boolean;
  tailClub: boolean;
  longNeck: boolean;
}

/** Body shape family used by the vector dino renderer. */
export type BodyShape = 'rex' | 'trike' | 'raptor' | 'spino' | 'ptera' | 'ankylo' | 'sauropod' | 'kaiju';

export interface Skin {
  id: string;
  name: string;
  species: string;
  rarity: Rarity;
  shape: BodyShape;
  colors: SkinColors;
  traits: SkinTraits;
  /** Companions are the small buddies that walk next to the main dino. */
  companion?: boolean;
  blurb: string;
}

export interface DinoStage {
  id: string;
  name: string;
  /** Player level needed to unlock this stage. */
  minLevel: number;
  tagline: string;
  scale: number;
  aura: number;
}

export interface Crate {
  id: string;
  name: string;
  blurb: string;
  cost: number;
  currency: 'coins' | 'gems';
  gradient: [string, string];
  /** Stars required before the crate can be bought. */
  unlockStars: number;
  pool: 'dinosaurs' | 'companions';
  weights: Record<Rarity, number>;
}

export interface DailyReward {
  day: number;
  label: string;
  coins?: number;
  gems?: number;
  crateId?: string;
}

export interface StreakState {
  count: number;
  best: number;
  lastClaimDay: string | null;
  claimedToday: boolean;
  cycleIndex: number;
}

export interface Settings {
  sfx: boolean;
  music: boolean;
  haptics: boolean;
  speech: boolean;
  speechRate: number;
  /** Preferred text to speech voice identifier, chosen in the parent zone. */
  voiceId: string | null;
  /** Human readable name of the chosen voice, shown in settings. */
  voiceName: string | null;
  /** How fast school words are dictated. */
  dictationRate: number;
}

/** One word of a hand entered school spelling list. */
export interface CustomListWord {
  word: string;
  correct: number;
  wrong: number;
  /** Passed means it was spelled correctly during a real test round. */
  passed: boolean;
}

/** A spelling test the grown up typed in, plus how far the child has got. */
export interface CustomList {
  id: string;
  name: string;
  words: string[];
  createdAt: string;
  updatedAt: string;
  /** How many learn, practice, test cycles it has taken. */
  round: number;
  passed: boolean;
  bestScore: number;
  lastPlayedDay: string | null;
  results: Record<string, CustomListWord>;
}

/** Which part of the study plan the child is in. */
export type TestPhase = 'learn' | 'practice' | 'test' | 'done';

/** The live study plan for one custom list. Kept pure so it can be tested. */
export interface TestPlanState {
  listId: string;
  round: number;
  phase: TestPhase;
  /** The words being worked on this round, in teaching order. */
  order: string[];
  index: number;
  /** Test phase results for this round only. */
  roundResults: Record<string, boolean>;
  /** Words missed in the last test round, taught again next round. */
  missed: string[];
  /** Percentage correct in the last finished test round. */
  lastScore: number;
  /** Set when this round passed the test. */
  passed: boolean;
}

export interface PlayerStats {
  correct: number;
  wrong: number;
  bestCombo: number;
  sessions: number;
  levelsCleared: number;
  eggsHatched: number;
  perTag: Record<WordTag, { correct: number; wrong: number }>;
  perWord: Record<string, { correct: number; wrong: number }>;
}

export interface PlayerProfile {
  version: number;
  onboarded: boolean;
  starterSkinId: string;
  equippedSkinId: string;
  activeCompanionId: string | null;
  xp: number;
  level: number;
  coins: number;
  gems: number;
  stars: number;
  ownedSkinIds: string[];
  companionIds: string[];
  eggs: Record<string, number>;
  progress: Record<string, LevelProgress>;
  customLists: CustomList[];
  streak: StreakState;
  settings: Settings;
  stats: PlayerStats;
  seenStageIndex: number;
  createdAt: string;
  lastPlayedDay: string | null;
}

export interface SessionQuestion {
  word: WordEntry;
  mode: PlayMode;
  /** Letters shuffled for the build and missing modes. */
  letters: string[];
  /** Index of the letter that is removed in the missing mode. */
  missingIndex: number;
  /** Options offered in the missing mode. */
  choices: string[];
  attempt: number;
}

export interface SessionState {
  levelId: string;
  regionId: string;
  title: string;
  mode: PlayMode;
  queue: SessionQuestion[];
  index: number;
  total: number;
  hearts: number;
  maxHearts: number;
  combo: number;
  bestCombo: number;
  correct: number;
  mistakes: number;
  coins: number;
  gems: number;
  xp: number;
  outcome: 'playing' | 'won' | 'lost';
  /** Set right after an answer so screens can play feedback. */
  lastAnswer: { correct: boolean; word: string; expected: string } | null;
  finished: boolean;
}

export interface SessionSummary {
  levelId: string;
  regionId: string;
  title: string;
  won: boolean;
  stars: number;
  correct: number;
  mistakes: number;
  bestCombo: number;
  coins: number;
  gems: number;
  xp: number;
  leveledUp: boolean;
  newLevel: number;
  evolved: boolean;
  stageName: string;
  totalStars: number;
  unlockedCrate: string | null;
}

export interface HatchResult {
  ok: boolean;
  error?: string;
  skin?: Skin;
  duplicate?: boolean;
  gemsBack?: number;
}
