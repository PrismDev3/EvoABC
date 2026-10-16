/**
 * Synthesizes every sound effect EvoABC plays, as 44100 Hz 16 bit mono WAV
 * files in assets/audio. No dependencies, no downloads, and the app stays
 * fully offline because the audio ships inside the binary.
 *
 * Everything here is built from soft, in tune tones on the C major pentatonic
 * scale, so two sounds playing at once never clash. There are no raw sawtooth
 * or square waves: those alias badly and come out buzzy and harsh, which is
 * exactly what makes a games sound hard to listen to on a phone speaker. Each
 * voice is a band limited stack of harmonics with a smooth attack and a natural
 * decay, run through a gentle low pass, and the finished track is soft clipped
 * and levelled so nothing ever distorts.
 *
 * Run with:  npm run assets      (or: node scripts/generate-audio.js)
 * Check it:  npm run audio:check (peak, level, clicks and harshness)
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'audio');

const frames = (seconds) => Math.max(1, Math.round(seconds * SAMPLE_RATE));

/**
 * The only randomness here is the noise behind whooshes and crackles, and it
 * is seeded so that running `npm run assets` twice produces byte for byte the
 * same files. That is what lets CI rebuild the sounds and prove the committed
 * WAVs really are the output of this script.
 */
let seed = 0x9e3779b9;
const random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let value = seed;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};

/** C major pentatonic across two octaves. Everything is written in these notes. */
const NOTE = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
  A6: 1760.0,
  C7: 2093.0,
};

/**
 * How much energy each partial of a struck note gets. A soft mallet or a music
 * box is mostly the fundamental with a quick, gentle shimmer on top, which is
 * warm rather than bright.
 */
const MALLET_SPECTRUM = [1, 0.42, 0.24, 0.14, 0.08, 0.05, 0.03, 0.02, 0.014, 0.01, 0.007, 0.005];

function createTrack(lengthSeconds) {
  const data = new Float32Array(frames(lengthSeconds));

  const mix = (index, value) => {
    if (index >= 0 && index < data.length) data[index] += value;
  };

  const at = (index) => (index >= 0 && index < data.length ? data[index] : 0);
  /** Samples to keep after finishing. A loop trims its folded tail. */
  let keep = data.length;

  /** Smooth step in, so a note never starts with a step edge. */
  const attackEnv = (position, seconds) => {
    const length = Math.max(1, frames(seconds));
    if (position >= length) return 1;
    const x = position / length;
    return x * x * (3 - 2 * x);
  };

  /** Smooth step out, so a note never ends with a step edge. */
  const releaseEnv = (remaining, seconds) => attackEnv(remaining, seconds);

  /**
   * One warm struck note. Higher partials decay faster, exactly like a real
   * bell, and any partial above 45 percent of Nyquist is skipped so the tone
   * stays band limited instead of folding back as aliasing.
   */
  const note = ({
    freq,
    start = 0,
    duration = 0.35,
    amp = 0.4,
    decay = 0.5,
    brightness = 1,
    attack = 0.012,
    vibrato = 0,
    vibratoHz = 5.5,
    detune = 0,
  }) => {
    const from = frames(start);
    const count = frames(duration);
    const partials = MALLET_SPECTRUM.map((level, index) => {
      const multiple = index + 1;
      const partialFreq = freq * multiple * (1 + detune);
      if (partialFreq > SAMPLE_RATE * 0.45) return null;
      return { multiple, partialFreq, level: level * Math.pow(brightness, index) };
    }).filter((partial) => partial !== null);

    const phases = partials.map(() => 0);
    for (let i = 0; i < count; i += 1) {
      const t = i / SAMPLE_RATE;
      const inEnv = attackEnv(i, attack);
      const outEnv = releaseEnv(count - i, Math.min(0.25, duration * 0.5));
      const vib = vibrato > 0 ? 1 + vibrato * Math.sin(2 * Math.PI * vibratoHz * t) : 1;
      let value = 0;
      for (let p = 0; p < partials.length; p += 1) {
        const partial = partials[p];
        const bed = Math.exp(-t / (decay / (1 + 0.3 * (partial.multiple - 1))));
        const omega = (2 * Math.PI * partial.partialFreq * vib) / SAMPLE_RATE;
        phases[p] += omega;
        value += bed * partial.level * Math.sin(phases[p]);
      }
      mix(from + i, value * amp * inEnv * outEnv);
    }
  };

  /** Soft sustained pad, used under the music and the evolution sweep. */
  const pad = ({
    freq,
    start = 0,
    duration = 2.5,
    amp = 0.16,
    attack = 0.45,
    release = 0.7,
    detune = 0.0015,
  }) => {
    const from = frames(start);
    const count = frames(duration);
    const voices = [freq, freq * (1 + detune), freq * 2];
    const levels = [1, 0.6, 0.22];
    const phases = voices.map(() => 0);
    for (let i = 0; i < count; i += 1) {
      const inEnv = attackEnv(i, attack);
      const outEnv = releaseEnv(count - i, release);
      let value = 0;
      for (let v = 0; v < voices.length; v += 1) {
        const voiceFreq = voices[v];
        if (voiceFreq > SAMPLE_RATE * 0.45) continue;
        phases[v] += (2 * Math.PI * voiceFreq) / SAMPLE_RATE;
        value += levels[v] * Math.sin(phases[v]);
      }
      mix(from + i, value * amp * inEnv * outEnv);
    }
  };

  /** A short swell of soft filtered noise, used for air and crackles. */
  const air = ({ start = 0, duration = 0.3, amp = 0.2, cutoff = 900, attack = 0.05, release = 0.12, round = 0 }) => {
    const from = frames(start);
    const count = frames(duration);
    const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / SAMPLE_RATE);
    let low = 0;
    let low2 = 0;
    for (let i = 0; i < count; i += 1) {
      const white = random() * 2 - 1;
      low += alpha * (white - low);
      low2 += alpha * (low - low2);
      // A rounded window keeps the noise gentle instead of clicky.
      const shape = Math.pow(Math.sin((Math.PI * i) / count), round > 0 ? round : 1);
      mix(from + i, low2 * amp * shape * (attack <= 0 ? 1 : attackEnv(i, attack)) * releaseEnv(count - i, release));
    }
  };

  /** Removes any DC offset so the waveform sits on the zero line. */
  const dcBlock = () => {
    let previousInput = 0;
    let previousOutput = 0;
    for (let i = 0; i < data.length; i += 1) {
      const input = data[i];
      const output = input - previousInput + 0.995 * previousOutput;
      previousInput = input;
      previousOutput = output;
      data[i] = output;
    }
  };

  /** Gentle two pole low pass. Takes the edge off the top end. */
  const lowpass = (cutoff) => {
    const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / SAMPLE_RATE);
    let first = 0;
    let second = 0;
    for (let i = 0; i < data.length; i += 1) {
      first += alpha * (data[i] - first);
      second += alpha * (first - second);
      data[i] = second;
    }
  };

  /** Soft knee limiter: loud peaks squash instead of clipping into a crackle. */
  const softClip = (knee = 0.7) => {
    for (let i = 0; i < data.length; i += 1) {
      const value = data[i];
      const magnitude = Math.abs(value);
      if (magnitude <= knee) continue;
      const over = (magnitude - knee) / (1 - knee);
      data[i] = Math.sign(value) * (knee + (1 - knee) * Math.tanh(over));
    }
  };

  const peak = () => {
    let max = 0;
    for (let i = 0; i < data.length; i += 1) max = Math.max(max, Math.abs(data[i]));
    return max;
  };

  const scale = (factor) => {
    for (let i = 0; i < data.length; i += 1) data[i] *= factor;
  };

  /** Peak normalize to a headroom figure, so nothing ever touches full scale. */
  const normalize = (target = 0.85) => {
    const max = peak();
    if (max > 0) scale(target / max);
    return data;
  };

  /** Short fades at both ends so a file never starts or stops with a click. */
  const fadeEdges = (seconds = 0.01) => {
    const edge = frames(seconds);
    for (let i = 0; i < edge && i < data.length; i += 1) {
      const gain = attackEnv(i, seconds);
      data[i] *= gain;
      const tail = data.length - 1 - i;
      if (tail >= 0) data[tail] *= gain;
    }
    return data;
  };

  /**
   * Blends the tail of a loop back into its head, so repeating it has no seam
   * and no dip.
   */
  const wrapLoop = (seconds = 0.8) => {
    const length = Math.min(frames(seconds), Math.floor(data.length / 3));
    const start = data.length - length;
    // Fold the tail into the head: the first sample becomes the sample that
    // would come next in the loop, so the join has no step and no silence.
    for (let i = 0; i < length; i += 1) {
      const blend = i / length;
      data[i] = at(i) * blend + at(start + i) * (1 - blend);
    }
    // The tail has been folded in already, so it is trimmed off. Keeping it
    // would play those samples twice and leave a dip at every loop point.
    keep = start;
  };

  /** The whole finishing chain, in the order a mastering engineer would use. */
  const finish = ({ target = 0.85, cutoff = 7600, loop = false } = {}) => {
    dcBlock();
    lowpass(cutoff);
    softClip(0.7);
    if (loop) wrapLoop(0.8);
    else fadeEdges(0.012);
    normalize(target);
    return data.slice(0, keep);
  };

  return { data, note, pad, air, finish, peak, normalize, fadeEdges, softClip, dcBlock, lowpass, wrapLoop };
}

// ------------------------------------------------------------------- WAV

function writeWav(fileName, samples) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataLength, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  const file = path.join(OUT_DIR, fileName);
  fs.writeFileSync(file, buffer);

  let sum = 0;
  let max = 0;
  for (let i = 0; i < samples.length; i += 1) {
    sum += samples[i] * samples[i];
    max = Math.max(max, Math.abs(samples[i]));
  }
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  const toDb = (value) => (value <= 0 ? -120 : 20 * Math.log10(value));
  console.log(
    `wrote ${fileName} (${(samples.length / SAMPLE_RATE).toFixed(2)}s, peak ${toDb(max).toFixed(1)} dB, rms ${toDb(rms).toFixed(1)} dB, ${Math.round(
      buffer.length / 1024,
    )} KB)`,
  );
}

// ----------------------------------------------------------------- sounds

/** The softest possible acknowledgement that a finger landed. */
function tap() {
  const track = createTrack(0.1);
  track.note({ freq: NOTE.G5, duration: 0.075, amp: 0.5, decay: 0.045, brightness: 0.8, attack: 0.004 });
  return track.finish({ target: 0.55, cutoff: 6800 });
}

/** Two warm notes climbing, the sound of getting it right. */
function correct() {
  const track = createTrack(0.6);
  track.note({ freq: NOTE.C5, duration: 0.24, amp: 0.42, decay: 0.16, brightness: 0.9 });
  track.note({ freq: NOTE.G5, start: 0.12, duration: 0.42, amp: 0.46, decay: 0.34, brightness: 0.95 });
  track.note({ freq: NOTE.C6, start: 0.12, duration: 0.42, amp: 0.16, decay: 0.3, brightness: 0.8 });
  return track.finish({ target: 0.82 });
}

/** Bright but gentle double ping as coins drop out of a solved word. */
function coin() {
  const track = createTrack(0.36);
  track.note({ freq: NOTE.E6, duration: 0.14, amp: 0.4, decay: 0.075, brightness: 0.82 });
  track.note({ freq: NOTE.A6, start: 0.075, duration: 0.24, amp: 0.34, decay: 0.11, brightness: 0.78 });
  track.note({ freq: NOTE.A5, start: 0.075, duration: 0.24, amp: 0.14, decay: 0.14, brightness: 0.7 });
  return track.finish({ target: 0.8, cutoff: 7200 });
}

/** Three note sparkle for gems. */
function gem() {
  const track = createTrack(0.7);
  const notes = [NOTE.C6, NOTE.E6, NOTE.G6];
  notes.forEach((freq, index) => {
    track.note({ freq, start: index * 0.075, duration: 0.4 - index * 0.05, amp: 0.34, decay: 0.26 - index * 0.04, brightness: 0.82 });
  });
  track.note({ freq: NOTE.C5, start: 0.15, duration: 0.5, amp: 0.12, decay: 0.4, brightness: 0.7 });
  return track.finish({ target: 0.8, cutoff: 7400 });
}

/** A quick pentatonic run for a big combo, in tune with the music. */
function combo() {
  const track = createTrack(0.85);
  const run = [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5];
  run.forEach((freq, index) => {
    track.note({ freq, start: index * 0.085, duration: 0.3, amp: 0.3, decay: 0.2, brightness: 0.95 });
  });
  track.note({ freq: NOTE.C6, start: 0.42, duration: 0.42, amp: 0.26, decay: 0.32, brightness: 0.9 });
  return track.finish({ target: 0.85 });
}

/** A soft, kind "not quite" that never sounds like a buzzer. */
function wrong() {
  const track = createTrack(0.42);
  track.note({ freq: NOTE.E5, duration: 0.22, amp: 0.34, decay: 0.16, brightness: 0.62, attack: 0.018 });
  track.note({ freq: NOTE.C5, start: 0.14, duration: 0.28, amp: 0.32, decay: 0.22, brightness: 0.6, attack: 0.02 });
  track.pad({ freq: NOTE.C4, start: 0.02, duration: 0.36, amp: 0.1, attack: 0.06, release: 0.16 });
  return track.finish({ target: 0.6, cutoff: 5200 });
}

/** A slow descending sigh when the last heart goes. */
function lose() {
  const track = createTrack(1.3);
  const notes = [NOTE.A4, NOTE.G4, NOTE.E4];
  notes.forEach((freq, index) => {
    track.note({ freq, start: index * 0.26, duration: 0.4, amp: 0.3, decay: 0.28, brightness: 0.7, attack: 0.02 });
  });
  track.pad({ freq: NOTE.C4, start: 0.1, duration: 1.0, amp: 0.16, attack: 0.2, release: 0.4 });
  return track.finish({ target: 0.65, cutoff: 5000 });
}

/** Airy transition for screen changes and for putting a letter back. */
function whoosh() {
  const track = createTrack(0.42);
  track.air({ duration: 0.36, amp: 0.5, cutoff: 1500, attack: 0.08, release: 0.14, round: 2 });
  track.note({ freq: NOTE.G5, start: 0.06, duration: 0.24, amp: 0.1, decay: 0.18, brightness: 0.6 });
  return track.finish({ target: 0.5, cutoff: 5200 });
}

/** Soft taps as an egg splits, then a happy pair of notes. */
function hatch() {
  const track = createTrack(1.0);
  for (let i = 0; i < 6; i += 1) {
    track.air({ start: i * 0.06, duration: 0.05, amp: 0.34 - i * 0.02, cutoff: 1700, attack: 0.004, release: 0.02, round: 2 });
  }
  track.note({ freq: NOTE.C5, start: 0.38, duration: 0.3, amp: 0.36, decay: 0.2, brightness: 0.9 });
  track.note({ freq: NOTE.G5, start: 0.5, duration: 0.44, amp: 0.4, decay: 0.32, brightness: 0.95 });
  return track.finish({ target: 0.82 });
}

/** A warm rising sweep and a chord for an evolution. */
function evolve() {
  const track = createTrack(2.1);
  track.pad({ freq: NOTE.C4, duration: 1.5, amp: 0.2, attack: 0.6, release: 0.6 });
  const climb = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
  climb.forEach((freq, index) => {
    track.note({ freq, start: 0.3 + index * 0.2, duration: 0.6, amp: 0.24, decay: 0.4, brightness: 0.95 });
  });
  [NOTE.C5, NOTE.E5, NOTE.G5].forEach((freq) => {
    track.pad({ freq, start: 1.25, duration: 0.8, amp: 0.16, attack: 0.1, release: 0.5 });
  });
  return track.finish({ target: 0.88 });
}

/** Four note fanfare for a cleared level. */
function victory() {
  const track = createTrack(1.7);
  const notes = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
  notes.forEach((freq, index) => {
    track.note({ freq, start: index * 0.16, duration: 0.42, amp: 0.36, decay: 0.3, brightness: 0.95 });
  });
  track.note({ freq: NOTE.C6, start: 0.66, duration: 0.9, amp: 0.34, decay: 0.7, brightness: 0.9 });
  [NOTE.C5, NOTE.E5, NOTE.G5].forEach((freq) => {
    track.pad({ freq, start: 0.66, duration: 0.9, amp: 0.13, attack: 0.08, release: 0.5 });
  });
  return track.finish({ target: 0.9 });
}

/** A warm bell for the daily reward. */
function daily() {
  const track = createTrack(1.1);
  track.note({ freq: NOTE.G5, duration: 0.95, amp: 0.42, decay: 0.62, brightness: 0.95, attack: 0.01 });
  track.note({ freq: NOTE.C6, start: 0.04, duration: 0.8, amp: 0.2, decay: 0.5, brightness: 0.85 });
  track.note({ freq: NOTE.D6, start: 0.08, duration: 0.7, amp: 0.12, decay: 0.42, brightness: 0.8 });
  return track.finish({ target: 0.8, cutoff: 8400 });
}

/** Rounded maraca shaker for a crate being shaken before it opens. */
function eggshake() {
  const track = createTrack(0.7);
  for (let i = 0; i < 10; i += 1) {
    const start = i * 0.05 + (i % 3) * 0.005;
    track.air({ start, duration: 0.055, amp: 0.42 - (i % 2) * 0.08, cutoff: 2600, attack: 0.006, release: 0.03, round: 3 });
  }
  track.note({ freq: NOTE.G5, start: 0.2, duration: 0.4, amp: 0.12, decay: 0.24, brightness: 0.7 });
  return track.finish({ target: 0.7, cutoff: 6400 });
}

/**
 * The three monster sounds. They are friendly creature calls rather than
 * growls: a short rising note with a wobble and a soft low body underneath.
 */
function creature({ base, second, wobble, wobbleHz, duration }) {
  const track = createTrack(duration);
  track.pad({ freq: base / 2, duration: duration - 0.1, amp: 0.22, attack: 0.05, release: 0.3 });
  track.note({ freq: base, duration: duration * 0.6, amp: 0.34, decay: 0.3, brightness: 0.75, vibrato: wobble, vibratoHz: wobbleHz, attack: 0.03 });
  track.note({ freq: second, start: duration * 0.32, duration: duration * 0.6, amp: 0.32, decay: 0.34, brightness: 0.9, attack: 0.02 });
  track.air({ start: 0.05, duration: duration * 0.7, amp: 0.1, cutoff: 900, attack: 0.08, release: 0.2, round: 2 });
  return track.finish({ target: 0.78, cutoff: 6200 });
}

const roar1 = () => creature({ base: NOTE.C5, second: NOTE.E5, wobble: 0.02, wobbleHz: 8, duration: 0.9 });
const roar2 = () => creature({ base: NOTE.D5, second: NOTE.A5, wobble: 0.025, wobbleHz: 6.5, duration: 1.0 });
const roar3 = () => creature({ base: NOTE.G4, second: NOTE.D5, wobble: 0.018, wobbleHz: 5.5, duration: 1.1 });

/**
 * Background loop at 116 beats per minute: a four chord progression, a five
 * note hook that comes back on every other bar, a two note bass pulse and a
 * soft shaker, all built on the same pentatonic scale as the sound effects so
 * nothing ever clashes. The hook is the whole point. A tune that repeats a
 * short shape and then answers it is the one that stays in a child's head,
 * and the last bar lifts an octave so the loop has a small payoff before it
 * starts again.
 */
function music() {
  const BPM = 116;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const BARS = 8;
  const track = createTrack(BARS * BAR);

  // The pentatonic ladder everything is written on, low to high.
  const PENT = [
    NOTE.C4,
    NOTE.D4,
    NOTE.E4,
    NOTE.G4,
    NOTE.A4,
    NOTE.C5,
    NOTE.D5,
    NOTE.E5,
    NOTE.G5,
    NOTE.A5,
    NOTE.C6,
    NOTE.D6,
    NOTE.E6,
    NOTE.G6,
    NOTE.A6,
    NOTE.C7,
  ];
  const step = (index) => PENT[Math.max(0, Math.min(PENT.length - 1, index))];

  // One chord per two bars: C, G, A minor, and a soft F substitute, because F
  // itself is not in the pentatonic set this app is tuned to. Every figure is
  // the same rising then resolving shape, written so it lands on chord tones.
  const chords = [
    {
      pad: [NOTE.C4, NOTE.E4, NOTE.G4],
      root: NOTE.C4 / 2,
      fifth: NOTE.G4 / 2,
      statement: [8, 9, 8, 7, 5],
      answer: [9, 10, 9, 8, 7],
      lift: [12, 13, 12, 11, 9],
    },
    {
      pad: [NOTE.G4, NOTE.D5, NOTE.G5],
      root: NOTE.G4 / 2,
      fifth: NOTE.D5 / 2,
      statement: [6, 7, 8, 7, 6],
      answer: [7, 8, 9, 8, 7],
      lift: [10, 11, 10, 9, 7],
    },
    {
      pad: [NOTE.A4, NOTE.C5, NOTE.E5],
      root: NOTE.A4 / 2,
      fifth: NOTE.E5 / 2,
      statement: [7, 9, 10, 9, 7],
      answer: [8, 9, 10, 9, 8],
      lift: [11, 12, 11, 10, 8],
    },
    {
      pad: [NOTE.D4, NOTE.A4, NOTE.C5],
      root: NOTE.D4 / 2,
      fifth: NOTE.A4 / 2,
      statement: [9, 10, 9, 7, 6],
      answer: [10, 11, 10, 9, 7],
      lift: [13, 14, 13, 11, 10],
    },
  ];

  // The hook rhythm, in beats, with the last note held across the bar line.
  const HOOK_RHYTHM = [0, 0.5, 1, 1.75, 2.5];
  const HOOK_LENGTH = [0.45, 0.45, 0.6, 0.6, 1.2];
  const progression = [0, 0, 1, 1, 2, 2, 3, 3];

  progression.forEach((chordIndex, bar) => {
    const chord = chords[chordIndex];
    const barStart = bar * BAR;
    const answering = bar % 2 === 1;
    const finalBar = bar === BARS - 1;
    const figure = finalBar ? chord.lift : answering ? chord.answer : chord.statement;

    // The chord, held under the whole bar.
    chord.pad.forEach((freq, voice) => {
      track.pad({
        freq,
        start: barStart,
        duration: BAR * 0.96,
        amp: voice === 0 ? 0.075 : 0.05,
        attack: answering ? 0.45 : 0.55,
        release: 0.5,
      });
    });

    // Two soft bass notes per bar, root then fifth, which is what gives the
    // loop its pulse without a drum kit.
    track.pad({ freq: chord.root, start: barStart, duration: BEAT * 1.7, amp: 0.16, attack: 0.05, release: 0.35 });
    track.pad({ freq: chord.fifth, start: barStart + BEAT * 2, duration: BEAT * 1.7, amp: 0.12, attack: 0.05, release: 0.35 });

    // The hook itself.
    figure.forEach((note, noteIndex) => {
      track.note({
        freq: step(note),
        start: barStart + HOOK_RHYTHM[noteIndex] * BEAT,
        duration: HOOK_LENGTH[noteIndex] * BEAT,
        amp: finalBar ? 0.1 : 0.115,
        decay: noteIndex === 4 ? 0.5 : 0.22,
        brightness: finalBar ? 0.72 : 0.85,
        attack: 0.012,
      });
    });

    // A quiet octave echo after every answering phrase, so the hook rings on
    // in the child's head between the words.
    if (answering && !finalBar) {
      const last = figure[figure.length - 1] ?? 7;
      track.note({
        freq: step(last + 4),
        start: barStart + BEAT * 3.25,
        duration: BEAT * 0.5,
        amp: 0.05,
        decay: 0.3,
        brightness: 0.7,
        attack: 0.01,
      });
    }

    // Percussion: a soft low thump on beats one and three, a light shaker on
    // every offbeat, both quiet enough to sit under the melody.
    [0, 2].forEach((beat) => {
      track.air({ start: barStart + beat * BEAT, duration: 0.085, amp: 0.1, cutoff: 240, attack: 0.002, release: 0.045, round: 2 });
    });
    [0.5, 1.5, 2.5, 3.5].forEach((beat) => {
      track.air({ start: barStart + beat * BEAT, duration: 0.04, amp: 0.045, cutoff: 3200, attack: 0.002, release: 0.018, round: 3 });
    });
  });

  return track.finish({ target: 0.5, cutoff: 6200, loop: true });
}

// ------------------------------------------------------------------ write

const SOUNDS = [
  ['tap.wav', tap],
  ['correct.wav', correct],
  ['coin.wav', coin],
  ['gem.wav', gem],
  ['combo.wav', combo],
  ['wrong.wav', wrong],
  ['lose.wav', lose],
  ['whoosh.wav', whoosh],
  ['hatch.wav', hatch],
  ['evolve.wav', evolve],
  ['victory.wav', victory],
  ['daily.wav', daily],
  ['eggshake.wav', eggshake],
  ['roar1.wav', roar1],
  ['roar2.wav', roar2],
  ['roar3.wav', roar3],
  ['music.wav', music],
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [name, build] of SOUNDS) {
  writeWav(name, build());
}

console.log(`\nAll sounds written to ${path.relative(process.cwd(), OUT_DIR)}.`);
