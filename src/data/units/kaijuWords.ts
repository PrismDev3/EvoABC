import { RegionSeed, w } from '../wordSeed';

/**
 * Kaiju Summit, the last stop on the trail. These words are long, so the whole
 * word lights up as one chunk and the voice says it in pieces before spelling
 * it out letter by letter.
 */

export const KAIJU_REGIONS: RegionSeed[] = [
  {
    id: 'r_kaiju',
    unit: 'u10',
    name: 'Kaiju Summit',
    blurb: 'Long dinosaur and monster words for kaiju champions',
    tag: 'dino',
    emoji: '🐲',
    gradient: ['#FF8A5C', '#C93B6B'],
    accent: '#8A1746',
    rule: {
      title: 'Monster words',
      text: 'These words are long, so build them one chunk at a time and say every chunk out loud as you go.',
      examples: ['TITAN', 'KAIJU', 'SPIKES'],
      focusPair: 'dino words',
    },
    words: [
      w('REX', 'dino', '🦖', 'The king of the dinosaurs', { focus: [0, 1, 2] }),
      w('ROAR', 'dino', '📣', 'The loud sound a dino makes', { focus: [0, 1, 2, 3] }),
      w('FANGS', 'dino', '🦷', 'Super sharp teeth', { focus: [0, 1, 2, 3, 4] }),
      w('HORNS', 'dino', '🦌', 'Pointy bumps on a head', { focus: [0, 1, 2, 3, 4] }),
      w('SCALES', 'dino', '🦎', 'Hard plates on dino skin', { focus: [0, 1, 2, 3, 4, 5] }),
      w('SPIKES', 'dino', '🌵', 'Sharp points along a tail', { focus: [0, 1, 2, 3, 4, 5] }),
      w('TITAN', 'dino', '🗿', 'A giant of legends', { focus: [0, 1, 2, 3, 4] }),
      w('KAIJU', 'dino', '🐲', 'A huge monster hero', { focus: [0, 1, 2, 3, 4] }),
      w('RAPTOR', 'dino', '🦅', 'A fast hunter with sharp claws', { focus: [0, 1, 2, 3, 4, 5] }),
      w('CLAWS', 'dino', '🐾', 'Sharp toes a dino walks on', { focus: [0, 1, 2, 3, 4] }),
      w('THUNDER', 'dino', '⚡', 'The loud boom in a storm', { focus: [0, 1, 2, 3, 4, 5, 6] }),
      w('MONSTER', 'dino', '👹', 'A huge and scary creature', { focus: [0, 1, 2, 3, 4, 5, 6] }),
    ],
  },
];
