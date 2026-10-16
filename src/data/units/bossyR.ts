import { RegionSeed, w } from '../wordSeed';

/**
 * Unit 7: Bossy R.
 * The letter r bosses the vowel around, so ar and or get a region of their own,
 * and then er, ir and ur share one because they all make the same sound.
 */

export const BOSSY_R_REGIONS: RegionSeed[] = [
  {
    id: 'r_bossyar',
    unit: 'u7',
    name: 'Tiger Plateau',
    blurb: 'ar and or, where the r takes over the vowel',
    tag: 'bossyR',
    cue: 'tiger-plateau',
    gradient: ['#FFA94D', '#F2740E'],
    accent: '#B34F00',
    rule: {
      focusPair: 'ar and or',
      title: 'The r is bossy',
      text: 'When r comes right after a vowel it bosses it around. ar says ar like a pirate, and or says or like a door.',
      examples: ['CAR', 'FORK', 'STAR'],
    },
    words: [
      w('CAR', 'bossyR', 'car', 'It drives on the road', { focus: [1, 2] }),
      w('STAR', 'bossyR', 'twinkle', 'It twinkles in the night sky', { focus: [2, 3] }),
      w('FORK', 'bossyR', 'fork', 'You eat dinner with it', { focus: [1, 2] }),
      w('CORN', 'bossyR', 'corn', 'A yellow vegetable on a cob', { focus: [1, 2] }),
      w('FARM', 'bossyR', 'farm', 'A place with animals and fields', { focus: [1, 2] }),
      w('SHARK', 'bossyR', 'shark', 'A big fish with sharp teeth', { focus: [2, 3] }),
      w('STORM', 'bossyR', 'storm', 'Loud thunder and lots of rain', { focus: [2, 3] }),
      w('HORSE', 'bossyR', 'horse', 'You can ride it and it says neigh', { focus: [1, 2] }),
      w('PARK', 'bossyR', 'park', 'A green place to run and play', { focus: [1, 2] }),
      w('BORN', 'bossyR', 'hatchling', 'When a baby comes out of its egg it is this', { focus: [1, 2] }),
    ],
  },
  {
    id: 'r_bossyer',
    unit: 'u7',
    name: 'Hermit Hills',
    blurb: 'er, ir and ur all make the same sound',
    tag: 'bossyR',
    cue: 'hermit-hills',
    gradient: ['#BFA2FF', '#7C4DFF'],
    accent: '#4318A8',
    rule: {
      focusPair: 'er ir and ur',
      title: 'Three ways to say er',
      text: 'er, ir and ur all say the same sound, the one in the middle of bird and her. You just have to remember which one hides inside each word.',
      examples: ['HER', 'BIRD', 'TURN'],
    },
    words: [
      w('HER', 'bossyR', 'her', 'It belongs to a girl', { focus: [1, 2] }),
      w('BIRD', 'bossyR', 'bird', 'A little animal with feathers and wings', { focus: [1, 2] }),
      w('TURN', 'bossyR', 'turn', 'To spin around to the other side', { focus: [1, 2] }),
      w('FERN', 'bossyR', 'fern', 'A green plant with curly leaves', { focus: [1, 2] }),
      w('GIRL', 'bossyR', 'girl', 'A young person who is not a boy', { focus: [1, 2] }),
      w('HURT', 'bossyR', 'hurt', 'When something makes you say ouch', { focus: [1, 2] }),
      w('GERM', 'bossyR', 'germ', 'A tiny bug that can make you sick', { focus: [1, 2] }),
      w('CURL', 'bossyR', 'curl', 'Hair that twists around like a spring', { focus: [1, 2] }),
      w('SIR', 'bossyR', 'sir', 'A polite way to talk to a man', { focus: [1, 2] }),
      w('SURF', 'bossyR', 'surf', 'To ride a board on the waves', { focus: [1, 2] }),
    ],
  },
];
