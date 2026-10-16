/**
 * Picture cues.
 *
 * EvoABC used to draw its word pictures with emoji. Emoji look different on
 * every phone, cannot be recoloured to match a card, and read as unfinished on
 * iOS, so every cue is now a real vector icon from the two icon packs the app
 * ships. A cue key such as `bee` maps to one glyph, and the glyph name must
 * exist in scripts/icon-names.txt, which `npm run selfcheck` enforces.
 */

/** The two bundled icon packs. mci is by far the largest, so it is the default. */
export type IconPack = 'mci' | 'fa6';

/** Plate colour families. Each one is a soft background with a dark ink on it. */
export type PlateTone = 'sky' | 'mint' | 'sun' | 'coral' | 'grape' | 'rose' | 'sand' | 'stone';

export interface CueIconSpec {
  /** Exact glyph name, as listed in scripts/icon-names.txt as "<pack> <name>". */
  name: string;
  /** Icon pack to draw it from. Defaults to mci. */
  pack?: IconPack;
  /** Plate colour. Left out means a stable tone is picked from the cue key. */
  tone?: PlateTone;
}

/** A unit sized chunk of the cue library, keyed by cue name. */
export type CueCatalog = Record<string, CueIconSpec>;

interface PlateColors {
  /** Plate background. */
  bg: string;
  /** Icon fill drawn on the plate. */
  ink: string;
  /** Slightly darker edge so the plate has a shape. */
  edge: string;
}

export const PLATE_TONES: Record<PlateTone, PlateColors> = {
  sky: { bg: '#DCEFFF', ink: '#0E6FA8', edge: '#B4DDF7' },
  mint: { bg: '#DCF6E6', ink: '#12804F', edge: '#A9E7C6' },
  sun: { bg: '#FFF2CC', ink: '#946200', edge: '#F2DC9A' },
  coral: { bg: '#FFE2D6', ink: '#C0460F', edge: '#F7C3AC' },
  grape: { bg: '#E9E2FF', ink: '#4B2FB8', edge: '#C9BCFF' },
  rose: { bg: '#FFE0E6', ink: '#B32443', edge: '#F8B7C2' },
  sand: { bg: '#F6EEDC', ink: '#7A5A20', edge: '#E3D2B0' },
  stone: { bg: '#E7EEF6', ink: '#3C5578', edge: '#C6D5E6' },
};

/** Order used when a cue does not name its own tone. */
export const PLATE_ORDER: PlateTone[] = ['sky', 'mint', 'sun', 'coral', 'grape', 'rose', 'sand', 'stone'];

/** Picks the same tone for the same key every time, so nothing flickers. */
export function toneForKey(key: string): PlateTone {
  let hash = 7;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100003;
  }
  return PLATE_ORDER[hash % PLATE_ORDER.length] ?? 'sky';
}
