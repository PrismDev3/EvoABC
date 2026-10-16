import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients, radii, shadow, spacing, type } from '../theme';
import { ScreenHeader, ScreenScaffold } from '../components/ScreenScaffold';
import { ChunkyButton, CounterChip } from '../components/Button';
import { Divider, InfoRow, Panel } from '../components/Cards';
import { GameModal } from '../components/GameModal';
import { Bobbing, PopIn } from '../art/Effects';
import { CheckIcon, CoinIcon, EggIcon, FlameIcon, GemIcon, StarIcon, TrophyIcon } from '../art/Icons';
import { Dino } from '../art/Dino';
import { useGame, DailyClaim } from '../state/GameContext';
import { useNav } from '../navigation/Navigator';
import { DAILY_REWARDS, STREAK_MILESTONES, crateById } from '../data/crates';
import { FLAME_COLORS, streakFlameTier } from '../game/streak';
import { DailyReward } from '../types';

/** Seven day flame: claim a reward each day to keep the streak alive. */

function rewardIcon(reward: DailyReward, size: number) {
  if (reward.crateId !== undefined) return <EggIcon size={size} />;
  if (reward.gems !== undefined) return <GemIcon size={size} />;
  return <CoinIcon size={size} />;
}

function rewardTitle(reward: DailyReward): string {
  if (reward.crateId !== undefined) return crateById(reward.crateId).name;
  return reward.label;
}

function rewardShort(reward: DailyReward): string {
  if (reward.crateId !== undefined) {
    const crate = crateById(reward.crateId);
    return crate.name.replace(' Egg', '');
  }
  if (reward.gems !== undefined) return `${reward.gems} gems`;
  return `${reward.coins ?? 0} coins`;
}

export default function StreakScreen() {
  const nav = useNav();
  const { profile, canClaimDaily, claimDaily, dailyPreview, equippedSkin, stageIndex, totalStars } = useGame();
  const [claim, setClaim] = useState<DailyClaim | null>(null);

  const tier = streakFlameTier(profile.streak.count);
  const flameColor = FLAME_COLORS[Math.min(tier, FLAME_COLORS.length - 1)] ?? colors.lava;
  const cycleIndex = profile.streak.cycleIndex;
  const nextDay = dailyPreview.day;

  const handleClaim = () => {
    const result = claimDaily();
    if (result !== null) setClaim(result);
  };

  const bonusLine = claim === null ? '' : claim.bonus > 0 ? ` plus a ${claim.bonus} coin milestone bonus` : '';

  return (
    <ScreenScaffold scroll>
      <ScreenHeader
        title="Daily Flame"
        subtitle="One short session a day keeps the flame burning bright"
        onBack={() => (nav.canGoBack ? nav.pop() : nav.reset('home'))}
        right={<CounterChip icon={<StarIcon size={18} />} value={totalStars} />}
      />

      <LinearGradient colors={gradients.lava} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.hero, shadow(2)]}>
        <View style={styles.heroTop}>
          <Bobbing amount={9} duration={1500}>
            <View style={[styles.flameCircle, { borderColor: flameColor }]}>
              <FlameIcon size={58} color={flameColor} />
            </View>
          </Bobbing>
          <View style={styles.heroText}>
            <Text style={styles.heroCount}>{profile.streak.count}</Text>
            <Text style={styles.heroLabel}>day flame</Text>
            <Text style={styles.heroBest}>{`Best run: ${profile.streak.best} days`}</Text>
          </View>
        </View>

        <View style={styles.heroStrips}>
          <CounterChip icon={<FlameIcon size={18} color={colors.amber} />} value={`${tier + 1} flame level`} tint="rgba(255,255,255,0.9)" />
          <CounterChip icon={<EggIcon size={18} />} value={`${cycleIndex} of 7 claimed`} tint="rgba(255,255,255,0.9)" />
        </View>

        <ChunkyButton
          label={canClaimDaily ? `Claim day ${nextDay}` : 'Come back tomorrow'}
          tone="amber"
          size="lg"
          disabled={!canClaimDaily}
          onPress={handleClaim}
          style={styles.claim}
        />
        <Text style={styles.heroHint}>
          {canClaimDaily ? `Today gives you ${rewardTitle(dailyPreview)}` : 'Today is claimed. A new flame reward waits tomorrow.'}
        </Text>
      </LinearGradient>

      <Panel style={styles.block}>
        <Text style={type.h2}>Your seven day trail</Text>
        <Text style={type.small}>Every day you practice, the flame grows and the reward gets better.</Text>
        <View style={styles.dayRow}>
          {DAILY_REWARDS.map((reward) => {
            const claimed = reward.day <= cycleIndex;
            const isNext = canClaimDaily && reward.day === nextDay;
            return (
              <View
                key={`day-${reward.day}`}
                style={[
                  styles.dayCard,
                  claimed ? styles.dayClaimed : undefined,
                  isNext ? styles.dayNext : undefined,
                ]}
              >
                <Text style={[styles.dayNumber, claimed ? styles.dayNumberClaimed : undefined]}>{`Day ${reward.day}`}</Text>
                {claimed ? <CheckIcon size={18} color={colors.successDark} /> : rewardIcon(reward, 20)}
                <Text style={styles.dayValue} numberOfLines={1}>
                  {claimed ? 'Got it' : rewardShort(reward)}
                </Text>
              </View>
            );
          })}
        </View>
      </Panel>

      <Panel style={styles.block}>
        <Text style={type.h2}>Flame milestones</Text>
        <Text style={type.small}>Big coin bonuses land when your streak reaches each mark.</Text>
        <Divider />
        {STREAK_MILESTONES.map((milestone) => {
          const reached = profile.streak.count >= milestone.days;
          return (
            <View key={`milestone-${milestone.days}`} style={styles.milestoneRow}>
              <View style={[styles.milestoneIcon, reached ? styles.milestoneIconDone : undefined]}>
                <TrophyIcon size={20} color={reached ? colors.amberDark : colors.inkFaint} />
              </View>
              <View style={styles.milestoneText}>
                <Text style={type.bodyBold}>{milestone.label}</Text>
                <Text style={type.small}>{`${milestone.days} days in a row`}</Text>
              </View>
              <Text style={[styles.bonus, reached ? styles.bonusDone : undefined]}>{`+${milestone.bonus}`}</Text>
            </View>
          );
        })}
      </Panel>

      <Panel style={styles.block}>
        <Text style={type.h2}>How the flame works</Text>
        <InfoRow label="Practice today" value={canClaimDaily ? 'Waiting for you' : 'Done, nice work'} />
        <InfoRow label="Miss a day" value="The flame starts again at day 1" />
        <InfoRow label="Best streak" value={`${profile.streak.best} days`} />
        <Divider />
        <View style={styles.promise}>
          <Dino skin={equippedSkin} stageIndex={stageIndex} size={78} aura={false} />
          <View style={styles.promiseText}>
            <Text style={type.bodyBold}>A short session is enough</Text>
            <Text style={type.small}>One level of five words keeps the flame alive and pushes your dinosaur toward its next evolution.</Text>
          </View>
        </View>
      </Panel>

      <GameModal
        visible={claim !== null}
        badge={claim === null ? undefined : `Streak ${claim.streakCount} days`}
        title={claim === null ? '' : `Day ${claim.reward.day} claimed!`}
        message={claim === null ? undefined : `You earned ${rewardTitle(claim.reward)}${bonusLine}.`}
        gradient={gradients.gold}
        confetti={claim !== null}
        mascot={<PopIn><Dino skin={equippedSkin} stageIndex={stageIndex} size={110} /></PopIn>}
        actions={[
          { label: 'Nice!', tone: 'lava', onPress: () => setClaim(null) },
          {
            label: 'Play a level',
            tone: 'jungle',
            onPress: () => {
              setClaim(null);
              nav.reset('home');
            },
          },
        ]}
        onDismiss={() => setClaim(null)}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.xl, borderWidth: 3, borderColor: 'rgba(255,255,255,0.75)', padding: spacing.lg, gap: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flameCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroCount: { fontFamily: fonts.display, fontSize: 46, lineHeight: 50, color: '#FFFFFF' },
  heroLabel: { fontFamily: fonts.displayMid, fontSize: 18, color: 'rgba(255,255,255,0.95)' },
  heroBest: { ...type.small, color: 'rgba(255,255,255,0.9)' },
  heroStrips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  claim: { width: '100%' },
  heroHint: { ...type.small, color: 'rgba(255,255,255,0.95)', textAlign: 'center' },
  block: { marginTop: spacing.md, gap: spacing.xs },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  dayCard: {
    width: '30%',
    minWidth: 92,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.cardLine,
    backgroundColor: colors.cardAlt,
  },
  dayClaimed: { backgroundColor: '#E4F8EC', borderColor: '#8BD9AE' },
  dayNext: { borderColor: colors.amber, backgroundColor: '#FFF6DC' },
  dayNumber: { ...type.label },
  dayNumberClaimed: { color: colors.successDark },
  dayValue: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft, textAlign: 'center' },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 7 },
  milestoneIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt, borderWidth: 2, borderColor: colors.cardLine },
  milestoneIconDone: { backgroundColor: '#FFF6DC', borderColor: colors.amber },
  milestoneText: { flex: 1 },
  bonus: { fontFamily: fonts.displayMid, fontSize: 16, color: colors.inkFaint },
  bonusDone: { color: colors.amberDark },
  promise: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  promiseText: { flex: 1 },
});
