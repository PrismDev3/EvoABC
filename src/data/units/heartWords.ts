import { RegionSeed, w } from '../wordSeed';

/**
 * Heart words. These cannot be sounded out, so they are learned by sight:
 * look at the whole word, hear it, say it, then spell it from memory.
 * Every entry carries a sentence because the words only make sense in one.
 */

export const HEART_WORD_REGIONS: RegionSeed[] = [
  {
    id: 'r_sight1',
    unit: 'u9',
    name: 'Word Forest',
    blurb: 'Everyday words we read all the time',
    tag: 'sight',
    emoji: '📖',
    gradient: ['#94E9B8', '#33C98C'],
    accent: '#17855A',
    rule: {
      title: 'Words to know by heart',
      text: 'These words do not follow the sound rules, so we learn them by looking and saying them again and again.',
      examples: ['THE', 'YOU', 'SAID'],
      focusPair: 'heart words',
    },
    words: [
      w('THE', 'sight', '📖', 'The names one special thing', { sentence: 'The big dino roars.' }),
      w('AND', 'sight', '➕', 'And joins two things together', { sentence: 'I like cats and dogs.' }),
      w('YOU', 'sight', '👋', 'You means the person reading this', { sentence: 'You can do it.' }),
      w('WAS', 'sight', '⏪', 'Was means it already happened', { sentence: 'The egg was warm.' }),
      w('FOR', 'sight', '🎁', 'For means it is meant for someone', { sentence: 'This star is for you.' }),
      w('ARE', 'sight', '👥', 'Are means more than one', { sentence: 'We are a team.' }),
      w('HIS', 'sight', '👦', 'His means it belongs to a boy', { sentence: 'His dino is huge.' }),
      w('HER', 'sight', '👧', 'Her means it belongs to a girl', { sentence: 'Her egg just hatched.' }),
      w('SAID', 'sight', '💬', 'Said means someone spoke', { sentence: 'She said hello.' }),
      w('THEY', 'sight', '🤝', 'They means more than one person', { sentence: 'They are my friends.' }),
      w('HAVE', 'sight', '🎒', 'Have means you own something', { sentence: 'I have a pet.' }),
      w('WANT', 'sight', '⭐', 'Want is a wish for something', { sentence: 'I want a snack.' }),
    ],
  },
  {
    id: 'r_sight2',
    unit: 'u9',
    name: 'Raptor Cliffs',
    blurb: 'More everyday words for fast readers',
    tag: 'sight',
    emoji: '🪶',
    gradient: ['#FFE59A', '#FFC94D'],
    accent: '#A87400',
    rule: {
      title: 'More words to know by heart',
      text: 'Another set of everyday words. Say each one, then spell it from memory without peeking.',
      examples: ['FROM', 'WHAT', 'AGAIN'],
      focusPair: 'heart words',
    },
    words: [
      w('FROM', 'sight', '🧭', 'From shows where something started', { sentence: 'I come from home.' }),
      w('COME', 'sight', '🏃', 'Come means move over here', { sentence: 'Come and play.' }),
      w('SOME', 'sight', '🥣', 'Some means a few of something', { sentence: 'I ate some grapes.' }),
      w('WHAT', 'sight', '❓', 'What asks about something', { sentence: 'What is that?' }),
      w('THERE', 'sight', '📍', 'There points to a place', { sentence: 'The dino is over there.' }),
      w('WHERE', 'sight', '🗺️', 'Where asks about a place', { sentence: 'Where is my hat?' }),
      w('COULD', 'sight', '💪', 'Could means maybe you are able to', { sentence: 'I could run fast.' }),
      w('WOULD', 'sight', '🤔', 'Would means you might do it', { sentence: 'I would like some soup.' }),
      w('SHOULD', 'sight', '👍', 'Should means it is a good idea', { sentence: 'We should share.' }),
      w('AGAIN', 'sight', '🔁', 'Again means one more time', { sentence: 'Let us play again.' }),
      w('VERY', 'sight', '💥', 'Very makes a word stronger', { sentence: 'That is very big.' }),
      w('ONCE', 'sight', '☝️', 'Once means one single time', { sentence: 'I found it once.' }),
    ],
  },
];
