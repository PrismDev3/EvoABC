import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, shadow, spacing, type } from '../theme';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { ChunkyButton, PillButton } from '../components/Button';
import { Panel } from '../components/Cards';
import { Bobbing, Confetti, PopIn } from '../art/Effects';
import { Dino } from '../art/Dino';
import { CheckIcon, StarIcon } from '../art/Icons';
import { STARTER_SKIN_IDS, skinById } from '../data/dinosaurs';
import { useGame } from '../state/GameContext';
import { useNav } from '../navigation/Navigator';
import { haptic } from '../lib/feedback';
import { playRoar, playSfx } from '../audio/sfx';

/**
 * Three quick promises for the grown up, then the best part for the kid:
 * picking the very first dinosaur out of the egg.
 */

interface Page {
  key: string;
  title: string;
  body: string;
  stage: number;
  tint: string;
}

const PAGES: Page[] = [
  {
    key: 'evolve',
    title: 'Spell Words, Grow a Beast',
    body: 'Every word you build earns XP. Your tiny hatchling grows into an armoured kaiju with glowing fins.',
    stage: 0,
    tint: '#DFFFF0',
  },
  {
    key: 'offline',
    title: 'Play Anywhere, Even Offline',
    body: 'Every word and every roar is already inside the app. No internet needed in the car or on the plane.',
    stage: 2,
    tint: '#E6F4FF',
  },
  {
    key: 'collect',
    title: 'Collect Eggs and Keep the Flame',
    body: 'Win stars, hatch mystery eggs and feed the daily flame to unlock the rarest monsters of all.',
    stage: 3,
    tint: '#F1EBFF',
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useGame();
  const nav = useNav();
  const [page, setPage] = useState(0);
  const [starter, setStarter] = useState<string>(STARTER_SKIN_IDS[0] ?? 'rex_verdant');

  const starters = useMemo(() => STARTER_SKIN_IDS.map(skinById), []);
  const pickerPage = page >= PAGES.length;
  const current = PAGES[Math.min(page, PAGES.length - 1)] ?? PAGES[0];
  const heroSkin = pickerPage ? skinById(starter) : skinById(STARTER_SKIN_IDS[0] ?? 'rex_verdant');

  const next = () => {
    if (pickerPage) return;
    const target = page + 1;
    setPage(target);
    if (target === PAGES.length) playSfx('hatch');
    else playSfx('whoosh');
  };

  const skip = () => {
    setPage(PAGES.length);
    playSfx('whoosh');
  };

  const start = () => {
    completeOnboarding(starter);
    playSfx('evolve');
    playRoar();
    nav.reset('home');
  };

  return (
    <ScreenScaffold scroll={false}>
      <View style={styles.root}>
        <View style={styles.topRow}>
          {!pickerPage ? (
            <PillButton label="Skip" onPress={skip} tone="bone" />
          ) : (
            <View style={styles.stepPill}>
              <Text style={styles.stepText}>Step 4 of 4</Text>
            </View>
          )}
        </View>

        {pickerPage ? (
          <View style={styles.pickerWrap}>
            <PopIn>
              <Text style={[type.hero, styles.center]}>Pick Your First Dino</Text>
              <Text style={[type.body, styles.center, styles.lead]}>
                This is the friend you spell with. You can hatch more dinosaurs later.
              </Text>
            </PopIn>
            <Bobbing amount={8}>
              <Dino skin={heroSkin} stageIndex={0} size={150} />
            </Bobbing>
            <View style={styles.starterGrid}>
              {starters.map((skin) => {
                const selected = skin.id === starter;
                return (
                  <Panel
                    key={skin.id}
                    tone={selected ? 'card' : 'glass'}
                    padded={false}
                    borderColor={selected ? colors.amber : colors.cardLine}
                    onPress={() => {
                      setStarter(skin.id);
                      playSfx('tap');
                      haptic('select');
                    }}
                    accessibilityLabel={`Choose ${skin.name}`}
                    style={selected ? { ...styles.starterCard, ...styles.starterCardOn } : styles.starterCard}
                  >
                    <View style={styles.starterInner}>
                      <Dino skin={skin} stageIndex={0} size={86} aura={false} />
                      <Text style={styles.starterName} numberOfLines={1}>
                        {skin.name}
                      </Text>
                      <Text style={styles.starterSpecies} numberOfLines={1}>
                        {skin.species}
                      </Text>
                      {selected ? (
                        <View style={styles.checkDot}>
                          <CheckIcon size={16} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>
                  </Panel>
                );
              })}
            </View>
            <View style={styles.footer}>
              <ChunkyButton label="Start Spelling" tone="lava" icon={<StarIcon size={22} />} onPress={start} />
            </View>
          </View>
        ) : (
          <View style={styles.pageWrap}>
            <PopIn key={current.key} from={0.75}>
              <View style={[styles.heroCard, { backgroundColor: current.tint }]}>
                <Bobbing amount={10}>
                  <Dino skin={heroSkin} stageIndex={current.stage} size={182} />
                </Bobbing>
              </View>
            </PopIn>
            <View style={styles.copy}>
              <Text style={[type.hero, styles.center]}>{current.title}</Text>
              <Text style={[type.body, styles.center, styles.lead]}>{current.body}</Text>
            </View>
            <View style={styles.footer}>
              <View style={styles.dots}>
                {PAGES.map((item, index) => (
                  <View key={item.key} style={[styles.dot, index === page ? styles.dotOn : null]} />
                ))}
              </View>
              <ChunkyButton
                label={page === PAGES.length - 1 ? 'Almost There' : 'Next'}
                tone={page === PAGES.length - 1 ? 'amber' : 'lava'}
                onPress={next}
              />
            </View>
          </View>
        )}
      </View>
      <Confetti run={pickerPage} count={30} travel={520} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: spacing.sm },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: 42, alignItems: 'center' },
  stepPill: { backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill },
  stepText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
  pageWrap: { flex: 1, justifyContent: 'space-between' },
  heroCard: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1,
    borderRadius: radii.xl,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    marginTop: spacing.md,
    ...shadow(2),
  },
  copy: { paddingHorizontal: spacing.md, gap: spacing.sm },
  center: { textAlign: 'center' },
  lead: { paddingHorizontal: spacing.sm },
  footer: { gap: spacing.md, paddingBottom: spacing.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(23,38,61,0.18)' },
  dotOn: { backgroundColor: colors.lava, width: 26 },
  pickerWrap: { flex: 1, justifyContent: 'space-between', gap: spacing.sm },
  starterGrid: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  starterCard: { flex: 1, maxWidth: 150 },
  starterCardOn: { borderWidth: 3 },
  starterInner: { alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  starterName: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  starterSpecies: { ...type.small, textAlign: 'center' },
  checkDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
