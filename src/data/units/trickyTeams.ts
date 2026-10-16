import { RegionSeed, w } from '../wordSeed';

/**
 * Unit 4: Tricky Letter Teams.
 * This is where spelling stops matching what you hear: ph makes an f sound, and
 * k, w and b can all go completely quiet. The silent indexes mark the letters
 * that are written but not said, so the teaching card can dim them.
 */

export const TRICKY_REGIONS: RegionSeed[] = [
  {
    id: 'r_ph',
    unit: 'u4',
    name: 'Phone Fossils',
    blurb: 'ph sounds just like f',
    tag: 'digraph',
    emoji: '🦴',
    gradient: ['#F0D2A8', '#C9975C'],
    accent: '#8A5A22',
    rule: {
      title: 'ph says f',
      text: 'When p and h stand together they make the f sound. Put your top teeth on your lip and push the air out: fff. That is why PHONE starts with the same sound as the word FUN.',
      examples: ['PHONE', 'PHOTO', 'DOLPHIN'],
      focusPair: 'ph',
    },
    words: [
      w('PHONE', 'digraph', '📱', 'You talk to people on it', { focus: [0, 1] }),
      w('PHOTO', 'digraph', '📷', 'A picture you take with a camera', { focus: [0, 1] }),
      w('DOLPHIN', 'digraph', '🐬', 'A clever sea animal that jumps', { focus: [3, 4] }),
      w('ELEPHANT', 'digraph', '🐘', 'A huge grey animal with a long nose', { focus: [3, 4] }),
      w('GRAPH', 'digraph', '📊', 'A drawing that shows numbers', { focus: [3, 4] }),
      w('TRIUMPH', 'digraph', '🏆', 'A big win after trying hard', { focus: [5, 6] }),
      w('ALPHABET', 'digraph', '🔤', 'All the letters from A to Z', { focus: [2, 3] }),
      w('ORPHAN', 'digraph', '🐣', 'A young animal with nobody to look after it', { focus: [2, 3] }),
    ],
  },
  {
    id: 'r_knwr',
    unit: 'u4',
    name: 'Silent Stones',
    blurb: 'A quiet k in kn and a quiet w in wr',
    tag: 'silent',
    emoji: '🪨',
    gradient: ['#C3CBD9', '#8E9BB5'],
    accent: '#4B5670',
    rule: {
      title: 'quiet k and quiet w',
      text: 'These letters are written but never said. In kn the k is quiet, so KNEE begins with the n sound. In wr the w is quiet, so WRITE begins with the r sound.',
      examples: ['KNEE', 'KNIFE', 'WRITE'],
      focusPair: 'kn and wr',
    },
    words: [
      w('KNEE', 'silent', '🦵', 'The joint in the middle of your leg', { focus: [1], silent: [0] }),
      w('KNOT', 'silent', '🪢', 'A string tied tight in a loop', { focus: [1], silent: [0] }),
      w('KNIFE', 'silent', '🔪', 'It cuts your food on a plate', { focus: [1], silent: [0] }),
      w('WRITE', 'silent', '✏️', 'What you do with a pencil', { focus: [1], silent: [0] }),
      w('KNOCK', 'silent', '🚪', 'To tap on a door', { focus: [1], silent: [0] }),
      w('KNOW', 'silent', '💡', 'To have the answer in your head', { focus: [1], silent: [0] }),
      w('WRIST', 'silent', '⌚', 'The joint between your hand and your arm', { focus: [1], silent: [0] }),
      w('WRAP', 'silent', '🎁', 'To cover a present with paper', { focus: [1], silent: [0] }),
      w('WROTE', 'silent', '📝', 'You did this with a pencil yesterday', { focus: [1], silent: [0] }),
      w('KNIGHT', 'silent', '🛡️', 'A brave fighter in shiny armour', { focus: [1], silent: [0] }),
    ],
  },
  {
    id: 'r_silentb',
    unit: 'u4',
    name: 'Quiet Lamb',
    blurb: 'A quiet b at the end of mb words',
    tag: 'silent',
    emoji: '🐑',
    gradient: ['#B7E9B7', '#57C87A'],
    accent: '#1E6B3A',
    rule: {
      title: 'the quiet b',
      text: 'At the end of these words the b is written but never said. In LAMB you say the m and the b stays completely quiet.',
      examples: ['LAMB', 'THUMB', 'COMB'],
      focusPair: 'mb',
    },
    words: [
      w('LAMB', 'silent', '🐑', 'A baby sheep', { focus: [2], silent: [3] }),
      w('THUMB', 'silent', '👍', 'The short fat finger on your hand', { focus: [3], silent: [4] }),
      w('COMB', 'silent', '💇', 'You use it to tidy your hair', { focus: [2], silent: [3] }),
      w('CLIMB', 'silent', '🧗', 'To go up a tree or a ladder', { focus: [3], silent: [4] }),
      w('LIMB', 'silent', '🦵', 'An arm or a leg is one of these', { focus: [2], silent: [3] }),
      w('CRUMB', 'silent', '🍞', 'A tiny bit of bread left on the plate', { focus: [3], silent: [4] }),
      w('PLUMB', 'silent', '📐', 'Straight up and down, like a hanging string', { focus: [3], silent: [4] }),
      w('BOMB', 'silent', '💣', 'It makes a huge bang', { focus: [2], silent: [3] }),
      w('NUMB', 'silent', '🧊', 'What your fingers feel like in the snow', { focus: [2], silent: [3] }),
    ],
  },
];
