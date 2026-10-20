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
const MUSIC_VOLUME = 0.22;
const MUSIC_DUCKED = 0.04;

/**
 * How long the volume fade takes when ducking or unducking, in milliseconds.
 * A sudden drop is jarring; a 350ms ramp is smooth without being slow.
 */
const DUCK_FADE_MS = 350;

/**
 * How many steps to use for the volume ramp. More steps = smoother curve,
 * but each step is a setTimeout, so keep it reasonable.
 */
const FADE_STEPS = 14;

const players = new Map<SfxName, AudioPlayer>();
/**
 * Dual-player crossfade music system.
 *
 * A single looping WAV always has a small gap or click at the loop point
 * because the decoder has to seek back to the start while the OS audio thread
 * keeps running — even a few milliseconds of silence is very audible.
 *
 * The fix is two players that take turns. While player A is playing, we
 * schedule a crossfade near its end so player B starts at full volume just as
 * A fades out, then A seeks to zero ready to be B next time. The gap is gone
 * because no seeking happens mid-playback on the active player.
 *
 * We derive the crossfade start time from the actual player position so it
 * works even if the audio thread runs slightly late.
 */
let musicPlayers: [AudioPlayer | null, AudioPlayer | null] = [null, null];
/** Index of the player currently carrying the music (0 or 1). */
let activeMusicSlot = 0;
/** Timer that starts the next crossfade. */
let crossfadeTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * The ramp timers are kept in two pools on purpose.
 *
 * A voice starts and stops every couple of seconds in this game, so the duck
 * ramp and the crossfade ramp are constantly in flight at the same time. When
 * they shared one list, a duck cancelled the crossfade half way through: the
 * outgoing player stayed loud, the incoming one stayed quiet, and the timer that
 * hands over to the next track never ran, so two copies of the music played on
 * top of each other.
 */
let duckRampTimers: ReturnType<typeof setTimeout>[] = [];
let crossfadeRampTimers: ReturnType<typeof setTimeout>[] = [];

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

/** Empties one timer pool, which is how a new ramp cancels the one before it. */
function cancelTimers(pool: ReturnType<typeof setTimeout>[]): ReturnType<typeof setTimeout>[] {
  pool.forEach((timer) => clearTimeout(timer));
  return [];
}

/**
 * The overall music level is kept apart from the crossfade, and the volume of
 * each player is always the two multiplied together.
 *
 * That separation is the whole point: a word starts and stops every couple of
 * seconds in this game, so a duck ramp and a loop crossfade are in flight at the
 * same time constantly. When both wrote `player.volume` directly, a duck in the
 * middle of a crossfade either pulled the fading-out track back up or left the
 * incoming one silent, and the hand over never finished.
 */
let musicLevel = MUSIC_VOLUME;
/** Crossfade gain per player: one swells while the other fades. */
let slotGain: [number, number] = [1, 0];

/** Writes every player's real volume from the level and the crossfade gain. */
function applyMusicGain(): void {
  musicPlayers.forEach((player, slot) => {
    if (player === null) return;
    try {
      player.volume = Math.max(0, Math.min(1, musicLevel * (slotGain[slot] ?? 0)));
    } catch {
      // The player was released mid ramp, which is not worth a word in the log.
    }
  });
}

/**
 * Fades the music down under the voice, or back up once it has stopped. A jump
 * from one level to another clicks; a third of a second does not, and it is
 * short enough that no word is spoken over loud music.
 */
function duckMusic(active: boolean): void {
  const target = active ? MUSIC_DUCKED : MUSIC_VOLUME;
  duckRampTimers = cancelTimers(duckRampTimers);
  const from = musicLevel;
  const stepMs = DUCK_FADE_MS / FADE_STEPS;
  for (let step = 1; step <= FADE_STEPS; step += 1) {
    duckRampTimers.push(
      setTimeout(() => {
        musicLevel = from + (target - from) * (step / FADE_STEPS);
        applyMusicGain();
      }, stepMs * step),
    );
  }
}

/** Random monster growl used to celebrate correct spellings. */
export function playRoar(): void {
  const roars: SfxName[] = ['roar1', 'roar2', 'roar3'];
  const pick = roars[Math.floor(Math.random() * roars.length)] ?? 'roar1';
  playSfx(pick);
}

/**
 * How long the music WAV file plays before we crossfade to the second player,
 * in milliseconds. This must be less than the actual file length. We use a
 * conservative estimate; if it fires early the second player just starts a bit
 * ahead of the loop point, which is still gap-free.
 *
 * The actual crossfade window is CROSSFADE_MS long: during that window the
 * outgoing player fades to 0 and the incoming one ramps up from 0 to the
 * current target volume.
 */
const MUSIC_LOOP_MS = 15_752; // the real length of assets/audio/music.wav, at 44.1 kHz
const CROSSFADE_MS = 1_600; // 1.6 s overlap; smooth without eating the loop
const CROSSFADE_STEPS = 18;

/** The track length, from the player itself once it has loaded the file. */
function loopMsFor(player: AudioPlayer | null): number {
  const seconds = player?.duration ?? 0;
  return Number.isFinite(seconds) && seconds > 1 ? Math.round(seconds * 1000) : MUSIC_LOOP_MS;
}

function clearCrossfadeTimer(): void {
  if (crossfadeTimer !== null) {
    clearTimeout(crossfadeTimer);
    crossfadeTimer = null;
  }
}

/**
 * Creates a fresh player for the music track, starting silent so it can be
 * faded in without a pop.
 */
function createMusicPlayer(): AudioPlayer | null {
  try {
    const p = createAudioPlayer(MUSIC);
    p.volume = 0;
    p.loop = false; // we manage looping manually for gapless playback
    return p;
  } catch (error) {
    console.warn('EvoABC could not create music player.', error);
    return null;
  }
}

/**
 * Crossfades from the current active player to the next one, then schedules
 * the next crossfade. This creates a gapless, bump-free loop for the music.
 */
function triggerCrossfade(): void {
  if (!musicEnabled) return;
  const currentSlot = activeMusicSlot;
  const nextSlot = currentSlot === 0 ? 1 : 0;
  const outgoing = musicPlayers[currentSlot];
  let incoming = musicPlayers[nextSlot];

  // Recreate the incoming player if it was released.
  if (incoming === null) {
    incoming = createMusicPlayer();
    musicPlayers[nextSlot] = incoming;
  }
  if (incoming === null) return;

  // Start the incoming track from its first sample at silence, then play it.
  try {
    slotGain[nextSlot] = 0;
    applyMusicGain();
    incoming.seekTo(0);
    incoming.play();
  } catch {
    // A broken player is not worth a crash; the other one can finish the loop.
    return;
  }

  // Ramp the incoming player up and the outgoing one down over CROSSFADE_MS.
  crossfadeRampTimers = cancelTimers(crossfadeRampTimers);
  const stepMs = CROSSFADE_MS / CROSSFADE_STEPS;
  const fromOut = slotGain[currentSlot] ?? 1;
  for (let step = 1; step <= CROSSFADE_STEPS; step += 1) {
    const frac = step / CROSSFADE_STEPS;
    crossfadeRampTimers.push(
      setTimeout(() => {
        slotGain[nextSlot] = frac;
        slotGain[currentSlot] = fromOut * (1 - frac);
        applyMusicGain();
      }, stepMs * step),
    );
  }

  // After the overlap the old player is done: silence it and park it at zero so
  // it is ready to be the incoming one next time round.
  crossfadeRampTimers.push(
    setTimeout(() => {
      try {
        outgoing?.pause();
        outgoing?.seekTo(0);
      } catch {
        // already gone
      }
      slotGain[currentSlot] = 0;
      activeMusicSlot = nextSlot;
      slotGain[nextSlot] = 1;
      applyMusicGain();
    }, CROSSFADE_MS + 100),
  );

  // The next hand over starts one crossfade before this track ends, counted
  // from right now. Timing it from here rather than from the end of the fade is
  // what keeps the loop from creeping: every cycle plays exactly one track
  // length less the overlap, so the music never runs ahead of itself.
  clearCrossfadeTimer();
  crossfadeTimer = setTimeout(triggerCrossfade, Math.max(1000, loopMsFor(incoming) - CROSSFADE_MS));
}

export function startMusic(): void {
  if (!musicEnabled) return;

  // If we already have a running music setup, nothing to do.
  if (musicPlayers[activeMusicSlot] !== null) {
    try {
      musicPlayers[activeMusicSlot]?.play();
    } catch {
      // ignore
    }
    return;
  }

  try {
    // Slot 0 starts playing immediately, slot 1 waits in reserve.
    const p0 = createMusicPlayer();
    const p1 = createMusicPlayer();
    musicPlayers = [p0, p1];
    activeMusicSlot = 0;

    if (p0 === null) return;

    const targetVol = speechActive ? MUSIC_DUCKED : MUSIC_VOLUME;
    slotGain = [1, 0];
    musicLevel = targetVol;
    // Fade in from silence so the loop does not pop into existence.
    p0.seekTo(0);
    p0.play();
    duckRampTimers = cancelTimers(duckRampTimers);
    const stepMs = 600 / FADE_STEPS;
    for (let step = 1; step <= FADE_STEPS; step += 1) {
      duckRampTimers.push(
        setTimeout(() => {
          musicLevel = targetVol * (step / FADE_STEPS);
          applyMusicGain();
        }, stepMs * step),
      );
    }

    // The first hand over starts one crossfade before the track ends.
    clearCrossfadeTimer();
    crossfadeTimer = setTimeout(triggerCrossfade, Math.max(1000, loopMsFor(p0) - CROSSFADE_MS));
  } catch (error) {
    console.warn('EvoABC could not start the music.', error);
  }
}

export function stopMusic(): void {
  clearCrossfadeTimer();
  duckRampTimers = cancelTimers(duckRampTimers);
  crossfadeRampTimers = cancelTimers(crossfadeRampTimers);
  try {
    musicPlayers.forEach((p) => p?.pause());
  } catch (error) {
    console.warn('EvoABC could not stop the music.', error);
  }
}

export function releaseAudio(): void {
  clearCrossfadeTimer();
  duckRampTimers = cancelTimers(duckRampTimers);
  crossfadeRampTimers = cancelTimers(crossfadeRampTimers);
  slotGain = [1, 0];
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
  musicPlayers.forEach((p) => {
    try {
      p?.remove();
    } catch {
      // already gone
    }
  });
  musicPlayers = [null, null];
}
