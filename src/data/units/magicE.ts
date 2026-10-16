import { RegionSeed, w } from '../wordSeed';

/**
 * Unit 5: the magic e. Every word here ends in a silent e that makes the vowel
 * in the middle say its own name. The focus index points at that vowel and the
 * silent index points at the quiet final e, so the teaching card can show both.
 */

export const MAGIC_E_REGIONS: RegionSeed[] = [
  {
    id: 'r_magice',
    unit: 'u5',
    name: 'Magic Volcano',
    blurb: 'The silent e makes the vowel say its own name',
    tag: 'magicE',
    emoji: '✨',
    gradient: ['#C7A8FF', '#9A6BFF'],
    accent: '#5F35C7',
    rule: {
      title: 'The magic e',
      text: 'The e at the end of these words is silent. It is magic because it makes the vowel in the middle say its own name. CAP turns into CAPE.',
      examples: ['CAKE', 'BIKE', 'NOTE'],
      focusPair: 'magic e',
    },
    words: [
      w('CAKE', 'magicE', '🎂', 'A sweet treat for your birthday', { focus: [1], silent: [3] }),
      w('BIKE', 'magicE', '🚲', 'You ride it on two wheels', { focus: [1], silent: [3] }),
      w('NOTE', 'magicE', '📝', 'A short message you write down', { focus: [1], silent: [3] }),
      w('TAPE', 'magicE', '🩹', 'It sticks paper together', { focus: [1], silent: [3] }),
      w('KITE', 'magicE', '🪁', 'It flies high on a windy day', { focus: [1], silent: [3] }),
      w('HOME', 'magicE', '🏠', 'The place where you live', { focus: [1], silent: [3] }),
      w('CUBE', 'magicE', '🧊', 'A shape with six square sides', { focus: [1], silent: [3] }),
      w('GAME', 'magicE', '🎲', 'Something fun you play with friends', { focus: [1], silent: [3] }),
      w('PINE', 'magicE', '🌲', 'A tall tree with green needles', { focus: [1], silent: [3] }),
      w('ROPE', 'magicE', '🪢', 'A thick cord for pulling and tying', { focus: [1], silent: [3] }),
    ],
  },
];
