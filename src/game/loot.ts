import { Crate, Rarity, Skin } from '../types';
import { COMPANION_SKINS, DINOSAUR_SKINS, RARITY_ORDER } from '../data/dinosaurs';

/**
 * Mystery egg loot. The roll always prefers a dinosaur the player does not
 * own yet, which keeps the hatch animation exciting for a long time.
 */

export function poolFor(crate: Crate): Skin[] {
  return crate.pool === 'companions' ? COMPANION_SKINS : DINOSAUR_SKINS;
}

export function rollRarity(crate: Crate, roll: number): Rarity {
  const entries = RARITY_ORDER.map((rarity) => ({ rarity, weight: Math.max(0, crate.weights[rarity] ?? 0) })).filter(
    (entry) => entry.weight > 0,
  );
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0 || entries.length === 0) return 'common';
  let cursor = roll * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.rarity;
  }
  return entries[entries.length - 1]?.rarity ?? 'common';
}

export function duplicateGems(rarity: Rarity): number {
  switch (rarity) {
    case 'legendary':
      return 12;
    case 'epic':
      return 7;
    case 'rare':
      return 4;
    default:
      return 2;
  }
}

export interface RollInput {
  crate: Crate;
  ownedIds: string[];
  rand: () => number;
}

export interface RollResult {
  skin: Skin;
  duplicate: boolean;
  gemsBack: number;
}

export function rollCrate({ crate, ownedIds, rand }: RollInput): RollResult {
  const rarity = rollRarity(crate, rand());
  const pool = poolFor(crate);
  const owned = new Set(ownedIds);
  const inRarity = pool.filter((skin) => skin.rarity === rarity);
  const fresh = inRarity.filter((skin) => !owned.has(skin.id));
  const candidates = fresh.length > 0 ? fresh : pool.filter((skin) => !owned.has(skin.id));
  const finalists = candidates.length > 0 ? candidates : inRarity.length > 0 ? inRarity : pool;
  const index = Math.min(finalists.length - 1, Math.floor(rand() * finalists.length));
  const skin = finalists[Math.max(0, index)] ?? pool[0];
  const duplicate = skin === undefined || owned.has(skin.id);
  return {
    skin,
    duplicate,
    gemsBack: duplicate && skin !== undefined ? duplicateGems(skin.rarity) : 0,
  };
}
