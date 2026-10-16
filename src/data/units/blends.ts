import { RegionSeed, w } from '../wordSeed';

/**
 * Unit 3: Blend Starters.
 * A blend is two consonant letters that keep both of their sounds. The focus
 * indexes mark the blend so the teaching card can highlight it.
 */

export const BLEND_REGIONS: RegionSeed[] = [
  {
    id: 'r_stsp',
    unit: 'u3',
    name: 'Stomp Trail',
    blurb: 'Words that start with st, sp and sn',
    tag: 'blend',
    cue: 'footprints',
    gradient: ['#FFC48A', '#FF9A5C'],
    accent: '#C4601F',
    rule: {
      title: 'st and sp',
      text: 'Blends keep both sounds. Say s then t with no gap: st. Say s then p: sp. Keep it fast and joined, like one sound.',
      examples: ['STOP', 'STEP', 'SPIN'],
      focusPair: 'st and sp',
    },
    words: [
      w('STOP', 'blend', 'stop-sign', 'What the red sign says', { focus: [0, 1] }),
      w('STEP', 'blend', 'footprints', 'One move of your foot', { focus: [0, 1] }),
      w('SPIN', 'blend', 'spin', 'To turn round and round', { focus: [0, 1] }),
      w('STAR', 'blend', 'star', 'It twinkles in the night sky', { focus: [0, 1] }),
      w('STAMP', 'blend', 'postage-stamp', 'A sticker that sends a letter', { focus: [0, 1] }),
      w('STICK', 'blend', 'sticks', 'A thin piece of wood from a tree', { focus: [0, 1] }),
      w('SPOT', 'blend', 'spots', 'A round mark on a dino', { focus: [0, 1] }),
      w('SPY', 'blend', 'spy', 'Someone who watches and stays hidden', { focus: [0, 1] }),
      w('SPILL', 'blend', 'spilled-cup', 'What happens when a cup tips over', { focus: [0, 1] }),
      w('SNAKE', 'blend', 'snake', 'A long animal that slides with no legs', { focus: [0, 1] }),
    ],
  },
  {
    id: 'r_rblends',
    unit: 'u3',
    name: 'Bramble Ridge',
    blurb: 'Words that start with br, cr, dr and tr',
    tag: 'blend',
    cue: 'bridge',
    gradient: ['#C7A8FF', '#9A6BFF'],
    accent: '#5F35C7',
    rule: {
      title: 'br, cr, dr and tr',
      text: 'Say both letters without stopping. b then r makes br. Try cr, dr and tr the same way and keep the sounds glued together.',
      examples: ['BRICK', 'CRAB', 'DRUM'],
      focusPair: 'br cr dr tr',
    },
    words: [
      w('BRICK', 'blend', 'brick-wall', 'A block you build a wall with', { focus: [0, 1] }),
      w('CRAB', 'blend', 'sea-creature', 'It walks sideways on the beach', { focus: [0, 1] }),
      w('DRUM', 'blend', 'drum', 'You bang it to make a beat', { focus: [0, 1] }),
      w('TREE', 'blend', 'tree', 'It grows tall with green leaves', { focus: [0, 1] }),
      w('DRAGON', 'blend', 'dragon', 'A giant beast that breathes fire', { focus: [0, 1] }),
      w('TRUCK', 'blend', 'truck', 'A big vehicle that carries heavy loads', { focus: [0, 1] }),
      w('BRIDGE', 'blend', 'bridge', 'It crosses over a river', { focus: [0, 1] }),
      w('CROWN', 'blend', 'crown', 'A king wears it on his head', { focus: [0, 1] }),
      w('DRESS', 'blend', 'dress', 'Something you wear to a party', { focus: [0, 1] }),
      w('TRAP', 'blend', 'trap', 'A hidden hole that can catch you', { focus: [0, 1] }),
    ],
  },
  {
    id: 'r_lblends',
    unit: 'u3',
    name: 'Frost Plateaus',
    blurb: 'Words that start with fl, gl, pl and sl',
    tag: 'blend',
    cue: 'snowflake',
    gradient: ['#B7E9FF', '#6FCBEF'],
    accent: '#1C7FA8',
    rule: {
      title: 'fl, gl, pl and sl',
      text: 'Say both letters in one breath. f then l makes fl, like the start of FLAG. Try gl, pl and sl the very same way.',
      examples: ['FLAG', 'GLUE', 'SLED'],
      focusPair: 'fl gl pl sl',
    },
    words: [
      w('FLAG', 'blend', 'flag', 'It waves in the wind on a pole', { focus: [0, 1] }),
      w('FLIP', 'blend', 'flip', 'To turn over in the air', { focus: [0, 1] }),
      w('GLUE', 'blend', 'glue', 'It sticks paper together', { focus: [0, 1] }),
      w('SLED', 'blend', 'sled', 'You ride it down a snowy hill', { focus: [0, 1] }),
      w('FLOWER', 'blend', 'flower', 'A pretty bloom in the garden', { focus: [0, 1] }),
      w('GLAD', 'blend', 'happy-face', 'Feeling happy inside', { focus: [0, 1] }),
      w('PLUG', 'blend', 'plug', 'It gives power to a lamp', { focus: [0, 1] }),
      w('SLIP', 'blend', 'snowflake', 'What happens when your feet slide', { focus: [0, 1] }),
      w('PLANE', 'blend', 'plane', 'It flies high up in the sky', { focus: [0, 1] }),
      w('SLIDE', 'blend', 'slide', 'You whoosh down it at the playground', { focus: [0, 1] }),
    ],
  },
];
