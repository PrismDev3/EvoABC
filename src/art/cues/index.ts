import { CORE_CUES } from './core';
import { BLEND_CUES } from './blends';
import { BIGGER_WORD_CUES } from './biggerWords';
import { BOSSY_R_CUES } from './bossyR';
import { HEART_WORD_CUES } from './heartWords';
import { KAIJU_CUES } from './kaijuWords';
import { LETTER_TEAM_CUES } from './letterTeams';
import { MAGIC_E_CUES } from './magicE';
import { SHORT_VOWEL_CUES } from './shortVowels';
import { TRICKY_TEAM_CUES } from './trickyTeams';
import { CueCatalog, CueIconSpec, PLATE_TONES, PlateTone, toneForKey } from './types';
import { VOWEL_TEAM_CUES } from './vowelTeams';

export * from './types';
export { CORE_CUES } from './core';

/**
 * One lookup for every picture in the app. Each unit owns its own catalog so
 * the curriculum can grow one unit at a time, and this file only stitches them
 * together. A shared key is allowed: two units that show the same picture
 * simply describe it the same way.
 */
export const CUE_LIBRARY: CueCatalog = {
  ...CORE_CUES,
  ...SHORT_VOWEL_CUES,
  ...LETTER_TEAM_CUES,
  ...BLEND_CUES,
  ...TRICKY_TEAM_CUES,
  ...MAGIC_E_CUES,
  ...VOWEL_TEAM_CUES,
  ...BOSSY_R_CUES,
  ...BIGGER_WORD_CUES,
  ...HEART_WORD_CUES,
  ...KAIJU_CUES,
};

/** Every catalog, for the icon audit in the self check. */
export const CUE_CATALOGS: { file: string; catalog: CueCatalog }[] = [
  { file: 'core', catalog: CORE_CUES },
  { file: 'shortVowels', catalog: SHORT_VOWEL_CUES },
  { file: 'letterTeams', catalog: LETTER_TEAM_CUES },
  { file: 'blends', catalog: BLEND_CUES },
  { file: 'trickyTeams', catalog: TRICKY_TEAM_CUES },
  { file: 'magicE', catalog: MAGIC_E_CUES },
  { file: 'vowelTeams', catalog: VOWEL_TEAM_CUES },
  { file: 'bossyR', catalog: BOSSY_R_CUES },
  { file: 'biggerWords', catalog: BIGGER_WORD_CUES },
  { file: 'heartWords', catalog: HEART_WORD_CUES },
  { file: 'kaijuWords', catalog: KAIJU_CUES },
];

/** The icon behind a cue key, or null when nothing is drawn for it yet. */
export function cueSpec(key: string): CueIconSpec | null {
  return CUE_LIBRARY[key] ?? null;
}

export function hasCue(key: string): boolean {
  return CUE_LIBRARY[key] !== undefined;
}

/** Resolves the plate colours for a cue, honouring any tone it names. */
export function cueTone(key: string, spec: CueIconSpec | null): PlateTone {
  return spec?.tone ?? toneForKey(key);
}

export function cueColors(key: string, spec: CueIconSpec | null): (typeof PLATE_TONES)[PlateTone] {
  return PLATE_TONES[cueTone(key, spec)];
}

export const cueCount = (): number => Object.keys(CUE_LIBRARY).length;
