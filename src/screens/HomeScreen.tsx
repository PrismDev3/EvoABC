import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, radii, shadow, spacing, type } from '../theme';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { ChunkyButton, IconButton } from '../components/Button';
import { Badge, Panel, ProgressBar } from '../components/Cards';
import { Hud } from '../components/Hud';
import { GameModal } from '../components/GameModal';
import { Bobbing, Confetti, PopIn } from '../art/Effects';
import { Dino } from '../art/Dino';
import { CoinIcon, EggIcon, FlameIcon, GearsIcon, GemIcon, MapIcon, PawIcon, PlayIcon, StarIcon, TrophyIcon } from '../art/Icons';
import { STAGES } from '../data/dinosaurs';
import { getRegion } from '../data/levels';
import { xpForLevel } from '../game/economy';
import { wordsToReview } from '../game/testplan';
import { useGame } from '../state/GameContext';
import { useNav } from '../navigation/Navigator';
import { haptic, speak } from '../lib/feedback';
import { playRoar } from '../audio/sfx';

/**
 * Home base: the dinosaur you are growing, the words waiting for you and the
 * daily flame that keeps players coming back tomorrow.
 */

const STAGE_TINTS = ['#E7FFF2', '#E7F4FF', '#F1EBFF', '#FFF1E2', '#FFF8D9'];

type DailyPhase = 'preview' | 'claimed' | 'closed';

export default function HomeScreen() {
  const {
    profile,
    stage,
    stageIndex,
    equippedSkin,
    activeCompanion,
    nextLevel,
    canClaimDaily,
    dailyPreview,
    claimDaily,
  } = useGame();
  const nav = useNav();
  const [dailyPhase, setDailyPhase] = useState<DailyPhase>(() => (canClaimDaily ? 'preview' : 'closed'));
  const [claimed, setClaimed] = useState<{ label: string; bonus: number; streakCount: number } | null>(null);

  const region = useMemo(() => getRegion(nextLevel.regionId), [nextLevel.regionId]);
  const nextStage = STAGES[Math.min(stageIndex + 1, STAGES.length - 1)];
  const atFinalStage = stageIndex >= STAGES.length - 1;
  const levelsToEvolve = nextStage !== undefined ? Math.max(0, nextStage.minLevel - profile.level) : 0;
  const storedEggs = useMemo(() => Object.values(profile.eggs).reduce((sum, count) => sum + count, 0), [profile.eggs]);

  // School word lists: how many are saved and how many words still need mastering.
  const savedLists = profile.customLists ?? [];
  const testOpenLists = savedLists.filter((list) => !list.passed).length;
  const testRemaining = savedLists.reduce(
    (sum, list) => sum + (list.passed ? 0 : wordsToReview(list.results, list.words).length),
    0,
  );

  const greetDino = () => {
    haptic('medium');
    speak(`${equippedSkin.name}. ${stage.name}`, { pitch: 1.05 });
    playRoar();
  };

  const handleClaim = () => {
    const result = claimDaily();
    if (result === null) {
      setDailyPhase('closed');
      return;
    }
    setClaimed({ label: result.reward.label, bonus: result.bonus, streakCount: result.streakCount });
    setDailyPhase('claimed');
  };

  return (
    <ScreenScaffold scroll>
      <Hud
        showStars
        rightSlot={
          <IconButton
            icon={<GearsIcon size={22} color={colors.inkSoft} />}
            onPress={() => nav.push('settings')}
            tint={colors.card}
            accessibilityLabel="Settings"
          />
        }
      />

      <PopIn>
        <Panel tone="card" padded={false} borderColor="rgba(255,255,255,0.9)" style={styles.mascotCard}>
          <LinearGradient
            colors={[STAGE_TINTS[Math.min(stageIndex, STAGE_TINTS.length - 1)] ?? '#E7FFF2', '#FFFFFF']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.mascotGradient}
          >
            <View style={styles.mascotRow}>
              <Pressable onPress={greetDino} accessibilityRole="button" accessibilityLabel={`Say hello to ${equippedSkin.name}`}>
                <View style={styles.mascotStage}>
                  <Bobbing amount={9}>
                    <Dino skin={equippedSkin} stageIndex={stageIndex} size={168} />
                  </Bobbing>
                  {activeCompanion !== null ? (
                    <View style={styles.companion}>
                      <Bobbing amount={5} duration={1300}>
                        <Dino skin={activeCompanion} stageIndex={Math.min(2, stageIndex)} size={72} />
                      </Bobbing>
                    </View>
                  ) : null}
                </View>
              </Pressable>
              <View style={styles.mascotInfo}>
                <Badge label={stage.name} color={colors.grape} icon={<StarIcon size={13} />} />
                <Text style={styles.dinoName} numberOfLines={1}>
                  {equippedSkin.name}
                </Text>
                <Text style={styles.dinoTagline} numberOfLines={2}>
                  {stage.tagline}
                </Text>
                <View style={styles.levelRow}>
                  <Text style={styles.levelText}>{`Level ${profile.level}`}</Text>
                  <Text style={styles.xpText}>{`${profile.xp} / ${xpForLevel(profile.level)} XP`}</Text>
                </View>
                <ProgressBar value={profile.xp} max={xpForLevel(profile.level)} gradient={['#FFE07A', '#FFC531']} height={14} />
                <Text style={styles.evolveHint} numberOfLines={2}>
                  {atFinalStage
                    ? 'Final form reached. Keep spelling to stay a legend.'
                    : `Level ${nextStage?.minLevel ?? profile.level} unlocks ${nextStage?.name ?? 'the next form'} (${levelsToEvolve} to go)`}
                </Text>
              </View>
            </View>
            <View style={styles.pipsRow}>
              {STAGES.map((item, index) => (
                <View key={item.id} style={styles.pipWrap}>
                  <View style={[styles.pip, index <= stageIndex ? styles.pipOn : null, index === stageIndex ? styles.pipNow : null]} />
                </View>
              ))}
            </View>
            <Text style={styles.tapHint}>Tap your dino to hear it roar</Text>
          </LinearGradient>
        </Panel>
      </PopIn>

      <View style={styles.playBlock}>
        <ChunkyButton label="PLAY" tone="lava" size="lg" icon={<PlayIcon size={26} />} onPress={() => nav.push('play', { levelId: nextLevel.id })} />
        <Text style={styles.nextLine} numberOfLines={1}>
          {`Next: ${region.emoji} ${region.name} ${nextLevel.title}`}
        </Text>
        <ChunkyButton label="Choose a Level" tone="bone" size="md" icon={<MapIcon size={20} color={colors.ink} />} onPress={() => nav.push('map')} />
      </View>

      <View style={styles.tileRow}>
        <HomeTile label="Levels" icon={<MapIcon size={26} />} tint={colors.cardAlt} onPress={() => nav.push('map')} />
        <HomeTile
          label="Hatchery"
          icon={<EggIcon size={26} />}
          tint="#FFF7E2"
          badge={storedEggs > 0 ? storedEggs : undefined}
          onPress={() => nav.push('eggs')}
        />
        <HomeTile label="Dinos" icon={<PawIcon size={26} />} tint="#F1EBFF" onPress={() => nav.push('collection')} />
      </View>

      <View style={styles.tileRowTight}>
        <HomeTile
          label="Daily"
          icon={<FlameIcon size={26} color={canClaimDaily ? colors.lava : colors.inkFaint} />}
          tint="#FFEDE6"
          badge={canClaimDaily ? '!' : undefined}
          onPress={() => (canClaimDaily ? setDailyPhase('preview') : nav.push('streak'))}
        />
        <HomeTile
          label="Spelling Test"
          icon={<TrophyIcon size={26} color={testRemaining > 0 ? colors.grape : colors.inkFaint} />}
          tint="#EFEBFF"
          badge={testOpenLists > 0 ? testOpenLists : undefined}
          onPress={() => nav.push('test')}
        />
      </View>

      {testRemaining > 0 ? (
        <Text style={styles.testNudge}>
          {`${testRemaining} spelling test word${testRemaining === 1 ? '' : 's'} still to master`}
        </Text>
      ) : null}

      <View style={styles.summaryRow}>
        <SummaryChip icon={<CoinIcon size={18} />} value={profile.coins} label="coins" />
        <SummaryChip icon={<GemIcon size={18} />} value={profile.gems} label="gems" />
        <SummaryChip icon={<StarIcon size={18} />} value={profile.stars} label="stars" />
      </View>

      <GameModal
        visible={dailyPhase === 'preview'}
        badge={`Day ${dailyPreview.day}`}
        title="Your Daily Reward"
        message={`Come back every day to keep the flame alive. Today you get ${dailyPreview.label.toLowerCase()}.`}
        gradient={['#FFF6E5', '#FFE3A8', '#FFC531']}
        mascot={<Dino skin={equippedSkin} stageIndex={stageIndex} size={120} />}
        confetti
        dismissible={false}
        actions={[
          { label: 'Claim It', tone: 'amber', onPress: handleClaim },
          { label: 'Later', tone: 'bone', onPress: () => setDailyPhase('closed') },
        ]}
      />

      <GameModal
        visible={dailyPhase === 'claimed'}
        badge={`Streak ${claimed?.streakCount ?? profile.streak.count} days`}
        title="Reward Claimed"
        message={
          claimed !== null && claimed.bonus > 0
            ? `${claimed.label} is yours, plus a ${claimed.bonus} coin streak bonus.`
            : `${claimed?.label ?? 'Your reward'} is yours. See you tomorrow.`
        }
        gradient={['#E7FFF2', '#C9F7DF', '#7BE495']}
        mascot={<Dino skin={equippedSkin} stageIndex={stageIndex} size={120} />}
        confetti
        onDismiss={() => setDailyPhase('closed')}
        actions={[
          { label: 'Nice', tone: 'jungle', onPress: () => setDailyPhase('closed') },
          { label: 'See the Flame', tone: 'bone', onPress: () => { setDailyPhase('closed'); nav.push('streak'); } },
        ]}
      />
      <Confetti run={dailyPhase === 'claimed'} count={34} travel={560} />
    </ScreenScaffold>
  );
}

function HomeTile({
  label,
  icon,
  tint,
  badge,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  tint: string;
  badge?: number | string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tilePress, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      <View style={[styles.tile, { backgroundColor: tint }]}>
        {icon}
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
        {badge !== undefined ? (
          <View style={styles.tileBadge}>
            <Text style={styles.tileBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function SummaryChip({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <View style={styles.summaryChip}>
      {icon}
      <View>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mascotCard: { marginTop: spacing.xs, overflow: 'hidden' },
  mascotGradient: { padding: spacing.lg, borderRadius: radii.lg },
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mascotStage: { alignItems: 'center', justifyContent: 'flex-end' },
  companion: { position: 'absolute', right: -6, bottom: -4 },
  mascotInfo: { flex: 1, gap: 6 },
  dinoName: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginTop: 4 },
  dinoTagline: { ...type.small },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  levelText: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.ink },
  xpText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  evolveHint: { ...type.small, marginTop: 2 },
  pipsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md, gap: 6 },
  pipWrap: { alignItems: 'center' },
  pip: { width: 26, height: 8, borderRadius: 4, backgroundColor: 'rgba(23,38,61,0.14)' },
  pipOn: { backgroundColor: colors.amber },
  pipNow: { backgroundColor: colors.lava, height: 12, borderRadius: 6 },
  tapHint: { ...type.small, textAlign: 'center', marginTop: spacing.sm },
  playBlock: { marginTop: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  nextLine: { ...type.bodyBold, textAlign: 'center' },
  tileRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  tileRowTight: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  testNudge: { ...type.bodyBold, color: colors.grapeDark, textAlign: 'center', marginTop: spacing.sm },
  tilePress: { flex: 1 },
  tile: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: radii.lg, borderWidth: 2, borderColor: colors.cardLine, gap: 4, ...shadow(1) },
  tileLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
  tileBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: colors.lava,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBadgeText: { fontFamily: fonts.bodyBlack, fontSize: 12, color: '#FFFFFF' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.lg },
  summaryChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: radii.lg, borderWidth: 2, borderColor: colors.cardLine, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  summaryValue: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  summaryLabel: { ...type.small, fontSize: 11 },
});
