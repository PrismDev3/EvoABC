import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/**
 * Every sound in EvoABC is a small generated WAV shipped inside the app, so
 * the game is fully offline and there is nothing to stream or download.
 * Good sounds are a big part of the reward loop, so they get real names.
 */

export type SfxName =
  | 'tap'
  | 'tap2'
  | 'tap3'
  | 'correct'
  | 'coin'
  | 'gem'
  | 'combo'
  | 'wrong'
  | 'lose'
  | 'whoosh'
  | 'hatch'
  | 'evolve'
  | 'victory'
  | 'daily'
  | 'eggshake'
  | 'roar1'
  | 'roar2'
  | 'roar3';

const SOURCES: Record<SfxName, number> = {
  tap: require('../../assets/audio/tap.wav'),
  tap2: require('../../assets/audio/tap2.wav'),
  tap3: require('../../assets/audio/tap3.wav'),
  correct: require('../../assets/audio/correct.wav'),
  coin: require('../../assets/audio/coin.wav'),
  gem: require('../../assets/audio/gem.wav'),
  combo: require('../../assets/audio/combo.wav'),
  wrong: require('../../assets/audio/wrong.wav'),
  lose: require('../../assets/audio/lose.wav'),
  whoosh: require('../../assets/audio/whoosh.wav'),
  hatch: require('../../assets/audio/hatch.wav'),
  evolve: require('../../assets/audio/evolve.wav'),
  victory: require('../../assets/audio/victory.wav'),
  daily: require('../../assets/audio/daily.wav'),
  eggshake: require('../../assets/audio/eggshake.wav'),
  roar1: require('../../assets/audio/roar1.wav'),
  roar2: require('../../assets/audio/roar2.wav'),
  roar3: require('../../assets/audio/roar3.wav'),
};

const MUSIC = require('../../assets/audio/music.wav');

/**
 * Playback levels. The files are already levelled and soft limited, so these
 * only balance the sound design: taps stay out of the way, rewards sit forward,
 * and nothing is loud enough to be startling through headphones.
 */
const VOLUME: Partial<Record<SfxName, number>> = {
  // A tap plays five or six times per word, so it sits well under the rest and
  // is felt more than heard. The generated file is quiet and very short now, so
  // it is played a little louder here and still lands softer than the beep it
  // replaced: same peak, four decibels less energy behind it.
  tap: 0.55,
  tap2: 0.55,
  tap3: 0.55,
  coin: 0.62,
  gem: 0.68,
  correct: 0.76,
  combo: 0.76,
  wrong: 0.55,
  lose: 0.62,
  whoosh: 0.45,
  hatch: 0.78,
  evolve: 0.84,
  victory: 0.86,
  daily: 0.8,
  eggshake: 0.55,
  roar1: 0.72,
  roar2: 0.72,
  roar3: 0.72,
};

/**
 * Sounds that must never talk over the spelling voice. A reward chiming in the
 * same half second as the word is being dictated is the reason a word can be
 * impossible to make out, so these wait their turn instead.
 */
const DEFERRED: SfxName[] = ['correct', 'coin', 'gem', 'combo', 'hatch', 'evolve', 'victory', 'daily', 'roar1', 'roar2', 'roar3'];

/** How loud the music sits normally, and how far it drops under the voice. */
const MUSIC_VOLUME = 0.16;
const MUSIC_DUCKED = 0.035;

const players = new Map<SfxName, AudioPlayer>();
let musicPlayer: AudioPlayer | null = null;
let sfxEnabled = true;
let musicEnabled = true;
let audioModeReady = false;
let speechActive = false;
let heldSound: SfxName | null = null;
let holdTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * A reward waits for the voice, but never for long. A word being sounded out
 * can run for four seconds, and a celebration that arrives four seconds after
 * the child got it right feels like the app ignored them, so after this the
 * sound plays anyway.
 */
const MAX_HOLD_MS = 1500;

/** Sounds must be audible even with the iPhone mute switch on. */
export async function configureAudio(): Promise<void> {
  if (audioModeReady) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
    audioModeReady = true;
  } catch (error) {
    console.warn('EvoABC could not set the audio mode.', error);
  }
}

function playerFor(name: SfxName): AudioPlayer | null {
  const existing = players.get(name);
  if (existing !== undefined) return existing;
  try {
    const created = createAudioPlayer(SOURCES[name]);
    created.volume = VOLUME[name] ?? 0.8;
    players.set(name, created);
    return created;
  } catch (error) {
    console.warn(`EvoABC could not load the ${name} sound.`, error);
    return null;
  }
}

/** Warm the cache so the first stomp has no delay behind it. */
export function preloadSfx(names: SfxName[] = ['tap', 'tap2', 'tap3', 'correct', 'coin', 'wrong', 'whoosh', 'combo']): void {
  names.forEach((name) => playerFor(name));
}

export function setSfxEnabled(enabled: boolean): void {
  sfxEnabled = enabled;
}

export function setMusicEnabled(enabled: boolean): void {
  musicEnabled = enabled;
  if (enabled) startMusic();
  else stopMusic();
}

/** The actual playback, which never defers. */
function playSfxNow(name: SfxName): void {
  const player = playerFor(name);
  if (player === null) return;
  try {
    player.seekTo(0);
    player.play();
  } catch (error) {
    console.warn(`EvoABC could not play the ${name} sound.`, error);
  }
}

/**
 * The press family. A row of letter tiles is tapped six times in a row, and the
 * same sound six times at the same pitch is what makes a game feel cheap, so a
 * tap picks one of three near identical presses and never the one it just used.
 */
const TAP_VARIANTS: SfxName[] = ['tap', 'tap2', 'tap3'];
let lastTap: SfxName | null = null;

function pickTap(): SfxName {
  const options = TAP_VARIANTS.filter((variant) => variant !== lastTap);
  const pool = options.length > 0 ? options : TAP_VARIANTS;
  const picked = pool[Math.floor(Math.random() * pool.length)] ?? 'tap';
  lastTap = picked;
  return picked;
}

export function playSfx(name: SfxName): void {
  if (!sfxEnabled) return;
  const sound = name === 'tap' ? pickTap() : name;
  if (speechActive && DEFERRED.includes(sound)) {
    // Only the most recent reward is kept: a queue of chimes would arrive as a
    // pile of noise the moment the voice stops.
    heldSound = sound;
    if (holdTimer === null) {
      holdTimer = setTimeout(releaseHeldSound, MAX_HOLD_MS);
    }
    return;
  }
  playSfxNow(sound);
}

function releaseHeldSound(): void {
  if (holdTimer !== null) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  const pending = heldSound;
  heldSound = null;
  if (pending !== null && sfxEnabled) playSfxNow(pending);
}

/**
 * Told by the voice when it starts and stops talking. While it talks the music
 * drops to a whisper and rewards hold back, because words have to win.
 */
export function setSpeechActive(active: boolean): void {
  speechActive = active;
  duckMusic(active);
  if (active) return;
  releaseHeldSound();
}

function duckMusic(active: boolean): void {
  if (musicPlayer === null) return;
  try {
    musicPlayer.volume = active ? MUSIC_DUCKED : MUSIC_VOLUME;
  } catch (error) {
    console.warn('EvoABC could not duck the music.', error);
  }
}

/** Random monster growl used to celebrate correct spellings. */
export function playRoar(): void {
  const roars: SfxName[] = ['roar1', 'roar2', 'roar3'];
  const pick = roars[Math.floor(Math.random() * roars.length)] ?? 'roar1';
  playSfx(pick);
}

export function startMusic(): void {
  if (!musicEnabled) return;
  try {
    if (musicPlayer === null) {
      musicPlayer = createAudioPlayer(MUSIC);
      // Deliberately well under the sound effects: it is a background hum, not
      // something a child should have to talk over. It also drops further
      // whenever the spelling voice speaks.
      musicPlayer.volume = speechActive ? MUSIC_DUCKED : MUSIC_VOLUME;
      musicPlayer.loop = true;
    }
    musicPlayer.play();
  } catch (error) {
    console.warn('EvoABC could not start the music.', error);
  }
}

export function stopMusic(): void {
  try {
    musicPlayer?.pause();
  } catch (error) {
    console.warn('EvoABC could not stop the music.', error);
  }
}

export function releaseAudio(): void {
  if (holdTimer !== null) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  heldSound = null;
  players.forEach((player) => {
    try {
      player.remove();
    } catch {
      // already gone
    }
  });
  players.clear();
  try {
    musicPlayer?.remove();
  } catch {
    // already gone
  }
  musicPlayer = null;
}
