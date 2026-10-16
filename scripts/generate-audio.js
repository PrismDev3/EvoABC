/**
 * Synthesizes every sound effect EvoABC plays, as 22050 Hz 16 bit mono WAV
 * files in assets/audio. No dependencies, no downloads, and the app stays
 * fully offline because the audio ships inside the binary.
 *
 * Run with:  npm run assets     (or: node scripts/generate-audio.js)
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'audio');

const frames = (seconds) => Math.max(1, Math.round(seconds * SAMPLE_RATE));

// ------------------------------------------------------------------ track

function createTrack(lengthSeconds) {
  const data = new Float32Array(frames(lengthSeconds));

  const mix = (index, value) => {
    if (index >= 0 && index < data.length) data[index] += value;
  };

  /** Basic oscillator with harmonics, glide and a simple attack and release. */
  const tone = ({
    freq,
    start = 0,
    duration,
    amp = 0.5,
    type = 'sine',
    glide = 0,
    harmonics = [],
    attack = 0.006,
    release = 0.05,
    tremolo = 0,
    tremoloHz = 18,
  }) => {
    const from = frames(start);
    const count = frames(duration);
    let phase = 0;
    for (let i = 0; i < count; i += 1) {
      const progress = i / count;
      const currentFreq = Math.max(20, freq + glide * progress);
      phase += (2 * Math.PI * currentFreq) / SAMPLE_RATE;
      const wrapped = (phase / (2 * Math.PI)) % 1;
      let value;
      switch (type) {
        case 'saw':
          value = 2 * wrapped - 1;
          break;
        case 'square':
          value = wrapped < 0.5 ? 1 : -1;
          break;
        case 'triangle':
          value = 2 * Math.abs(2 * wrapped - 1) - 1;
          break;
        default:
          value = Math.sin(phase);
      }
      for (const [multiple, level] of harmonics) value += level * Math.sin(phase * multiple);
      const attackEnv = Math.min(1, i / Math.max(1, frames(attack)));
      const releaseEnv = Math.min(1, (count - i) / Math.max(1, frames(release)));
      const trem = tremolo > 0 ? 1 - tremolo / 2 + (tremolo / 2) * Math.sin((2 * Math.PI * tremoloHz * i) / SAMPLE_RATE) : 1;
      mix(from + i, value * amp * attackEnv * releaseEnv * trem);
    }
  };

  /** Filtered noise, optionally sweeping its cutoff for whooshes and crackles. */
  const noise = ({ start = 0, duration, amp = 0.35, cutoff = 1200, sweepTo = null, cutoffEnd = null, attack = 0.004, release = 0.06 }) => {
    const from = frames(start);
    const count = frames(duration);
    const endCutoff = cutoffEnd ?? sweepTo ?? cutoff;
    let last = 0;
    for (let i = 0; i < count; i += 1) {
      const progress = i / count;
      const fc = cutoff + (endCutoff - cutoff) * progress;
      const alpha = 1 - Math.exp((-2 * Math.PI * fc) / SAMPLE_RATE);
      const white = Math.random() * 2 - 1;
      last += alpha * (white - last);
      const attackEnv = Math.min(1, i / Math.max(1, frames(attack)));
      const releaseEnv = Math.min(1, (count - i) / Math.max(1, frames(release)));
      mix(from + i, last * amp * attackEnv * releaseEnv * 3);
    }
  };

  /** Tiny transient used for rattles, cracks and clicks. */
  const click = ({ start = 0, duration = 0.02, amp = 0.5 }) => {
    noise({ start, duration, amp, cutoff: 3000, cutoffEnd: 900, attack: 0.0005, release: duration * 0.8 });
  };

  const normalize = (peak = 0.92) => {
    let max = 0;
    for (let i = 0; i < data.length; i += 1) max = Math.max(max, Math.abs(data[i]));
    if (max <= 0) return data;
    const scale = peak / max;
    for (let i = 0; i < data.length; i += 1) data[i] *= scale;
    return data;
  };

  /** Short fades at both ends so nothing starts or stops with a click. */
  const fadeEdges = (seconds = 0.006) => {
    const edge = frames(seconds);
    for (let i = 0; i < edge; i += 1) {
      const gain = i / edge;
      data[i] *= gain;
      const tail = data.length - 1 - i;
      if (tail >= 0) data[tail] *= gain;
    }
    return data;
  };

  return { data, tone, noise, click, normalize, fadeEdges };
}

// ------------------------------------------------------------------- WAV

function writeWav(fileName, samples) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataLength, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  const file = path.join(OUT_DIR, fileName);
  fs.writeFileSync(file, buffer);
  const duration = (samples.length / SAMPLE_RATE).toFixed(2);
  console.log(`wrote ${fileName} (${duration}s, ${Math.round(buffer.length / 1024)} KB)`);
}

// ----------------------------------------------------------------- sounds

/** Soft interface blip for every tap. */
function tap() {
  const track = createTrack(0.09);
  track.tone({ freq: 620, duration: 0.06, amp: 0.5, release: 0.04, harmonics: [[2, 0.12]] });
  return track.normalize(0.8);
}

/** Happy two note chime for a correct spelling. */
function correct() {
  const track = createTrack(0.5);
  track.tone({ freq: 1046.5, duration: 0.16, amp: 0.5, release: 0.08, harmonics: [[2, 0.2], [3, 0.08]] });
  track.tone({ freq: 1318.5, start: 0.13, duration: 0.34, amp: 0.55, release: 0.28, harmonics: [[2, 0.24], [3, 0.1]] });
  return track.normalize(0.9);
}

/** Bright arcade ping as coins drop out of a solved word. */
function coin() {
  const track = createTrack(0.34);
  track.tone({ freq: 1180, start: 0, duration: 0.13, amp: 0.5, glide: 620, type: 'square', release: 0.05, harmonics: [[2, 0.2]] });
  track.tone({ freq: 1760, start: 0.11, duration: 0.2, amp: 0.42, type: 'square', release: 0.16, harmonics: [[2, 0.18]] });
  return track.normalize(0.88);
}

/** Sparkly arpeggio for gems. */
function gem() {
  const track = createTrack(0.52);
  [1174.7, 1568, 2093].forEach((freq, index) => {
    track.tone({ freq, start: index * 0.075, duration: 0.36 - index * 0.05, amp: 0.42, release: 0.24, harmonics: [[2, 0.16], [3, 0.06]] });
  });
  return track.normalize(0.88);
}

/** Rising swoosh that celebrates a big combo. */
function combo() {
  const track = createTrack(0.6);
  track.noise({ duration: 0.42, amp: 0.3, cutoff: 500, cutoffEnd: 4200 });
  track.tone({ freq: 420, duration: 0.42, amp: 0.32, glide: 760, type: 'saw', release: 0.16, harmonics: [[2, 0.14]] });
  track.tone({ freq: 1568, start: 0.4, duration: 0.2, amp: 0.45, release: 0.16, harmonics: [[2, 0.2]] });
  return track.normalize(0.9);
}

/** Short low buzz when a life is lost. */
function wrong() {
  const track = createTrack(0.32);
  track.tone({ freq: 240, duration: 0.26, amp: 0.45, glide: -90, type: 'saw', release: 0.1, harmonics: [[2, 0.16]] });
  return track.normalize(0.75);
}

/** Gentle descending phrase used when all three hearts are gone. */
function lose() {
  const track = createTrack(1.1);
  [659.3, 587.3, 440].forEach((freq, index) => {
    track.tone({ freq, start: index * 0.22, duration: 0.34, amp: 0.4, release: 0.2, type: 'triangle' });
  });
  track.noise({ start: 0.7, duration: 0.35, amp: 0.12, cutoff: 900, cutoffEnd: 300 });
  return track.normalize(0.75);
}

/** Airy transition for screen changes and returning a letter. */
function whoosh() {
  const track = createTrack(0.4);
  track.noise({ duration: 0.34, amp: 0.34, cutoff: 2600, cutoffEnd: 320, attack: 0.02, release: 0.16 });
  return track.normalize(0.7);
}

/** Crackle and crack as an egg splits open. */
function hatch() {
  const track = createTrack(0.8);
  for (let i = 0; i < 7; i += 1) track.click({ start: i * 0.045, duration: 0.03, amp: 0.5 });
  track.noise({ start: 0.32, duration: 0.36, amp: 0.36, cutoff: 1600, cutoffEnd: 500 });
  track.tone({ freq: 880, start: 0.34, duration: 0.4, amp: 0.3, glide: 400, release: 0.26, harmonics: [[2, 0.18]] });
  return track.normalize(0.9);
}

/** Big rising sweep with a chord on top for an evolution. */
function evolve() {
  const track = createTrack(1.9);
  track.tone({ freq: 180, duration: 1.5, amp: 0.3, glide: 900, type: 'saw', release: 0.3, harmonics: [[2, 0.16], [3, 0.08]] });
  track.noise({ start: 0.1, duration: 1.4, amp: 0.2, cutoff: 400, cutoffEnd: 5200 });
  [523.3, 659.3, 784].forEach((freq) => {
    track.tone({ freq, start: 1.15, duration: 0.7, amp: 0.26, release: 0.5, harmonics: [[2, 0.16]], tremolo: 0.18, tremoloHz: 6 });
  });
  return track.normalize(0.95);
}

/** Four note fanfare for a cleared level. */
function victory() {
  const track = createTrack(1.5);
  const notes = [
    { freq: 523.3, start: 0 },
    { freq: 659.3, start: 0.16 },
    { freq: 784, start: 0.32 },
    { freq: 1046.5, start: 0.5 },
  ];
  notes.forEach(({ freq, start }) => {
    track.tone({ freq, start, duration: 0.34, amp: 0.4, release: 0.2, harmonics: [[2, 0.22], [3, 0.08]] });
  });
  track.tone({ freq: 1046.5, start: 0.62, duration: 0.8, amp: 0.42, release: 0.5, harmonics: [[2, 0.2]] });
  track.tone({ freq: 523.3, start: 0.62, duration: 0.8, amp: 0.24, release: 0.5 });
  return track.normalize(0.95);
}

/** Warm bell for the daily reward. */
function daily() {
  const track = createTrack(0.9);
  track.tone({ freq: 880, duration: 0.8, amp: 0.45, release: 0.6, harmonics: [[2, 0.22], [3, 0.1], [4.2, 0.05]] });
  track.tone({ freq: 1320, start: 0.06, duration: 0.6, amp: 0.2, release: 0.45, harmonics: [[2, 0.14]] });
  return track.normalize(0.85);
}

/** Rattle of a crate being shaken before it opens. */
function eggshake() {
  const track = createTrack(0.6);
  for (let i = 0; i < 14; i += 1) {
    const start = i * 0.038 + (i % 3) * 0.004;
    track.click({ start, duration: 0.022, amp: 0.34 + (i % 2) * 0.12 });
  }
  track.tone({ freq: 220, start: 0.2, duration: 0.3, amp: 0.16, type: 'triangle', tremolo: 0.4, tremoloHz: 24, release: 0.2 });
  return track.normalize(0.8);
}

/** Three distinct monster growls for correct spellings and combos. */
function roar(options) {
  const { base, drop, duration, tremoloHz, noiseAmp, harmonics } = options;
  const track = createTrack(duration);
  track.tone({ freq: base, duration: duration - 0.15, amp: 0.5, glide: drop, type: 'saw', release: 0.35, tremolo: 0.5, tremoloHz, harmonics });
  track.tone({ freq: base * 0.5, duration: duration - 0.2, amp: 0.28, glide: drop * 0.4, type: 'sine', release: 0.4 });
  track.noise({ duration: duration - 0.1, amp: noiseAmp, cutoff: 700, cutoffEnd: 240, attack: 0.03, release: 0.3 });
  return track.normalize(0.96);
}

function roar1() {
  return roar({ base: 150, drop: -85, duration: 1.1, tremoloHz: 22, noiseAmp: 0.22, harmonics: [[2, 0.18], [3, 0.08]] });
}

function roar2() {
  return roar({ base: 205, drop: -120, duration: 0.95, tremoloHz: 14, noiseAmp: 0.32, harmonics: [[2, 0.24], [3, 0.12], [4, 0.06]] });
}

function roar3() {
  return roar({ base: 112, drop: -60, duration: 1.35, tremoloHz: 9, noiseAmp: 0.26, harmonics: [[2, 0.2], [3, 0.14], [5, 0.05]] });
}

/** Seamless twelve second background loop: four chords of soft arpeggio. */
function music() {
  const track = createTrack(12);
  const chords = [
    [261.6, 329.6, 392],
    [220, 261.6, 329.6],
    [174.6, 220, 261.6],
    [196, 246.9, 293.7],
  ];
  chords.forEach((chord, chordIndex) => {
    const chordStart = chordIndex * 3;
    track.tone({ freq: chord[0] / 2, start: chordStart, duration: 2.9, amp: 0.16, type: 'triangle', attack: 0.2, release: 0.4 });
    for (let step = 0; step < 6; step += 1) {
      const note = chord[step % chord.length];
      track.tone({
        freq: note * (step % 3 === 2 ? 2 : 1),
        start: chordStart + step * 0.5,
        duration: 0.6,
        amp: 0.1,
        attack: 0.03,
        release: 0.34,
        harmonics: [[2, 0.12]],
      });
    }
  });
  return track.normalize(0.55);
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

/** Short fades on both ends of an already rendered buffer, so nothing clicks. */
function applyEdgeFade(samples, seconds = 0.008) {
  const edge = Math.max(1, Math.round(seconds * SAMPLE_RATE));
  for (let i = 0; i < edge && i < samples.length; i += 1) {
    const gain = i / edge;
    samples[i] *= gain;
    const tail = samples.length - 1 - i;
    if (tail >= 0) samples[tail] *= gain;
  }
  return samples;
}

for (const [name, build] of SOUNDS) {
  const samples = build();
  // The music loop is left unfaded so it repeats without a dip at the seam.
  if (name !== 'music.wav') applyEdgeFade(samples);
  writeWav(name, samples);
}

console.log(`\nAll sounds written to ${path.relative(process.cwd(), OUT_DIR)} or already up to date.`);
