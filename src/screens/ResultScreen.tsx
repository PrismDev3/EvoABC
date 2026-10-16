import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useGame } from '../state/GameContext';
import { useNav } from '../navigation/Navigator';
import { getRegion, levelAfter } from '../data/levels';
import { STAGES } from '../data/dinosaurs';
import { crateById } from '../data/crates';
import { encouragement } from '../game/session';
import { colors, fonts, gradients, radii, spacing, type } from '../theme';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { Badge, InfoRow, Panel, StatPill } from '../components/Cards';
import { ChunkyButton } from '../components/Button';
import { GameModal } from '../components/GameModal';
import { Confetti, EvolveBurst, PopIn } from '../art/Effects';
import { CoinIcon, CrownIcon, EggIcon, FlameIcon, GemIcon, StarIcon } from '../art/Icons';
import { Dino } from '../art/Dino';
import { playRoar } from '../audio/sfx';

/**
 * The payoff screen. Stars land one by one, the loot rains down and a big
 * evolution reveal takes over the screen the moment a dino grows up.
 */

const WIN_GRADIENT = ['#FFE9A8', '#FFF6E0', '#EAF9FF'] as const;

export default function ResultScreen() {
  const nav = useNav();
  const { lastSummary, equippedSkin, stageIndex, stage } = useGame();
  const summary = lastSummary;
  const [showEvolve, setShowEvolve] = useState(false);

  useEffect(() => {
    if (summary === null) nav.reset('home');
  }, [nav, summary]);

  useEffect(() => {
    if (summary !== null && summary.evolved) setShowEvolve(true);
  }, [summary]);

  useEffect(() => {
    if (showEvolve) playRoar();
  }, [showEvolve]);

  if (summary === null) {
    return (
      <ScreenScaffold>
        <View style={styles.emptyState}>
          <Text style={type.body}>Packing up the trophy box.</Text>
        </View>
      </ScreenScaffold>
    );
  }

  const won = summary.won;
  const region = getRegion(summary.regionId);
  const next = levelAfter(summary.levelId);
  const totalWords = summary.correct + summary.mistakes;
  const accuracy = totalWords === 0 ? 0 : Math.round((summary.correct / totalWords) * 100);
  const nextStage = STAGES[stageIndex + 1] ?? null;
  const unlockedEgg = summary.unlockedCrate === null ? null : crateById(summary.unlockedCrate);

  return (
    <ScreenScaffold scroll gradient={won ? WIN_GRADIENT : gradients.sky}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Confetti run={won} count={52} travel={720} />
      </View>

      <View style={styles.topSpace} />

      <Panel style={styles.heroCard} borderColor={won ? colors.amber : colors.cardLine}>
        <Badge
          label={won ? 'Level complete' : 'Great try'}
          color={won ? colors.jungle : colors.grape}
          icon={<CrownIcon size={14} color="#FFFFFF" />}
        />
        <Text style={[type.hero, styles.heroTitle]}>{summary.title}</Text>
        <Text style={[type.body, styles.center]}>{`${region.name} - ${region.blurb}`}</Text>

        <View style={styles.starRow}>
          {[0, 1, 2].map((slot) => (
            <PopIn key={`result-star-${slot}`} delay={220 + slot * 200} from={0.2}>
              <View style={[styles.starSlot, slot < summary.stars ? undefined : styles.starDim]}>
                <StarIcon size={58} color={slot < summary.stars ? colors.amber : colors.locked} />
              </View>
            </PopIn>
          ))}
        </View>

        <Text style={[type.bodyBold, styles.center]}>
          {won
            ? `You spelled ${summary.correct} words and your dino is stronger for it.`
            : encouragement(summary.mistakes)}
        </Text>
        {!won ? <Text style={[type.small, styles.center]}>Your three hearts will be back for the next run.</Text> : null}
      </Panel>

      <Panel style={styles.statsCard}>
        <View style={styles.statsRow}>
          <StatPill icon={<CoinIcon size={22} />} value={summary.coins} label="coins" />
          <StatPill icon={<GemIcon size={22} />} value={summary.gems} label="gems" />
          <StatPill icon={<StarIcon size={22} />} value={summary.xp} label="xp" />
          <StatPill icon={<FlameIcon size={22} />} value={`x${summary.bestCombo}`} label="combo" />
        </View>
        <View style={styles.infoBlock}>
          <InfoRow label="Words spelled right" value={`${summary.correct} of ${totalWords}`} />
          <InfoRow label="Accuracy" value={`${accuracy}%`} tint={accuracy >= 80 ? colors.success : colors.inkSoft} />
          <InfoRow label="Stars in total" value={`${summary.totalStars}`} tint={colors.amberDark} />
          {nextStage !== null ? (
            <InfoRow label="Next evolution" value={`${nextStage.name} at level ${nextStage.minLevel}`} />
          ) : (
            <InfoRow label="Evolution" value="Primal Titan reached" tint={colors.grapeDark} />
          )}
        </View>
      </Panel>

      {summary.leveledUp ? (
        <PopIn style={styles.levelPop}>
          <View style={styles.levelPill}>
            <CrownIcon size={22} />
            <Text style={styles.levelText}>{`Level ${summary.newLevel}!`}</Text>
          </View>
        </PopIn>
      ) : null}

      {unlockedEgg !== null ? (
        <Panel style={styles.eggCard} borderColor={unlockedEgg.gradient[1]}>
          <View style={styles.eggRow}>
            <EggIcon size={44} color={unlockedEgg.gradient[0]} spot={unlockedEgg.gradient[1]} />
            <View style={styles.eggText}>
              <Text style={type.label}>NEW IN THE HATCHERY</Text>
              <Text style={type.h3}>{unlockedEgg.name}</Text>
              <Text style={type.small}>{unlockedEgg.blurb}</Text>
            </View>
          </View>
          <ChunkyButton label="Open the hatchery" tone="grape" size="md" onPress={() => nav.push('eggs')} />
        </Panel>
      ) : null}

      <View style={styles.actions}>
        {next !== null ? (
          <ChunkyButton
            label={`Next: ${next.title}`}
            tone="jungle"
            icon={<StarIcon size={20} color="#083A22" />}
            onPress={() => nav.replace('play', { levelId: next.id })}
          />
        ) : (
          <Panel style={styles.finishedCard}>
            <Text style={[type.h3, styles.center]}>You reached the end of the trail. Replay any level for more stars.</Text>
          </Panel>
        )}
        <ChunkyButton label={won ? 'Play it again' : 'Try again'} tone={won ? 'bone' : 'lava'} size="md" onPress={() => nav.replace('play', { levelId: summary.levelId })} />
        <ChunkyButton label="Adventure map" tone="bone" size="md" onPress={() => nav.reset('map')} />
        <ChunkyButton label="Back home" tone="bone" size="md" onPress={() => nav.reset('home')} />
      </View>

      <GameModal
        visible={showEvolve}
        badge="EVOLUTION"
        title={`${summary.stageName}!`}
        message={`Your dino grew into a ${summary.stageName}. ${stage.tagline}. Keep spelling and it will grow even bigger.`}
        gradient={gradients.grape}
        confetti
        mascot={
          <View style={styles.evolveStage}>
            <EvolveBurst run={showEvolve} tint={equippedSkin.colors.glow} />
            <PopIn from={0.3}>
              <Dino skin={equippedSkin} stageIndex={stageIndex} size={176} />
            </PopIn>
          </View>
        }
        actions={[{ label: 'ROAR', tone: 'grape', onPress: () => setShowEvolve(false) }]}
        onDismiss={() => setShowEvolve(false)}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  topSpace: { height: spacing.md },
  heroCard: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  heroTitle: { textAlign: 'center' },
  center: { textAlign: 'center' },
  starRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  starSlot: { padding: 2 },
  starDim: { opacity: 0.55 },
  statsCard: { gap: spacing.md, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  infoBlock: { gap: spacing.xs },
  levelPop: { alignItems: 'center', marginBottom: spacing.lg },
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.amber },
  levelText: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink },
  eggCard: { gap: spacing.md, marginBottom: spacing.lg },
  eggRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  eggText: { flex: 1 },
  actions: { gap: spacing.sm, paddingBottom: spacing.xl },
  finishedCard: { alignItems: 'center' },
  evolveStage: { alignItems: 'center', justifyContent: 'center', width: 190, height: 190 },
});
