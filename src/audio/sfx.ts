import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/**
 * Every sound in EvoABC is a small generated WAV shipped inside the app, so
 * the game is fully offline and there is nothing to stream or download.
 * Good sounds are a big part of the reward loop, so they get real names.
 */

export type SfxName =
  | 'tap'
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

const VOLUME: Partial<Record<SfxName, number>> = {
  tap: 0.55,
  coin: 0.7,
  gem: 0.8,
  correct: 0.85,
  combo: 0.9,
  wrong: 0.5,
  lose: 0.7,
  whoosh: 0.5,
  hatch: 0.9,
  evolve: 1,
  victory: 0.95,
  daily: 0.9,
  eggshake: 0.6,
  roar1: 0.85,
  roar2: 0.85,
  roar3: 0.85,
};

const players = new Map<SfxName, AudioPlayer>();
let musicPlayer: AudioPlayer | null = null;
let sfxEnabled = true;
let musicEnabled = true;
let audioModeReady = false;

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
export function preloadSfx(names: SfxName[] = ['tap', 'correct', 'coin', 'wrong']): void {
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

export function playSfx(name: SfxName): void {
  if (!sfxEnabled) return;
  const player = playerFor(name);
  if (player === null) return;
  try {
    player.seekTo(0);
    player.play();
  } catch (error) {
    console.warn(`EvoABC could not play the ${name} sound.`, error);
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
      musicPlayer.volume = 0.22;
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
