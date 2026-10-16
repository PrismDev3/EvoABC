import { RegionSeed, w } from '../wordSeed';

/**
 * Unit 8: Bigger Words.
 * Short patterns start appearing inside longer words: the ing ending, twin
 * letters in the middle, and two small words joined into one big word.
 */

export const BIGGER_WORD_REGIONS: RegionSeed[] = [
  {
    id: 'r_ing',
    unit: 'u8',
    name: 'Growing Grove',
    blurb: 'Words that end in ing',
    tag: 'ending',
    emoji: '🌳',
    gradient: ['#8FE3B0', '#35B87A'],
    accent: '#17734A',
    rule: {
      focusPair: 'ing',
      title: 'The ing ending',
      text: 'Lots of words finish with i, n and g. Read the start of the word first, then add ing at the end.',
      examples: ['KING', 'RING', 'SING'],
    },
    words: [
      w('KING', 'ending', '👑', 'A ruler who wears a crown', { focus: [1, 2, 3] }),
      w('RING', 'ending', '💍', 'You wear it on your finger', { focus: [1, 2, 3] }),
      w('SING', 'ending', '🎤', 'To make music with your voice', { focus: [1, 2, 3] }),
      w('WING', 'ending', '🕊️', 'A bird uses it to fly', { focus: [1, 2, 3] }),
      w('THING', 'ending', '🧸', 'Another word for an object', { focus: [2, 3, 4] }),
      w('BRING', 'ending', '🎁', 'To carry something to someone', { focus: [2, 3, 4] }),
      w('STRING', 'ending', '🧵', 'A thin cord you can tie', { focus: [3, 4, 5] }),
      w('SPRING', 'ending', '🌸', 'The season when flowers open', { focus: [3, 4, 5] }),
      w('STING', 'ending', '🐝', 'What a bee does when it is cross', { focus: [2, 3, 4] }),
      w('SWING', 'ending', '🤸', 'You push it at the playground and fly up', { focus: [2, 3, 4] }),
    ],
  },
  {
    id: 'r_double',
    unit: 'u8',
    name: 'Twin Trouble',
    blurb: 'Words with two letters the same in a row',
    tag: 'ending',
    emoji: '👯',
    gradient: ['#8FE3E0', '#2FA8A0'],
    accent: '#146B66',
    rule: {
      focusPair: 'double letters',
      title: 'Twin letters',
      text: 'Some words have two of the same letter standing together. You say the sound once, but you have to write both letters.',
      examples: ['BELL', 'MESS', 'HILL'],
    },
    words: [
      w('BELL', 'ending', '🔔', 'It rings and makes a bright sound', { focus: [2, 3] }),
      w('MESS', 'ending', '🧺', 'A room with toys all over the floor', { focus: [2, 3] }),
      w('HILL', 'ending', '⛰️', 'A small mountain you can walk up', { focus: [2, 3] }),
      w('CUFF', 'ending', '🧤', 'The end of a sleeve by your wrist', { focus: [2, 3] }),
      w('FALL', 'ending', '🍂', 'When leaves drop from the trees', { focus: [2, 3] }),
      w('GRASS', 'ending', '🌱', 'The green stuff all over the ground', { focus: [3, 4] }),
      w('STUFF', 'ending', '📦', 'Another word for things', { focus: [3, 4] }),
      w('TELL', 'ending', '🗣️', 'To say something to someone', { focus: [2, 3] }),
      w('PUFF', 'ending', '☁️', 'A small soft blow of air', { focus: [2, 3] }),
      w('CROSS', 'ending', '🚫', 'A mark you make with two lines', { focus: [3, 4] }),
    ],
  },
  {
    id: 'r_compound',
    unit: 'u8',
    name: 'Dragon Bonds',
    blurb: 'Two small words joined into one big word',
    tag: 'compound',
    emoji: '🐲',
    gradient: ['#FFB0C8', '#EE5A87'],
    accent: '#A81746',
    rule: {
      focusPair: 'compound words',
      title: 'Two words in one',
      text: 'A compound word is two little words stuck together. Read them one at a time and the big word is easy.',
      examples: ['SUNSET', 'HOTDOG', 'RAINBOW'],
    },
    words: [
      w('SUNSET', 'compound', '🌇', 'The sky turns orange and the sun goes down'),
      w('HOTDOG', 'compound', '🌭', 'A sausage in a soft roll'),
      w('FOOTBALL', 'compound', '🏈', 'A game where you throw and run with a ball'),
      w('BEDTIME', 'compound', '🛏️', 'The time when you go to sleep'),
      w('RAINBOW', 'compound', '🌈', 'Colours in the sky after the rain'),
      w('CUPCAKE', 'compound', '🧁', 'A tiny cake with frosting on top'),
      w('STARFISH', 'compound', '⭐', 'A sea animal shaped like a star'),
      w('BACKPACK', 'compound', '🎒', 'A bag you carry on your shoulders'),
      w('SNOWMAN', 'compound', '⛄', 'A person made of snow with a carrot nose'),
      w('PLAYGROUND', 'compound', '🛝', 'The place at school with swings and slides'),
    ],
  },
];
