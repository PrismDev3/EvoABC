import { CueCatalog } from './types';

/**
 * Picture cues for the two letter teams: sh, ch, th, wh and ck.
 * Every name below is a real glyph in the packs the app ships.
 */

export const LETTER_TEAM_CUES: CueCatalog = {
  // Region badges.
  seashell: { name: 'waves', tone: 'sky' },
  fries: { name: 'french-fries', tone: 'sun' },
  // Shared with the thunder badge elsewhere, so it uses the same glyph.
  thunder: { name: 'weather-lightning', tone: 'stone' },
  wind: { name: 'weather-windy', tone: 'sky' },
  'hiking-boot': { name: 'hiking', tone: 'sand' },

  // sh: Whisper Cove.
  ship: { name: 'ferry' },
  storefront: { name: 'storefront', tone: 'coral' },
  fish: { name: 'fish', tone: 'sky' },
  brush: { name: 'brush', tone: 'grape' },
  shark: { name: 'shark', tone: 'stone' },
  wish: { name: 'star-shooting', tone: 'grape' },
  dish: { name: 'silverware-fork-knife', tone: 'sand' },
  shut: { name: 'door', tone: 'sand' },
  shrimp: { name: 'shrimp', pack: 'fa6', tone: 'coral' },

  // ch: Chomp Caves.
  popcorn: { name: 'popcorn', tone: 'sun' },
  chat: { name: 'chat', tone: 'sky' },
  lunch: { name: 'food', tone: 'mint' },
  bench: { name: 'bench-back', tone: 'sand' },
  chick: { name: 'bird', tone: 'sun' },
  chop: { name: 'axe', tone: 'stone' },
  much: { name: 'numeric-9-plus-box', tone: 'mint' },
  rich: { name: 'cash-multiple', tone: 'mint' },
  chest: { name: 'toolbox', tone: 'coral' },
  catch: { name: 'baseball', tone: 'sky' },

  // th: Thunder Throne.
  'point-here': { name: 'arrow-right-bold', tone: 'mint' },
  'point-there': { name: 'arrow-up-bold', tone: 'sky' },
  thin: { name: 'minus', tone: 'stone' },
  thumb: { name: 'thumb-up', tone: 'mint' },
  moth: { name: 'butterfly', tone: 'grape' },
  bath: { name: 'bathtub', tone: 'sky' },
  trail: { name: 'map-marker-path', tone: 'sand' },
  three: { name: 'numeric-3', tone: 'grape' },
  thick: { name: 'wall', tone: 'stone' },
  tooth: { name: 'tooth', tone: 'sky' },

  // wh: Whirlwind Peak.
  when: { name: 'clock', tone: 'sun' },
  whip: { name: 'ice-cream', tone: 'rose' },
  wheel: { name: 'cog', tone: 'stone' },
  whale: { name: 'fish', tone: 'sky' },
  white: { name: 'circle-outline', tone: 'stone' },
  which: { name: 'help-circle', tone: 'grape' },
  whisk: { name: 'spoon', pack: 'fa6', tone: 'sand' },
  wheat: { name: 'grain', tone: 'sun' },
  whisper: { name: 'volume-low', tone: 'grape' },
  while: { name: 'timer-sand', tone: 'sand' },

  // ck: Kickback Ridge.
  duck: { name: 'duck', tone: 'sky' },
  sock: { name: 'shoe-sneaker', tone: 'rose' },
  kick: { name: 'soccer', tone: 'mint' },
  rock: { name: 'terrain', tone: 'stone' },
  black: { name: 'circle', tone: 'stone' },
  back: { name: 'arrow-left-bold', tone: 'coral' },
  luck: { name: 'clover', tone: 'mint' },
  pack: { name: 'gift', tone: 'rose' },
  sick: { name: 'emoticon-sick', tone: 'coral' },
  stuck: { name: 'magnet', tone: 'coral' },
};
