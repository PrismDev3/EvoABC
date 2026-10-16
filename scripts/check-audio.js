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

  return {
    peak,
    rms: Math.sqrt(sum / Math.max(1, samples.length)),
    dc: dc / Math.max(1, samples.length),
    clipped,
    maxStep,
    harshness: totalEnergy > 0 ? residualEnergy / totalEnergy : 0,
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
console.log('\n  sound          length    peak      rms      dc   clicks   step   fizz');

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
  if (problems.length > 0) failures.push(`${name}: ${problems.join(', ')}`);

  console.log(
    `  ${name.padEnd(14)} ${result.duration.toFixed(2)}s  ${toDb(result.peak).toFixed(1).padStart(6)} dB  ${toDb(result.rms)
      .toFixed(1)
      .padStart(6)} dB  ${result.dc.toFixed(4).padStart(6)}  ${String(result.clipped).padStart(6)}  ${result.maxStep
      .toFixed(3)
      .padStart(6)}  ${(result.harshness * 100).toFixed(1).padStart(5)}%`,
  );
}

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} of ${files.length} sounds failed:`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log(`All ${files.length} sounds are clean: no clipping, no clicks, no buzz.`);
