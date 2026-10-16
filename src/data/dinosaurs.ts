import { BodyShape, DinoStage, Rarity, Skin } from '../types';

/**
 * Dinosaur and kaiju roster. The art is generated from the body shape plus
 * colour and trait flags, so a brand new dinosaur is just a data entry.
 * Evolution is purely game progression: hatchling, teen, armored, kaiju, titan.
 */

const traits = (patch: Partial<Skin['traits']> = {}): Skin['traits'] => ({
  horns: false,
  armor: false,
  fins: false,
  wings: false,
  spikes: false,
  glowEyes: false,
  tailClub: false,
  longNeck: false,
  ...patch,
});

interface SkinSeed {
  id: string;
  name: string;
  species: string;
  rarity: Rarity;
  shape: BodyShape;
  blurb: string;
  colors: Skin['colors'];
  traits?: Partial<Skin['traits']>;
  companion?: boolean;
}

const SEEDS: SkinSeed[] = [
  {
    id: 'rex_verdant',
    name: 'Verdant Rex',
    species: 'Tyrannosaurus',
    rarity: 'common',
    shape: 'rex',
    blurb: 'A friendly green hunter with a huge heart.',
    colors: { body: '#57C87A', bodyDark: '#2C8C4F', belly: '#FFF0C2', accent: '#1F6B3B', glow: '#B8FF7A', eye: '#17263D' },
    traits: { spikes: true },
  },
  {
    id: 'trike_sand',
    name: 'Sand Trike',
    species: 'Triceratops',
    rarity: 'common',
    shape: 'trike',
    blurb: 'Three horns, one very calm dino.',
    colors: { body: '#F0B25C', bodyDark: '#B77A26', belly: '#FFEFCB', accent: '#7C4A12', glow: '#FFD98A', eye: '#17263D' },
    traits: { horns: true },
  },
  {
    id: 'raptor_sky',
    name: 'Swift Raptor',
    species: 'Velociraptor',
    rarity: 'common',
    shape: 'raptor',
    blurb: 'Fast, clever and always ready to spell.',
    colors: { body: '#7FB8F5', bodyDark: '#3C74C4', belly: '#E8F3FF', accent: '#23528F', glow: '#BEE0FF', eye: '#17263D' },
    traits: { spikes: true },
  },
  {
    id: 'spino_river',
    name: 'River Spino',
    species: 'Spinosaurus',
    rarity: 'rare',
    shape: 'spino',
    blurb: 'A river giant with a sail full of sunlight.',
    colors: { body: '#4FC9C0', bodyDark: '#1F7E7A', belly: '#E3FFFA', accent: '#125955', glow: '#9BFFF2', eye: '#17263D' },
    traits: { fins: true, spikes: true },
  },
  {
    id: 'ptera_gale',
    name: 'Gale Pteran',
    species: 'Pteranodon',
    rarity: 'rare',
    shape: 'ptera',
    blurb: 'Rides the wind and drops letters from above.',
    colors: { body: '#FF9F7A', bodyDark: '#C55B34', belly: '#FFEDE2', accent: '#8A3212', glow: '#FFD2B8', eye: '#17263D' },
    traits: { wings: true, horns: true },
  },
  {
    id: 'ankylo_boulder',
    name: 'Boulder Ankylo',
    species: 'Ankylosaurus',
    rarity: 'rare',
    shape: 'ankylo',
    blurb: 'Armoured head to tail. Nothing gets through.',
    colors: { body: '#A9A2C8', bodyDark: '#625C86', belly: '#EFEDFA', accent: '#3F3A5C', glow: '#D6D0FF', eye: '#17263D' },
    traits: { armor: true, tailClub: true },
  },
  {
    id: 'kaiju_jade',
    name: 'Jade Kaiju',
    species: 'Atomic Titan',
    rarity: 'epic',
    shape: 'kaiju',
    blurb: 'Its dorsal plates hum with green fire.',
    colors: { body: '#3AD39B', bodyDark: '#12856A', belly: '#DFFFF2', accent: '#0A5C4A', glow: '#6BFFC9', eye: '#1CFFD0' },
    traits: { fins: true, glowEyes: true, spikes: true },
  },
  {
    id: 'apex_knight',
    name: 'Apex Knight',
    species: 'Armoured Rex',
    rarity: 'epic',
    shape: 'rex',
    blurb: 'Plated in relic steel from the volcano forge.',
    colors: { body: '#8E9BB5', bodyDark: '#4B5670', belly: '#EDF2FA', accent: '#C9A227', glow: '#FFE07A', eye: '#FFD24D' },
    traits: { armor: true, horns: true, glowEyes: true },
  },
  {
    id: 'cyber_steel',
    name: 'Neon Cyber Rex',
    species: 'Cyber Rex',
    rarity: 'epic',
    shape: 'raptor',
    blurb: 'Sparks fly when it stomps. It loves long words.',
    colors: { body: '#5B6CFF', bodyDark: '#2B34A8', belly: '#E6E9FF', accent: '#00E5FF', glow: '#38F9FF', eye: '#38F9FF' },
    traits: { armor: true, glowEyes: true, spikes: true },
  },
  {
    id: 'godzilla_megasaur',
    name: 'Mega Godzilla Dino',
    species: 'Mega Kaiju',
    rarity: 'legendary',
    shape: 'kaiju',
    blurb: 'The loudest roar in the valley. A true spelling legend.',
    colors: { body: '#3E5B7A', bodyDark: '#20334A', belly: '#D9E6F5', accent: '#12324F', glow: '#4FD1FF', eye: '#8CE9FF' },
    traits: { fins: true, spikes: true, glowEyes: true },
  },
  {
    id: 'titan_gold',
    name: 'Golden Titanus',
    species: 'Primal Titan',
    rarity: 'legendary',
    shape: 'kaiju',
    blurb: 'Forged from sunrise and dinosaur courage.',
    colors: { body: '#F5C542', bodyDark: '#B37F0C', belly: '#FFF6D6', accent: '#8A5A00', glow: '#FFE79B', eye: '#FFF1B8' },
    traits: { fins: true, armor: true, horns: true, glowEyes: true },
  },
  {
    id: 'shadow_rex',
    name: 'Shadow Rex',
    species: 'Void Rex',
    rarity: 'legendary',
    shape: 'rex',
    blurb: 'Appears only to readers who never give up.',
    colors: { body: '#4B3B6B', bodyDark: '#241A3B', belly: '#C9B8F0', accent: '#FF3D7F', glow: '#FF5CA8', eye: '#FF3D7F' },
    traits: { armor: true, horns: true, glowEyes: true, spikes: true },
  },
  {
    id: 'buddy_trike',
    name: 'Little Trike',
    species: 'Baby Triceratops',
    rarity: 'common',
    shape: 'trike',
    blurb: 'A tiny buddy that loves to cheer.',
    colors: { body: '#9BE39B', bodyDark: '#4F9A5C', belly: '#F2FFE4', accent: '#2E6B39', glow: '#D8FFB0', eye: '#17263D' },
    traits: { horns: true },
    companion: true,
  },
  {
    id: 'buddy_ptero',
    name: 'Pip the Ptero',
    species: 'Baby Pteranodon',
    rarity: 'rare',
    shape: 'ptera',
    blurb: 'Flies in circles when you get a combo.',
    colors: { body: '#FFC08A', bodyDark: '#C97E42', belly: '#FFF3E0', accent: '#8A4B15', glow: '#FFE1B8', eye: '#17263D' },
    traits: { wings: true },
    companion: true,
  },
  {
    id: 'buddy_mini_kaiju',
    name: 'Mini Kaiju',
    species: 'Baby Titan',
    rarity: 'epic',
    shape: 'kaiju',
    blurb: 'A pocket sized monster with a mighty roar.',
    colors: { body: '#6FD7F5', bodyDark: '#2A7FA8', belly: '#E4FAFF', accent: '#14536E', glow: '#A8F4FF', eye: '#38F9FF' },
    traits: { fins: true, glowEyes: true },
    companion: true,
  },
  {
    id: 'buddy_longneck',
    name: 'Longneck Lulu',
    species: 'Baby Brachiosaurus',
    rarity: 'rare',
    shape: 'sauropod',
    blurb: 'Reaches the highest leaves and the highest scores.',
    colors: { body: '#D1C2FF', bodyDark: '#8877C4', belly: '#F4EFFF', accent: '#584598', glow: '#E8DEFF', eye: '#17263D' },
    traits: { longNeck: true },
    companion: true,
  },
  {
    id: 'buddy_stego',
    name: 'Spike the Stego',
    species: 'Baby Stegosaurus',
    rarity: 'common',
    shape: 'ankylo',
    blurb: 'Waves its plates like little flags.',
    colors: { body: '#FFB0C4', bodyDark: '#C46A85', belly: '#FFEDF2', accent: '#8A2C4A', glow: '#FFD6E2', eye: '#17263D' },
    traits: { spikes: true, armor: true },
    companion: true,
  },
];

export const SKINS: Skin[] = SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  species: seed.species,
  rarity: seed.rarity,
  shape: seed.shape,
  blurb: seed.blurb,
  colors: seed.colors,
  traits: traits(seed.traits),
  companion: seed.companion,
}));

export const DINOSAUR_SKINS: Skin[] = SKINS.filter((skin) => !skin.companion);
export const COMPANION_SKINS: Skin[] = SKINS.filter((skin) => skin.companion);

export const STARTER_SKIN_IDS = ['rex_verdant', 'trike_sand', 'raptor_sky'];

/** Player level checkpoints for each evolution. */
export const STAGES: DinoStage[] = [
  { id: 'hatchling', name: 'Baby Hatchling', minLevel: 1, tagline: 'Fresh out of the egg', scale: 0.72, aura: 0 },
  { id: 'teen', name: 'Teen Dino', minLevel: 3, tagline: 'Growing strong and curious', scale: 0.86, aura: 1 },
  { id: 'armored', name: 'Armoured Apex', minLevel: 6, tagline: 'Battle plates and glowing eyes', scale: 0.96, aura: 2 },
  { id: 'kaiju', name: 'Giant Kaiju Dino', minLevel: 10, tagline: 'A titan with atomic fins', scale: 1.08, aura: 3 },
  { id: 'titan', name: 'Primal Titan', minLevel: 15, tagline: 'Legend of the spelling valley', scale: 1.2, aura: 4 },
];

/** Evolution boosts applied on top of the equipped skin traits. */
export function stageTraits(stageIndex: number): Partial<Skin['traits']> {
  switch (stageIndex) {
    case 0:
      return {};
    case 1:
      return { spikes: true };
    case 2:
      return { armor: true, spikes: true, glowEyes: true };
    case 3:
      return { armor: true, spikes: true, fins: true, glowEyes: true };
    default:
      return { armor: true, spikes: true, fins: true, horns: true, glowEyes: true };
  }
}

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export function skinById(id: string): Skin {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0];
}
