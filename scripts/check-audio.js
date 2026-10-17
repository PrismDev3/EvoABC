/**
 * Measures the generated sound effects instead of trusting the generator.
 *
 * Every file is decoded and checked for the things that make a game sound
 * terrible on a phone: samples squashed against full scale, a DC offset that
 * wastes headroom, a click at the start or the end, a waveform that jumps from
 * one sample to the next, and a top end so full of fizz that it reads as a
 * buzz rather than a note.
 *
 * Run with:  npm run audio:check
 */

const fs = require('fs');
const path = require('path');

// An optional directory argument lets you measure an older set of files, which
// is how the improvement was measured before and after the rewrite.
const AUDIO_DIR = process.argv[2] === undefined ? path.join(__dirname, '..', 'assets', 'audio') : path.resolve(process.argv[2]);

/** Ceiling for the high frequency share of the energy, per kind of sound. */
const HARSHNESS_LIMITS = {
  tap: 0.2,
  whoosh: 0.22,
  wrong: 0.2,
  lose: 0.2,
  hatch: 0.34,
  eggshake: 0.3,
  music: 0.26,
  correct: 0.36,
  coin: 0.4,
  gem: 0.4,
  combo: 0.36,
  evolve: 0.34,
  victory: 0.36,
  daily: 0.38,
  roar1: 0.3,
  roar2: 0.3,
  roar3: 0.3,
};

const DEFAULT_HARSHNESS_LIMIT = 0.36;

/**
 * What a button press has to stay, written as measurements instead of taste.
 *
 * The numbers come from measuring a commercial UI pack (the one that ships with
 * a volleyball game) through this same script: its button press peaks at
 * -7.9 dB, has an RMS of -31 dB, and rings for 70 ms. Quiet, and sparse.
 *
 * The old button here peaked at -7.5 dB with an RMS of -21.1 dB and rang for
 * 54 ms: four and a half decibels more energy in less than half the time, which
 * is what "super loud and like a beep" measured. So a press must now stay under
 * -8 dB at the peak, under -23 dB RMS, ring for no more than 40 ms, hold a
 * floor so that nobody quietly makes it inaudible, and stay dark.
 *
 * The ring figure is the one that catches a beep. A tone that is still audible
 * 50 ms after the finger lands is heard as a note; the same energy inside 25 ms
 * is heard as a touch, however loud it is.
 */
const PRESS_RULE = {
  peakDb: -8,
  rmsDb: -23,
  minRmsDb: -30,
  harshness: 0.04,
  maxSeconds: 0.15,
  maxRingMs: 40,
};

const SOUND_RULES = {
  tap: PRESS_RULE,
  tap2: PRESS_RULE,
  tap3: PRESS_RULE,
};

const toDbEarly = (value) => (value <= 0 ? -140 : 20 * Math.log10(value));

/** Sounds that are played on repeat, whose first and last samples must join. */
const LOOPING = new Set(['music']);

/** Reads a canonical little endian PCM wav file into floats between -1 and 1. */
function readWav(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') throw new Error('not a RIFF file');
  let offset = 12;
  let format = null;
  let dataOffset = -1;
  let dataLength = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      format = {
        audioFormat: buffer.readUInt16LE(offset + 8),
        channels: buffer.readUInt16LE(offset + 10),
        sampleRate: buffer.readUInt32LE(offset + 12),
        bitsPerSample: buffer.readUInt16LE(offset + 22),
      };
    } else if (id === 'data') {
      dataOffset = offset + 8;
      dataLength = Math.min(size, buffer.length - dataOffset);
    }
    offset += 8 + size + (size % 2);
  }
  if (format === null || dataOffset < 0) throw new Error('missing fmt or data chunk');
  if (format.audioFormat !== 1 || format.bitsPerSample !== 16) throw new Error('expected 16 bit PCM');

  const frames = Math.floor(dataLength / (2 * format.channels));
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    samples[i] = buffer.readInt16LE(dataOffset + i * 2 * format.channels) / 32768;
  }
  return { samples, sampleRate: format.sampleRate, channels: format.channels };
}

function measure(samples, sampleRate) {
  let peak = 0;
  let sum = 0;
  let dc = 0;
  let clipped = 0;
  let maxStep = 0;
  let low = 0;
  let residualEnergy = 0;
  let totalEnergy = 0;

  // A one pole low pass leaves the fizz behind when subtracted, which is a
  // good enough stand in for "how much of this is buzz".
  const alpha = 1 - Math.exp((-2 * Math.PI * 6000) / sampleRate);

  for (let i = 0; i < samples.length; i += 1) {
    const value = samples[i];
    const magnitude = Math.abs(value);
    peak = Math.max(peak, magnitude);
    sum += value * value;
    dc += value;
    if (magnitude >= 0.999) clipped += 1;
    if (i > 0) maxStep = Math.max(maxStep, Math.abs(value - samples[i - 1]));
    low += alpha * (value - low);
    const residual = value - low;
    residualEnergy += residual * residual;
    totalEnergy += value * value;
  }

  // How long the sound stays audible after its loudest moment, in milliseconds.
  // Measured in 1 ms blocks as the first block that never gets back above 10
  // percent of the peak (-20 dB). A tone that is still going half a second
  // later is a beep; the same energy inside 25 ms is a tap.
  let peakIndex = 0;
  for (let i = 0; i < samples.length; i += 1) if (Math.abs(samples[i]) === peak) peakIndex = i;
  const block = Math.max(1, Math.round(sampleRate / 1000));
  const threshold = peak * 0.1;
  let ringMs = 0;
  for (let start = peakIndex; start < samples.length; start += block) {
    let loudest = 0;
    for (let i = start; i < Math.min(start + block, samples.length); i += 1) loudest = Math.max(loudest, Math.abs(samples[i]));
    if (loudest <= threshold) {
      ringMs = ((start - peakIndex) / sampleRate) * 1000;
      break;
    }
  }

  return {
    peak,
    rms: Math.sqrt(sum / Math.max(1, samples.length)),
    dc: dc / Math.max(1, samples.length),
    clipped,
    maxStep,
    harshness: totalEnergy > 0 ? residualEnergy / totalEnergy : 0,
    ringMs,
    first: samples[0],
    last: samples[samples.length - 1],
    duration: samples.length / sampleRate,
  };
}

const toDb = (value) => (value <= 0 ? -140 : 20 * Math.log10(value));

const files = fs
  .readdirSync(AUDIO_DIR)
  .filter((name) => name.endsWith('.wav'))
  .sort();

if (files.length === 0) {
  console.error('No wav files found. Run npm run assets first.');
  process.exit(1);
}

const failures = [];
console.log('\n  sound          length    peak      rms      dc   clicks   step   fizz    ring');

for (const name of files) {
  const key = name.replace('.wav', '');
  const { samples, sampleRate } = readWav(path.join(AUDIO_DIR, name));
  const result = measure(samples, sampleRate);
  const limit = HARSHNESS_LIMITS[key] ?? DEFAULT_HARSHNESS_LIMIT;

  const problems = [];
  if (result.clipped > 0) problems.push(`${result.clipped} samples at full scale`);
  if (result.peak > 0.99) problems.push('peak above 0.99');
  if (Math.abs(result.dc) > 0.004) problems.push(`dc ${result.dc.toFixed(4)}`);
  if (Math.abs(result.maxStep) > 0.35) problems.push(`jump of ${result.maxStep.toFixed(3)} between samples`);
  if (result.harshness > limit) problems.push(`fizz ${(result.harshness * 100).toFixed(1)} percent over ${(limit * 100).toFixed(0)}`);
  // The music repeats, so its last sample has to flow into its first one. Files
  // that are played once get their silent edges checked instead.
  if (LOOPING.has(key)) {
    const seam = Math.abs(result.first - result.last);
    if (seam > 0.05) problems.push(`loop seam jumps by ${seam.toFixed(3)}`);
  } else if (Math.abs(result.first) > 0.03 || Math.abs(result.last) > 0.03) {
    problems.push('edge is not silent');
  }
  const rules = SOUND_RULES[key];
  if (rules !== undefined) {
    if (toDbEarly(result.peak) > rules.peakDb) problems.push(`peak ${toDbEarly(result.peak).toFixed(1)} dB over ${rules.peakDb} dB for a press`);
    if (toDbEarly(result.rms) > rules.rmsDb) problems.push(`rms ${toDbEarly(result.rms).toFixed(1)} dB over ${rules.rmsDb} dB for a press`);
    if (rules.minRmsDb !== undefined && toDbEarly(result.rms) < rules.minRmsDb) {
      problems.push(`rms ${toDbEarly(result.rms).toFixed(1)} dB under ${rules.minRmsDb} dB, too quiet for a press`);
    }
    if (result.harshness > rules.harshness) problems.push(`too bright for a press: ${(result.harshness * 100).toFixed(1)} percent`);
    if (result.duration > rules.maxSeconds) problems.push(`${result.duration.toFixed(2)}s is long for a press`);
    if (rules.maxRingMs !== undefined && result.ringMs > rules.maxRingMs) {
      problems.push(`rings for ${result.ringMs.toFixed(0)} ms, which is a beep rather than a tap`);
    }
  }
  if (problems.length > 0) failures.push(`${name}: ${problems.join(', ')}`);

  console.log(
    `  ${name.padEnd(14)} ${result.duration.toFixed(2)}s  ${toDb(result.peak).toFixed(1).padStart(6)} dB  ${toDb(result.rms)
      .toFixed(1)
      .padStart(6)} dB  ${result.dc.toFixed(4).padStart(6)}  ${String(result.clipped).padStart(6)}  ${result.maxStep
      .toFixed(3)
      .padStart(6)}  ${(result.harshness * 100).toFixed(1).padStart(5)}%  ${result.ringMs.toFixed(0).padStart(5)}ms`,
  );
}

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} of ${files.length} sounds failed:`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log(`All ${files.length} sounds are clean: no clipping, no clicks, no buzz.`);
