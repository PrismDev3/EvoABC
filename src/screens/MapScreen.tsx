import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGame } from '../state/GameContext';
import { useNav } from '../navigation/Navigator';
import { REGIONS, unitProgress } from '../data/levels';
import { TAG_LABELS } from '../data/words';
import { UNITS } from '../data/wordSeed';
import { Level, Region } from '../types';
import { speakLine } from '../lib/tts';
import { colors, fonts, radii, shadow, spacing, type } from '../theme';
import { ScreenHeader, ScreenScaffold } from '../components/ScreenScaffold';
import { CueIcon } from '../art/CueIcon';
import { Panel, ProgressBar } from '../components/Cards';
import { ChunkyButton } from '../components/Button';
import { GameModal } from '../components/GameModal';
import { CrownIcon, LockIcon, StarIcon, TrophyIcon } from '../art/Icons';
import { PopIn } from '../art/Effects';
import { Dino } from '../art/Dino';

/**
 * The adventure trail. Each region is an island card holding its eight levels
 * as stepping stones, so a first grader can always see the next stomp.
 */

export default function MapScreen() {
  const nav = useNav();
  const { profile, nextLevel, totalStars, equippedSkin, stageIndex, levelProgress, unlocked, starsForRegion } = useGame();
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  const nextRegion = REGIONS.find((region) => region.id === nextLevel.regionId) ?? REGIONS[0];

  // The trail is grouped into teaching units, so a parent can see the order
  // sounds are introduced and how far along the child is inside each one.
  const unitGroups = useMemo(
    () =>
      UNITS.map((unit) => ({ unit, regions: REGIONS.filter((region) => region.unit === unit.id) })).filter(
        (group) => group.regions.length > 0,
      ),
    [],
  );

  const stopNumbers = useMemo(() => {
    const numbers: Record<string, number> = {};
    REGIONS.forEach((region, index) => {
      numbers[region.id] = index + 1;
    });
    return numbers;
  }, []);

  const handlePick = (level: Level, region: Region) => {
    if (!unlocked(level.id)) {
      setLockedMessage(`Finish ${region.name} one step at a time and this one opens up.`);
      return;
    }
    nav.push('play', { levelId: level.id });
  };

  return (
    <ScreenScaffold scroll>
      <ScreenHeader
        title="Adventure Map"
        subtitle={`${totalStars} stars collected. Every star makes your dino stronger.`}
        onBack={() => nav.reset('home')}
        right={
          <View style={styles.starChip}>
            <StarIcon size={20} />
            <Text style={styles.starChipText}>{totalStars}</Text>
          </View>
        }
      />

      <Panel style={styles.continueCard} borderColor={nextRegion.accent}>
        <View style={styles.continueRow}>
          <View style={styles.continueArt}>
            <Dino skin={equippedSkin} stageIndex={stageIndex} size={82} />
          </View>
          <View style={styles.continueText}>
            <Text style={type.label}>UP NEXT</Text>
            <Text style={type.h2} numberOfLines={2}>
              {`${nextRegion.name}, ${nextLevel.title}`}
            </Text>
            <Text style={type.body} numberOfLines={2}>
              {nextRegion.blurb}
            </Text>
          </View>
        </View>
        <ChunkyButton
          label="Stomp in"
          tone="jungle"
          size="md"
          onPress={() => nav.push('play', { levelId: nextLevel.id })}
          accessibilityLabel={`Play ${nextRegion.name} ${nextLevel.title}`}
        />
      </Panel>

      <View style={styles.trailHead}>
        <TrophyIcon size={20} />
        <Text style={type.label}>THE SPELLING TRAIL</Text>
      </View>

      {unitGroups.map((group, groupIndex) => {
        const unitStats = unitProgress(group.unit.id, profile.progress);
        return (
          <View key={group.unit.id}>
            <View style={styles.unitHead}>
              <View style={styles.unitEmoji}>
                <CueIcon cue={group.unit.cue} size={38} />
              </View>
              <View style={styles.unitTitles}>
                <Text style={type.label}>{`UNIT ${groupIndex + 1}`}</Text>
                <Text style={type.h2} numberOfLines={1}>
                  {group.unit.title}
                </Text>
                <Text style={[type.small, styles.unitBlurb]} numberOfLines={2}>
                  {group.unit.blurb}
                </Text>
              </View>
              <View style={styles.regionStarChip}>
                <StarIcon size={16} color={colors.amber} />
                <Text style={styles.regionStarText}>{`${unitStats.stars}/${unitStats.total}`}</Text>
              </View>
            </View>
            <ProgressBar value={unitStats.stars} max={unitStats.total} gradient={['#FFE07A', '#FFC531']} height={10} />
            <Text style={styles.unitLine}>{`${unitStats.cleared} of ${unitStats.levels} levels cleared in this unit`}</Text>

            {group.regions.map((region) => {
              const overallIndex = (stopNumbers[region.id] ?? 1) - 1;
              const regionOpen = unlocked(region.levels[0].id);
              return (
                <PopIn key={region.id} from={0.94}>
                  <RegionCard
                    region={region}
                    index={overallIndex}
                    open={regionOpen}
                    stars={starsForRegion(region.id)}
                    onPick={handlePick}
                    levelStars={(levelId) => levelProgress(levelId).stars}
                    levelOpen={(levelId) => unlocked(levelId)}
                    previousName={overallIndex === 0 ? null : REGIONS[overallIndex - 1]?.name ?? null}
                  />
                </PopIn>
              );
            })}
            <View style={styles.unitSpacer} />
          </View>
        );
      })}

      <Text style={[type.small, styles.footer]}>New dinosaurs hatch from eggs in the hatchery. Keep spelling to fill your park.</Text>

      <GameModal
        visible={lockedMessage !== null}
        badge="KEEP GOING"
        title="This path is still sleeping"
        message={lockedMessage ?? ''}
        gradient={['#FFFFFF', '#EAF7FF', '#CFE9FF']}
        mascot={<Dino skin={equippedSkin} stageIndex={stageIndex} size={130} />}
        actions={[{ label: "I'll keep stomping", tone: 'jungle', onPress: () => setLockedMessage(null) }]}
        onDismiss={() => setLockedMessage(null)}
      />
    </ScreenScaffold>
  );
}

function RegionCard({
  region,
  index,
  open,
  stars,
  onPick,
  levelStars,
  levelOpen,
  previousName,
}: {
  region: Region;
  index: number;
  open: boolean;
  stars: number;
  onPick: (level: Level, region: Region) => void;
  levelStars: (levelId: string) => number;
  levelOpen: (levelId: string) => boolean;
  previousName: string | null;
}) {
  const maxStars = region.levels.length * 3;
  const cardStyle = open ? styles.regionCard : { ...styles.regionCard, opacity: 0.72 };
  const ruleLine = `${region.rule.title}. ${region.rule.text}`;

  return (
    <Panel
      style={cardStyle}
      borderColor={open ? region.accent : colors.cardLine}
      onPress={() => speakLine(ruleLine)}
      accessibilityLabel={`${region.name} island. Hear the sound rule.`}
    >
      <View style={styles.regionHead}>
        <View style={[styles.regionEmoji, { backgroundColor: region.gradient[0] }]}>
          <CueIcon cue={region.cue} size={42} fallback={region.name} />
        </View>
        <View style={styles.regionTitles}>
          <Text style={type.label}>{`STOP ${index + 1} - ${TAG_LABELS[region.tag].toUpperCase()}`}</Text>
          <Text style={type.h2} numberOfLines={1}>
            {region.name}
          </Text>
        </View>
        <View style={styles.regionStarChip}>
          <StarIcon size={16} color={open ? colors.amber : colors.locked} />
          <Text style={[styles.regionStarText, { color: open ? colors.ink : colors.inkFaint }]}>{`${stars}/${maxStars}`}</Text>
        </View>
      </View>

      <Text style={type.body}>{region.blurb}</Text>

      <View style={styles.ruleRow}>
        <View style={[styles.ruleBadge, { backgroundColor: region.gradient[0] }]}>
          <Text style={styles.ruleBadgeText}>{region.rule.focusPair}</Text>
        </View>
        <Text style={[type.small, styles.ruleText]} numberOfLines={2}>
          {ruleLine}
        </Text>
      </View>

      <ProgressBar value={stars} max={maxStars} gradient={region.gradient} height={14} />

      {open ? (
        <View style={styles.nodes}>
          {region.levels.map((level, levelIndex) => (
            <LevelNode
              key={level.id}
              level={level}
              number={levelIndex + 1}
              stars={levelStars(level.id)}
              open={levelOpen(level.id)}
              accent={region.accent}
              tint={region.gradient[0]}
              offset={levelIndex % 2 === 1}
              onPress={() => onPick(level, region)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.lockedRow}>
          <LockIcon size={22} />
          <Text style={[type.bodyBold, styles.lockedText]}>
            {previousName === null ? 'Finish the first stop to open this one.' : `Finish ${previousName} to open this island.`}
          </Text>
        </View>
      )}
    </Panel>
  );
}

function LevelNode({
  level,
  number,
  stars,
  open,
  accent,
  tint,
  offset,
  onPress,
}: {
  level: Level;
  number: number;
  stars: number;
  open: boolean;
  accent: string;
  tint: string;
  offset: boolean;
  onPress: () => void;
}) {
  const cleared = stars > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${level.title}, ${stars} of 3 stars, ${open ? 'open' : 'locked'}`}
      style={({ pressed }) => [styles.nodeWrap, offset ? styles.nodeOffset : undefined, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
    >
      {level.boss ? (
        <View style={styles.nodeCrown}>
          <CrownIcon size={18} />
        </View>
      ) : null}
      <View
        style={[
          styles.node,
          {
            backgroundColor: cleared ? accent : open ? colors.card : colors.locked,
            borderColor: open ? tint : colors.cardLine,
          },
          shadow(open ? 2 : 0),
        ]}
      >
        {open ? (
          <Text style={[styles.nodeNumber, { color: cleared ? '#FFFFFF' : colors.ink }]}>{number}</Text>
        ) : (
          <LockIcon size={22} color={colors.card} />
        )}
      </View>
      <View style={styles.nodeStars}>
        {[0, 1, 2].map((slot) => (
          <StarIcon key={`${level.id}-star-${slot}`} size={11} color={slot < stars ? colors.amber : 'rgba(23,38,61,0.18)'} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  starChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.cardLine,
    ...shadow(1),
  },
  starChipText: { fontFamily: fonts.displayMid, fontSize: 16, color: colors.ink },
  continueCard: { gap: spacing.md, marginBottom: spacing.lg },
  continueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  continueArt: { width: 82, height: 82, alignItems: 'center', justifyContent: 'center' },
  continueText: { flex: 1, gap: 2 },
  unitHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.xs },
  unitEmoji: { width: 46, height: 46, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 2, borderColor: colors.cardLine },
  unitTitles: { flex: 1 },
  unitBlurb: { color: colors.inkSoft },
  unitLine: { ...type.small, paddingLeft: spacing.xs, paddingTop: 6 },
  unitSpacer: { height: spacing.md },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ruleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  ruleBadgeText: { fontFamily: fonts.bodyBlack, fontSize: 11, color: colors.ink, letterSpacing: 0.5 },
  ruleText: { flex: 1, color: colors.inkSoft },
  trailHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, paddingLeft: spacing.xs },
  regionCard: { gap: spacing.md, marginBottom: spacing.lg },
  regionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  regionEmoji: { width: 52, height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  regionTitles: { flex: 1 },
  regionStarChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  regionStarText: { fontFamily: fonts.displayMid, fontSize: 14 },
  nodes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  nodeWrap: { alignItems: 'center', gap: 4, paddingTop: 8 },
  nodeOffset: { marginTop: 26 },
  nodeCrown: { position: 'absolute', top: -6, right: -4, zIndex: 2 },
  node: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  nodeNumber: { fontFamily: fonts.display, fontSize: 24 },
  nodeStars: { flexDirection: 'row', gap: 2 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  lockedText: { flex: 1, color: colors.inkSoft },
  footer: { textAlign: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
});
