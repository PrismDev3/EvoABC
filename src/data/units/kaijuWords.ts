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
    cue: 'kaiju-summit',
    gradient: ['#FF8A5C', '#C93B6B'],
    accent: '#8A1746',
    rule: {
      title: 'Monster words',
      text: 'These words are long, so build them one chunk at a time and say every chunk out loud as you go.',
      examples: ['TITAN', 'KAIJU', 'SPIKES'],
      focusPair: 'dino words',
    },
    words: [
      w('REX', 'dino', 'dinosaur', 'The king of the dinosaurs', { focus: [0, 1, 2] }),
      w('ROAR', 'dino', 'roar', 'The loud sound a dino makes', { focus: [0, 1, 2, 3] }),
      w('FANGS', 'dino', 'fangs', 'Super sharp teeth', { focus: [0, 1, 2, 3, 4] }),
      w('HORNS', 'dino', 'horns', 'Pointy bumps on a head', { focus: [0, 1, 2, 3, 4] }),
      w('SCALES', 'dino', 'scales', 'Hard plates on dino skin', { focus: [0, 1, 2, 3, 4, 5] }),
      w('SPIKES', 'dino', 'spikes', 'Sharp points along a tail', { focus: [0, 1, 2, 3, 4, 5] }),
      w('TITAN', 'dino', 'titan', 'A giant of legends', { focus: [0, 1, 2, 3, 4] }),
      w('KAIJU', 'dino', 'kaiju', 'A huge monster hero', { focus: [0, 1, 2, 3, 4] }),
      w('RAPTOR', 'dino', 'raptor', 'A fast hunter with sharp claws', { focus: [0, 1, 2, 3, 4, 5] }),
      w('CLAWS', 'dino', 'claws', 'Sharp toes a dino walks on', { focus: [0, 1, 2, 3, 4] }),
      w('THUNDER', 'dino', 'thunder', 'The loud boom in a storm', { focus: [0, 1, 2, 3, 4, 5, 6] }),
      w('MONSTER', 'dino', 'monster', 'A huge and scary creature', { focus: [0, 1, 2, 3, 4, 5, 6] }),
    ],
  },
];
