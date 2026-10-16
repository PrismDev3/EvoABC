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
    cue: 'growing-grove',
    gradient: ['#8FE3B0', '#35B87A'],
    accent: '#17734A',
    rule: {
      focusPair: 'ing',
      title: 'The ing ending',
      text: 'Lots of words finish with i, n and g. Read the start of the word first, then add ing at the end.',
      examples: ['KING', 'RING', 'SING'],
    },
    words: [
      w('KING', 'ending', 'crown', 'A ruler who wears a crown', { focus: [1, 2, 3] }),
      w('RING', 'ending', 'ring', 'You wear it on your finger', { focus: [1, 2, 3] }),
      w('SING', 'ending', 'microphone', 'To make music with your voice', { focus: [1, 2, 3] }),
      w('WING', 'ending', 'bird', 'A bird uses it to fly', { focus: [1, 2, 3] }),
      w('THING', 'ending', 'teddy-bear', 'Another word for an object', { focus: [2, 3, 4] }),
      w('BRING', 'ending', 'gift', 'To carry something to someone', { focus: [2, 3, 4] }),
      w('STRING', 'ending', 'needle', 'A thin cord you can tie', { focus: [3, 4, 5] }),
      w('SPRING', 'ending', 'flower', 'The season when flowers open', { focus: [3, 4, 5] }),
      w('STING', 'ending', 'bee', 'What a bee does when it is cross', { focus: [2, 3, 4] }),
      w('SWING', 'ending', 'swing', 'You push it at the playground and fly up', { focus: [2, 3, 4] }),
    ],
  },
  {
    id: 'r_double',
    unit: 'u8',
    name: 'Twin Trouble',
    blurb: 'Words with two letters the same in a row',
    tag: 'ending',
    cue: 'twin-trouble',
    gradient: ['#8FE3E0', '#2FA8A0'],
    accent: '#146B66',
    rule: {
      focusPair: 'double letters',
      title: 'Twin letters',
      text: 'Some words have two of the same letter standing together. You say the sound once, but you have to write both letters.',
      examples: ['BELL', 'MESS', 'HILL'],
    },
    words: [
      w('BELL', 'ending', 'bell', 'It rings and makes a bright sound', { focus: [2, 3] }),
      w('MESS', 'ending', 'basket', 'A room with toys all over the floor', { focus: [2, 3] }),
      w('HILL', 'ending', 'mountain', 'A small mountain you can walk up', { focus: [2, 3] }),
      w('CUFF', 'ending', 'sleeve', 'The end of a sleeve by your wrist', { focus: [2, 3] }),
      w('FALL', 'ending', 'leaf', 'When leaves drop from the trees', { focus: [2, 3] }),
      w('GRASS', 'ending', 'grass', 'The green stuff all over the ground', { focus: [3, 4] }),
      w('STUFF', 'ending', 'package', 'Another word for things', { focus: [3, 4] }),
      w('TELL', 'ending', 'talking', 'To say something to someone', { focus: [2, 3] }),
      w('PUFF', 'ending', 'cloud', 'A small soft blow of air', { focus: [2, 3] }),
      w('CROSS', 'ending', 'cross', 'A mark you make with two lines', { focus: [3, 4] }),
    ],
  },
  {
    id: 'r_compound',
    unit: 'u8',
    name: 'Dragon Bonds',
    blurb: 'Two small words joined into one big word',
    tag: 'compound',
    cue: 'dragon-bonds',
    gradient: ['#FFB0C8', '#EE5A87'],
    accent: '#A81746',
    rule: {
      focusPair: 'compound words',
      title: 'Two words in one',
      text: 'A compound word is two little words stuck together. Read them one at a time and the big word is easy.',
      examples: ['SUNSET', 'HOTDOG', 'RAINBOW'],
    },
    words: [
      w('SUNSET', 'compound', 'sunset', 'The sky turns orange and the sun goes down'),
      w('HOTDOG', 'compound', 'hotdog', 'A sausage in a soft roll'),
      w('FOOTBALL', 'compound', 'football', 'A game where you throw and run with a ball'),
      w('BEDTIME', 'compound', 'bed', 'The time when you go to sleep'),
      w('RAINBOW', 'compound', 'rainbow', 'Colours in the sky after the rain'),
      w('CUPCAKE', 'compound', 'cupcake', 'A tiny cake with frosting on top'),
      w('STARFISH', 'compound', 'starfish', 'A sea animal shaped like a star'),
      w('BACKPACK', 'compound', 'backpack', 'A bag you carry on your shoulders'),
      w('SNOWMAN', 'compound', 'snowman', 'A person made of snow with a carrot nose'),
      w('PLAYGROUND', 'compound', 'playground', 'The place at school with swings and slides'),
    ],
  },
];
