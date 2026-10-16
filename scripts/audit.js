/**
 * Guards the two rules that are easy to break by accident:
 *
 * 1. No emoji anywhere in the app. Pictures are real vector icons from
 *    src/art/cues, and an emoji that creeps back in renders differently on
 *    every phone and cannot be recoloured.
 * 2. No em dash or en dash in UI copy, which the theme already scrubs but new
 *    strings can still smuggle in.
 *
 * Run with:  npm run audit
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['src', 'scripts'];
const SCAN_FILES = ['App.tsx', 'index.ts'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.selfcheck', 'dist']);

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;
const DASHES = /[\u2012\u2013\u2014\u2015]/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = [...SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir))), ...SCAN_FILES.map((file) => path.join(ROOT, file))];

const emojiHits = [];
const dashHits = [];

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    const relative = path.relative(ROOT, file);
    const emoji = line.match(EMOJI);
    if (emoji !== null) emojiHits.push(`${relative}:${index + 1} ${emoji.join(' ')}`);
    // Comments may use a hyphen instead, so the check looks at string literals only.
    const dashes = line.match(DASHES);
    if (dashes !== null && /['"`]/.test(line)) dashHits.push(`${relative}:${index + 1}`);
  });
}

console.log(`Scanned ${files.length} files.`);
if (emojiHits.length === 0) console.log('  ok   no emoji anywhere');
else console.log(`  FAIL ${emojiHits.length} lines still use emoji:\n       ${emojiHits.slice(0, 10).join('\n       ')}`);

if (dashHits.length === 0) console.log('  ok   no long dashes in strings');
else console.log(`  FAIL ${dashHits.length} lines have an em dash or en dash:\n       ${dashHits.slice(0, 10).join('\n       ')}`);

if (emojiHits.length > 0 || dashHits.length > 0) process.exit(1);
