import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Crate, HatchResult, Rarity, Skin } from '../types';
import { useGame } from '../state/GameContext';
import { useNav } from '../navigation/Navigator';
import { CRATES } from '../data/crates';
import { RARITY_LABEL } from '../data/dinosaurs';
import { colors, fonts, gradients, RARITY_COLORS, radii, shadow, spacing, type } from '../theme';
import { ScreenHeader, ScreenScaffold } from '../components/ScreenScaffold';
import { ChunkyButton } from '../components/Button';
import { Badge, Panel } from '../components/Cards';
import { GameModal } from '../components/GameModal';
import { Hud } from '../components/Hud';
import { Dino } from '../art/Dino';
import { CoinIcon, CrownIcon, EggIcon, GemIcon, LockIcon, SparkleIcon, StarIcon } from '../art/Icons';
import { Bobbing, EvolveBurst, PopIn, SparkleRing } from '../art/Effects';
import { haptic } from '../lib/feedback';
import { playRoar, playSfx } from '../audio/sfx';

/**
 * The hatchery. Mystery egg crates are the collection loop: stars unlock the
 * crates, coins or gems buy them, and every egg cracks open into a dinosaur.
 */

function ShakingEgg({ crate, rotate }: { crate: Crate; rotate: ReturnType<Animated.Value['interpolate']> }) {
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <View style={[styles.eggHalo, { backgroundColor: crate.gradient[0] }]}>
        <EggIcon size={150} color="#FFF6E5" spot={crate.gradient[1]} />
      </View>
    </Animated.View>
  );
}

export default function EggsScreen() {
  const { profile, crateStatus, buyCrate, openStoredEgg, setCompanion, totalStars } = useGame();
  const nav = useNav();
  const [shaking, setShaking] = useState<{ crate: Crate; mode: 'buy' | 'open' } | null>(null);
  const [result, setResult] = useState<HatchResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const wobble = useRef(new Animated.Value(0)).current;
  const hatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hatchTimer.current !== null) clearTimeout(hatchTimer.current);
    },
    [],
  );

  const startHatch = useCallback(
    (crate: Crate, mode: 'buy' | 'open') => {
      setProblem(null);
      setResult(null);
      setShaking({ crate, mode });
      playSfx('eggshake');
      haptic('medium');
      wobble.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(wobble, { toValue: 1, duration: 110, useNativeDriver: true }),
          Animated.timing(wobble, { toValue: -1, duration: 110, useNativeDriver: true }),
        ]),
        { iterations: 5 },
      ).start();
      if (hatchTimer.current !== null) clearTimeout(hatchTimer.current);
      hatchTimer.current = setTimeout(() => {
        const outcome = mode === 'buy' ? buyCrate(crate.id) : openStoredEgg(crate.id);
        setShaking(null);
        wobble.setValue(0);
        if (!outcome.ok) {
          setProblem(outcome.error ?? 'That egg did not want to open');
          haptic('warning');
          return;
        }
        setResult(outcome);
      }, 1250);
    },
    [buyCrate, openStoredEgg, wobble],
  );

  const rotate = wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] });
  const resultSkin: Skin | undefined = result?.skin;
  const resultRarity: Rarity = resultSkin?.rarity ?? 'common';
  const rarityTone = RARITY_COLORS[resultRarity] ?? RARITY_COLORS.common;
  const resultIsCompanion = resultSkin?.companion === true;
  const resultOwned = resultSkin !== undefined && (resultIsCompanion ? profile.companionIds.includes(resultSkin.id) : profile.ownedSkinIds.includes(resultSkin.id));

  return (
    <ScreenScaffold scroll>
      <ScreenHeader
        title="Hatchery"
        subtitle="Buy a mystery egg and see what stomps out"
        onBack={() => nav.pop()}
        right={
          <Badge
            label={`${totalStars} stars`}
            color={colors.amber}
            textColor="#4A3000"
            icon={<StarIcon size={16} color="#4A3000" />}
          />
        }
      />
      <Hud showStars compact />

      <View style={styles.list}>
        {CRATES.map((crate, index) => {
          const status = crateStatus(crate.id);
          const locked = !status.unlocked;
          const missingStars = Math.max(0, crate.unlockStars - totalStars);
          return (
            <PopIn key={crate.id} delay={index * 45} from={0.94}>
              <Panel borderColor={locked ? colors.cardLine : crate.gradient[1]} style={styles.crateCard}>
                <View style={styles.crateTop}>
                  <LinearGradient colors={crate.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.crateArt}>
                    {locked ? <LockIcon size={30} color="#FFFFFF" /> : <EggIcon size={54} color="#FFF6E5" spot={crate.gradient[1]} />}
                  </LinearGradient>
                  <View style={styles.crateInfo}>
                    <View style={styles.crateTitleRow}>
                      <Text style={[type.h3, styles.crateName]} numberOfLines={2}>
                        {crate.name}
                      </Text>
                      {status.owned > 0 ? <Badge label={`${status.owned} ready`} color={colors.grape} /> : null}
                    </View>
                    <Text style={type.body} numberOfLines={3}>
                      {crate.blurb}
                    </Text>
                    <View style={styles.costRow}>
                      {crate.currency === 'coins' ? <CoinIcon size={20} /> : <GemIcon size={19} />}
                      <Text style={styles.costText}>{crate.cost}</Text>
                      {crate.unlockStars > 0 ? (
                        <View style={styles.needRow}>
                          <StarIcon size={15} color={locked ? colors.locked : colors.amber} />
                          <Text style={type.small}>{crate.unlockStars}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {locked ? (
                  <View style={styles.lockNote}>
                    <Text style={[type.small, styles.lockText]}>{`Earn ${missingStars} more stars to unlock this crate`}</Text>
                  </View>
                ) : (
                  <View style={styles.crateActions}>
                    <ChunkyButton
                      label="Hatch"
                      tone={crate.currency === 'coins' ? 'amber' : 'grape'}
                      size="md"
                      icon={<SparkleIcon size={18} color="#FFFFFF" />}
                      disabled={!status.affordable}
                      onPress={() => startHatch(crate, 'buy')}
                      style={styles.actionButton}
                    />
                    {status.owned > 0 ? (
                      <ChunkyButton
                        label={`Open ${status.owned}`}
                        tone="bone"
                        size="md"
                        icon={<EggIcon size={18} color={colors.ink} spot={crate.gradient[1]} />}
                        onPress={() => startHatch(crate, 'open')}
                        style={styles.actionButton}
                      />
                    ) : null}
                  </View>
                )}
                {!locked && !status.affordable && status.owned === 0 ? (
                  <Text style={[type.small, styles.affordNote]}>
                    {crate.currency === 'coins' ? 'Keep spelling words to fill your coin pouch' : 'Perfect levels drop extra gems'}
                  </Text>
                ) : null}
              </Panel>
            </PopIn>
          );
        })}
      </View>

      <View style={styles.footerNote}>
        <CrownIcon size={20} color={colors.amberDark} />
        <Text style={[type.small, styles.footerText]}>Legendary dinos only come out of the biggest eggs</Text>
      </View>

      <GameModal
        visible={shaking !== null}
        title="The egg is wobbling"
        message="Something inside wants to meet you"
        gradient={gradients.bone}
        dismissible={false}
        mascot={shaking !== null ? <ShakingEgg crate={shaking.crate} rotate={rotate} /> : undefined}
      />

      <GameModal
        visible={result !== null && resultSkin !== undefined}
        badge={RARITY_LABEL[resultRarity]}
        gradient={rarityTone.gradient}
        confetti={resultRarity === 'epic' || resultRarity === 'legendary'}
        title={result?.duplicate === true ? 'A familiar friend' : resultSkin?.name}
        message={
          result?.duplicate === true
            ? `You already have ${resultSkin?.name ?? 'this dino'}. The shell crumbles into ${result?.gemsBack ?? 0} gems.`
            : resultSkin?.blurb
        }
        mascot={
          resultSkin !== undefined ? (
            <View>
              <Bobbing amount={8}>
                <Dino skin={resultSkin} stageIndex={0} size={200} />
              </Bobbing>
              {(resultRarity === 'epic' || resultRarity === 'legendary') ? <EvolveBurst run tint={resultSkin.colors.glow} /> : null}
              <SparkleRing trigger={1} tint={resultSkin.colors.glow} />
            </View>
          ) : undefined
        }
        actions={
          resultIsCompanion && resultOwned
            ? [
                {
                  label: 'Follow me',
                  tone: 'jungle',
                  onPress: () => {
                    if (resultSkin !== undefined) setCompanion(resultSkin.id);
                    setResult(null);
                  },
                },
                { label: 'See my dinos', tone: 'bone', onPress: () => setResult(null) },
              ]
            : [
                {
                  label: 'Hatch another',
                  tone: 'lava',
                  onPress: () => {
                    setResult(null);
                    playRoar();
                  },
                },
                {
                  label: 'My collection',
                  tone: 'bone',
                  onPress: () => {
                    setResult(null);
                    nav.push('collection');
                  },
                },
              ]
        }
        onDismiss={() => setResult(null)}
      >
        {resultSkin !== undefined && result?.duplicate !== true ? (
          <View style={styles.revealMeta}>
            <Badge label={resultSkin.species} color="rgba(23,38,61,0.12)" textColor={colors.ink} />
            <Text style={[type.small, styles.revealLine]}>
              {resultIsCompanion ? 'This buddy can walk beside you on every level' : 'It is ready to grow with your spelling'}
            </Text>
          </View>
        ) : null}
      </GameModal>

      <GameModal
        visible={problem !== null}
        badge="Not yet"
        title="That egg stayed shut"
        message={problem ?? ''}
        actions={[{ label: 'Okay', tone: 'bone', onPress: () => setProblem(null) }]}
        onDismiss={() => setProblem(null)}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  crateCard: { gap: spacing.md },
  crateTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  crateArt: { width: 86, height: 86, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', ...shadow(1) },
  crateInfo: { flex: 1, gap: 4 },
  crateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  crateName: { flexShrink: 1 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  costText: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  needRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: spacing.sm },
  lockNote: { backgroundColor: colors.cardAlt, borderRadius: radii.md, padding: spacing.sm, alignItems: 'center' },
  lockText: { color: colors.inkSoft, textAlign: 'center' },
  crateActions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
  affordNote: { textAlign: 'center' },
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.lg },
  footerText: { flexShrink: 1 },
  eggHalo: { width: 190, height: 190, borderRadius: 95, alignItems: 'center', justifyContent: 'center', ...shadow(2) },
  revealMeta: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  revealLine: { textAlign: 'center' },
});
