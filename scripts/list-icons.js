/**
 * Writes scripts/icon-names.txt: every glyph name the app is allowed to use
 * for a picture cue, one per line as "<pack> <name>".
 *
 * Picture cues used to be emoji. Emoji look different on every phone, cannot
 * be recoloured and read as cheap on iOS, so every cue is now a real vector
 * icon from the two packs EvoABC ships. This file is the source of truth for
 * which names exist, and `npm run selfcheck` fails if a cue points at a name
 * that is not in here.
 *
 * Run with:  npm run icons:list
 */

const fs = require('fs');
const path = require('path');

const GLYPH_DIR = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'vector-icons',
  'build',
  'vendor',
  'react-native-vector-icons',
  'glyphmaps',
);

/** Only two packs ship in the app, so the bundle stays small. */
const PACKS = [
  ['mci', 'MaterialCommunityIcons.json'],
  ['fa6', 'FontAwesome6Free.json'],
];

const OUT_FILE = path.join(__dirname, 'icon-names.txt');

function readGlyphs(fileName) {
  const file = path.join(GLYPH_DIR, fileName);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Object.keys(raw).filter((name) => /^[a-z0-9-]+$/.test(name));
}

const lines = [
  '# Every icon name EvoABC can use for a picture cue, as "<pack> <name>".',
  '# mci is MaterialCommunityIcons, fa6 is FontAwesome6. Both are bundled.',
  '# Regenerate with: npm run icons:list',
  '',
];

let total = 0;
for (const [pack, fileName] of PACKS) {
  const names = readGlyphs(fileName).sort();
  total += names.length;
  for (const name of names) lines.push(`${pack} ${name}`);
  console.log(`${pack}: ${names.length} names`);
}

fs.writeFileSync(OUT_FILE, `${lines.join('\n')}\n`);
console.log(`\nWrote ${total} names to ${path.relative(process.cwd(), OUT_FILE)}`);
