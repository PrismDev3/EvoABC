# EvoABC

A dinosaur and kaiju spelling game for 1st graders (ages 6 to 7). Kids spell real
school words, their baby hatchling grows into a giant kaiju monster, and the
reward loop of coins, gems, egg crates, daily flames and huge satisfying
monster roars is built to compete with the games that usually win a six year
old's attention.

Built with React Native and Expo (SDK 54), TypeScript, and no network calls at
all: every word, dinosaur, sound and picture ships inside the app, so it works
on a plane, in a car, or on a tablet with no wifi.

## What is in it

**Evolution system**
Every player starts with a cute baby hatchling. Spelling words earns XP, XP
raises the player level, and the level unlocks five evolution stages:

| Stage | Unlocks at | What it looks like |
| --- | --- | --- |
| Baby Hatchling | level 1 | small, round, no armour |
| Teen Dino | level 3 | taller, first back spikes |
| Armoured Apex | level 6 | battle plates and glowing eyes |
| Giant Kaiju Dino | level 10 | dorsal fins with an atomic glow |
| Primal Titan | level 15 | horns, armour, aura and full glow |

Evolution is pure game progression. Any dinosaur the player owns can be equipped
and it grows through the same five stages.

**Lives and hearts**
Each level starts with three hearts. A wrong letter costs one heart. Losing all
three pauses the level with an encouraging, never punishing, try again screen.
Words that were missed come back later in the same session, which is how the
spaced repetition happens.

**Reward loop**
- Coins for every correct letter, with a bonus that grows with the combo.
- Gems for perfect levels and boss trials.
- Mystery egg crates: five kinds, with actual rarity odds, that hatch new
  dinosaurs and little companion buddies. Crate tiers unlock as the player
  collects stars.
- Daily streaks with a flame that changes colour at 3, 7, 14 and 30 days, plus a
  seven day reward cycle.
- Particle effects on every win: confetti, screen shake on huge combos, sparkle
  rings, and monster roars that get louder as the combo climbs.

**Three spelling modes**
- Build the word: drag and drop letter blocks into the boxes (tapping a letter
  works too, which is friendlier for small fingers).
- Missing letter: pick the missing letter from four lookalike choices.
- Listen and spell: the word is read out loud with text to speech and the player
  builds it from what they hear.

**1st grade content: ten units, 293 words**
The curriculum walks up the same ladder a 1st grade teacher does, and every
region opens with a teaching card that names the sound rule, says it out loud,
colours the letters that make the sound and dims the letters that stay quiet.

1. **Sound It Out** - short a, e, i, o and u three sound words (cat, hen, pig, dog, sun).
2. **Two Letters, One Sound** - sh, ch, th, wh and ck (ship, chip, thumb, whale, duck).
3. **Blend Starters** - st, sp, sn, br, cr, dr, tr, fl, gl, pl and sl (stop, crab, flag).
4. **Tricky Letter Teams** - ph says f, plus the quiet letters in kn, wr and mb
   (phone, dolphin, knee, write, lamb), where the silent letter is struck through.
5. **Magic e** - the silent e that makes the vowel say its own name (cake, bike, home).
6. **Vowel Teams** - ai and ay, ee and ea, oo, oa and ow, ou, ow, oi and oy (rain, beach, moon, boy).
7. **Bossy R** - ar and or, then er, ir and ur (car, storm, bird, turn).
8. **Bigger Words** - ing endings, twin letters and compound words (ring, bell, sunset).
9. **Heart Words** - sight words learned by sight, each one carried in a spoken sentence.
10. **Kaiju Summit** - the long dinosaur and monster words (fangs, spikes, titan, monster).

## My Spelling Test

School sends home a list of words. This is the part of EvoABC that teaches that
exact list until it is passed.

1. From the home screen open **Spelling Test**.
2. Press **New list** and paste or type this week's words, separated by spaces,
   commas or new lines. Anything that is not a letter is cleaned up, repeats are
   dropped and up to 30 words are accepted.
3. Press save and the app builds a study plan over those words:
   - **Learn**: the word is shown with its sound pattern highlighted, the voice
     says the word and spells it out loud, and the child builds it with letter tiles.
   - **Practice**: the word hides. Only the voice is left, and the child spells
     what they heard from memory. The dictation says the word, then each of its
     sounds with a real word that proves it, then the word twice, because that is
     the phase where the word is still being learnt.
   - **Spelling test**: real dictation. The word is spoken and never shown, one
     try per word, and extra decoy letters are mixed into the tiles. It is said
     three times, the last pass a little slower, and it never reads out a letter
     or a sound.

A miss of a word the child only *heard* is answered with the ending of that word:
"Nap. It ends with puh, as in pig." The quietest sound a phone speaker has to
reproduce is the p, t or k at the end of a word, so a child who spells exactly
what they heard should be told what the ending was rather than only told no.
4. Anything missed is taught again in a new round that covers only those words,
   and the rounds keep coming until the whole list is passed. Passing pays 250
   coins, 6 gems and 140 XP, so a school test also grows the dinosaur.
5. Come back any day and choose **Study all words** or **Only the ones I missed**.
   Every word keeps its own right and wrong count, so the parent report in
   Settings shows exactly which words still need work.

Every word is heard through the voice built into the device, which is why the
spelling sounds like a person rather than a computer. A grown up can pick the
voice and its dictation speed in **Settings > Parent zone > Spelling voice**,
which also says plainly whether the voice in use is one of the clear ones or one
of the muddy voices that come with the phone, and prints the pace a child will
actually hear as a percentage. Downloading an Enhanced or Premium voice in the
device settings (Accessibility > Spoken Content > Voices) gives the very clearest
one, and the app switches to it on its own.

A word is read at a speaking pace, not dragged out. Past about three quarters of
normal speed a synthesiser stops being clearer and starts stretching every vowel
and evening out its melody, which is what a machine voice sounds like; the word
is separated from the next one by most of a second of silence instead, because
silence costs a word nothing. That gap is why "nap" and the word after it never
arrive as one sound.

## Project layout

```
App.tsx                     providers, fonts, splash, screen registry
index.ts                    Expo entry point
app.json                    app config: name, icons, splash, iOS bundle id
src/
  art/                      parametric vector dinosaurs, icons and particle effects
  art/CueIcon.tsx           draws a picture cue: a vector icon on a soft colour plate
  art/cues/                 every picture cue, one catalog per teaching unit
  audio/sfx.ts              sound manager built on expo-audio
  components/               buttons, cards, HUD, letter tiles, drag and drop board
  data/                     word bank, evolution stages, skins, crates, levels
  data/units/               the ten teaching units, one word bank per unit
  game/                     pure rules: economy, session, testplan, phonics, loot, streak
  lib/tts.ts                the voice: queues utterances, speaks lines and words
  lib/speechProfile.ts      pure: the pace band, the word pace and the voice ranking, all checked
  lib/                      storage and touch feedback
  navigation/Navigator.tsx  lightweight animated navigator
  screens/                  onboarding, home, map, play, result, eggs, collection, streak, settings, test, testSession
  state/GameContext.tsx     the single source of truth for save data and sessions
scripts/
  generate-assets.js        draws the icon, adaptive icon and splash art
  generate-audio.js         synthesizes every sound effect as a WAV
  check-audio.js            measures the WAVs for clipping, clicks and buzz
  list-icons.js             writes icon-names.txt, every icon name a cue may use
  audit.js                  fails the build if an emoji or a long dash sneaks back in
  selfcheck.ts              asserts the economy, session, phonics, cues and study plan rules
.github/workflows/
  ci.yml                    typecheck, self check and bundle on every push
  build-ios.yml             builds the ipa on a macOS runner
```

## Scripts

```bash
npm install          # install dependencies
npm start            # start the Expo dev server (scan the QR with Expo Go)
npm run ios          # start and open the iOS simulator (macOS only)
npm run assets       # regenerate icons, splash and all sound effects
npm run audio:check  # measure every WAV: clipping, level, clicks, harshness
npm run icons:list   # rewrite scripts/icon-names.txt from the icon packs
npm run audit        # no emoji and no long dashes anywhere in the app
npm run typecheck    # TypeScript, no emit
npm run selfcheck    # assert the game rules (XP curve, lives, stars, loot, cues)
npm run bundle       # export the production iOS JavaScript bundle to dist/
```

The generated art and audio live in `assets/`. Both generators are plain Node
scripts with no dependencies, so `npm run assets` works on a fresh clone before
anything else is installed.

## Running it locally

1. `npm install`
2. `npm start`
3. Install Expo Go on an iPhone or iPad, then scan the QR code. Press `i` to open
   the iOS simulator instead if you are on a Mac.

Progress is stored on the device with AsyncStorage, so each device keeps its own
save. The parent zone in Settings can reset it.

## Build an ipa from Windows

The repository ships a GitHub Actions workflow that compiles the ipa on GitHub's
own macOS runners. You never need a Mac, Xcode or a Terminal on your own
machine.

1. The project already lives in a public repository,
   `https://github.com/PrismDev3/EvoABC`, so this step is done. Your own fork
   or copy works exactly the same way.
2. Open the **Actions** tab. The **Build iOS IPA** workflow runs automatically on
   every push to `main`. You can also run it by hand with **Run workflow**.
3. Wait for the run to finish (usually 15 to 25 minutes the first time, then
   faster once the caches are warm).
4. Open the finished run and download the **EvoABC-ipa** artifact from the
   **Artifacts** section at the bottom of the run summary. GitHub gives you a
   zip file.
5. Extract the zip. Inside is `EvoABC.ipa`.
6. Install it on a real iPhone or iPad with **Sideloadly** (Windows) or
   **AltStore**:
   - Install Sideloadly from `sideloadly.io` and the Apple device support
     drivers from `apple.com` if iTunes is not installed already.
   - Connect the iPhone with a USB cable and trust the computer on the phone.
   - Drag `EvoABC.ipa` into Sideloadly, enter your Apple ID, and press Start.
     Sideloadly re-signs the app with your own Apple ID, which is why the CI
     build can be unsigned.
   - When it finishes, the app appears on the home screen.
7. Trust the developer certificate once on the phone: **Settings > General > VPN
   and Device Management > Developer App > your Apple ID > Trust**. The app then
   opens normally.
8. Free Apple IDs expire the signature after seven days. Just sideload the same
   file again to renew it (your saved progress stays on the device).

A tag push such as `git tag v1.0.0 && git push origin v1.0.0` also attaches the
same `EvoABC.ipa` to the GitHub **Releases** page, which is the easiest link to
share with another parent.

The newest ipa is at
`https://github.com/PrismDev3/EvoABC/releases/latest/download/EvoABC.ipa`. That
link needs **no GitHub account**, unlike the artifacts inside a workflow run,
which GitHub only hands to signed-in users. Send the release link to another
parent and they can download the file straight from a browser.

### Optional: a signed build with EAS

The unsigned ipa above is every bit as playable, it just needs re-signing on the
way in. If you want a build that installs without Sideloadly, or you want it on
TestFlight, use EAS:

1. Create a free account at `expo.dev` and run `npx eas-cli login` once locally.
2. Add the token as a repository secret named `EXPO_TOKEN`
   (`npx eas-cli token:create` prints one).
3. Run the **Build iOS IPA** workflow manually. Its second job then starts a
   signed EAS production build; without the secret that job politely does
   nothing.

## A note for parents

- Every level is short: five words, three hearts, a couple of minutes.
- Wrong answers never block progress forever. After three tries a level opens the
  next one anyway, and missed words come back for another attempt.
- Play is rewarded, not time. Coins and gems come from correct spelling, so
  leaving the app running earns nothing.
- The parent zone in Settings sits behind a small multiplication question and
  shows words practiced, accuracy per sound group, the words that need the most
  practice, and the reset button.

## Pictures and sound

**Pictures are vector icons, never emoji.** Every word, region and unit has a cue
key such as `bee`, and `src/art/cues` maps that key to a real glyph from the two
icon packs the app bundles (`scripts/icon-names.txt` lists every allowed name).
`CueIcon` draws it on a soft colour plate, so the picture is sharp at any size,
recolours with the card it sits on and looks identical on every phone.
`npm run selfcheck` fails if a cue points at a name that does not exist, if a word
has no picture, or if an emoji has crept back into the curriculum.

**Sounds are synthesized, then measured.** `npm run assets` rebuilds them from
band limited harmonic voices on the C major pentatonic scale with a soft limiter,
so nothing is buzzy, out of tune or clipped. `npm run audio:check` decodes every
file and fails on clipping, a DC offset, an edge click, a jump between samples or
a top end that reads as fizz.

`audio:check` also prints a **ring** figure: how long a sound stays within 20 dB
of its own peak. That single number is what separates a tap from a beep, and the
button press is held to it, along with its own level band. The band was not
invented: a commercial UI sound pack was measured through the same script, and
its press peaks at -7.9 dB, carries an RMS of -31 dB, and is over in about 20 ms.
There are three near identical presses and the app picks one at random for each
tap, so a row of six letter tiles does not sound like a machine gun.

**The voice is paced in one unit the whole app shares.** A speed of 1 means the
pace the system itself calls normal speech, and every other speed is a fraction
of it, so the settings screen is honest about what a child will hear
(`src/lib/speechProfile.ts`). `expo-speech` scales that number again inside its
iOS layer, which is why the conversion is written down once, next to the check
that proves it. Words can be said slowly, sounded out chunk by chunk (`d, aw, l,
f, ih, n` then `dolphin`), or spelled with letter names (`see, ay and tee`), and
a queue makes sure only one voice is ever talking.

**A word has a pace band, and silence does the slowing down.** Dragging a
synthesiser out to 72% of normal, which is where this app started, does not make
a word easier to follow: it stretches the vowels, flattens the melody and softens
the bursts that separate one consonant from the next. That is the difference
between a person and a machine reading a list. So a dictated word is held inside
78% to 100% of normal speech (`dictatedPace`), a longer word earns a little more
room, and each repeat is separated by a gap of most of a second, sized by the
word (`wordGapMs`). The last pass, the one a child copies, is the slowest one in
the band. The same three rules decide the sentences too: pitch is the voice's
own, never lifted to sound friendly, and the engine is handed the language of the
voice that was picked, so a British or Australian voice reads with its own
phonetics instead of being pushed through US English.

At the starting pace the word NAP now measures: said at 90%, its sounds at 87%
with 300 ms between them, said again at 86% after 680 ms of silence, and copied
at 81%. `npm run selfcheck` asserts that shape for all 288 curriculum words, and
that no word can ever be dictated outside the band, whatever pace a saved file
holds. A save from an older build is snapped onto one of the three paces the
settings screen offers instead of being obeyed.

## Tech notes

- Expo SDK 54, React Native 0.81, React 19, TypeScript strict mode.
- `expo-audio` for effects and the background loop, with the iOS silent switch
  ignored on purpose so the rewards are audible.
- `expo-speech` reads words and sentences out loud. It uses the device voice, so
  it works offline.
- `@expo/vector-icons` supplies the two icon packs behind every picture cue.
- `react-native-svg` draws every dinosaur from data: a body plan plus a palette
  plus trait flags. Adding a new dinosaur is one entry in `src/data/dinosaurs.ts`.
- Icons are drawn from numbers rather than traced by hand where the shape allows
  it. The settings cog generates eight teeth on a real circle and cuts its centre
  out with the even odd fill rule, so it has a genuine hole on any background
  instead of a white disc that only looked like one on white.
- The layout is portrait, capped at 640 points wide and centred, so an iPad shows
  a comfortable column instead of stretched phone UI.
