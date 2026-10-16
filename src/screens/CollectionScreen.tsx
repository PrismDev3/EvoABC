import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Skin } from '../types';
import { useGame } from '../state/GameContext';
import { useNav } from '../navigation/Navigator';
import { RARITY_LABEL, RARITY_ORDER, SKINS } from '../data/dinosaurs';
import { colors, gradients, RARITY_COLORS, radii, spacing, type } from '../theme';
import { CONTENT_MAX_WIDTH, ScreenHeader, ScreenScaffold } from '../components/ScreenScaffold';
import { Badge, Panel, ProgressBar } from '../components/Cards';
import { PillButton } from '../components/Button';
import { GameModal } from '../components/GameModal';
import { Dino } from '../art/Dino';
import { LockIcon, PawIcon, StarIcon } from '../art/Icons';
import { Bobbing, PopIn } from '../art/Effects';

/**
 * The collection. Every dinosaur and buddy in the game sits in one grid:
 * the ones you have are in full colour, the ones still out there are a
 * pale silhouette with a hint about which egg hides them.
 */

type Filter = 'all' | 'dinos' | 'buddies';

/** Pale shell tone used for the dinosaurs a player has not hatched yet. */
const LOCKED_GRADIENT = ['#E7EEF6', '#F7FAFD'] as const;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'dinos', label: 'Dinosaurs' },
  { id: 'buddies', label: 'Buddies' },
];

export default function CollectionScreen() {
  const { profile, equipSkin, setCompanion, stageIndex, totalStars } = useGame();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Skin | null>(null);

  const columns = width >= 620 ? 3 : 2;
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH) - spacing.lg * 2 - 4;
  const cardWidth = Math.floor((contentWidth - spacing.md * (columns - 1)) / columns);

  const isOwned = (skin: Skin) => (skin.companion === true ? profile.companionIds.includes(skin.id) : profile.ownedSkinIds.includes(skin.id));
  const ownedCount = SKINS.filter(isOwned).length;

  const visible = useMemo(() => {
    const list = SKINS.filter((skin) => {
      if (filter === 'dinos') return skin.companion !== true;
      if (filter === 'buddies') return skin.companion === true;
      return true;
    });
    return list.slice().sort((a, b) => {
      const ownedDiff = Number(isOwned(b)) - Number(isOwned(a));
      if (ownedDiff !== 0) return ownedDiff;
      const rarityDiff = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name);
    });
  }, [filter, profile.companionIds, profile.ownedSkinIds]);

  const selectedOwned = selected === null ? false : isOwned(selected);
  const selectedIsBuddy = selected !== null && selected.companion === true && profile.activeCompanionId === selected.id;
  const selectedIsWorn = selected !== null && profile.equippedSkinId === selected.id;
  const selectedTone = selected === null ? RARITY_COLORS.common : RARITY_COLORS[selected.rarity] ?? RARITY_COLORS.common;

  const detailActions = () => {
    if (selected === null) return [];
    if (!selectedOwned) {
      return [
        { label: 'Visit the hatchery', tone: 'lava' as const, onPress: () => { setSelected(null); nav.push('eggs'); } },
        { label: 'Close', tone: 'bone' as const, onPress: () => setSelected(null) },
      ];
    }
    if (selected.companion === true) {
      return selectedIsBuddy
        ? [
            { label: 'Stop following', tone: 'danger' as const, onPress: () => { setCompanion(null); setSelected(null); } },
            { label: 'Close', tone: 'bone' as const, onPress: () => setSelected(null) },
          ]
        : [
            { label: 'Follow me', tone: 'jungle' as const, onPress: () => { setCompanion(selected.id); setSelected(null); } },
            { label: 'Close', tone: 'bone' as const, onPress: () => setSelected(null) },
          ];
    }
    return selectedIsWorn
      ? [{ label: 'Close', tone: 'bone' as const, onPress: () => setSelected(null) }]
      : [
          { label: 'Take this form', tone: 'lava' as const, onPress: () => { equipSkin(selected.id); setSelected(null); } },
          { label: 'Close', tone: 'bone' as const, onPress: () => setSelected(null) },
        ];
  };

  return (
    <ScreenScaffold scroll>
      <ScreenHeader
        title="My monsters"
        subtitle={`${ownedCount} of ${SKINS.length} collected`}
        onBack={() => nav.pop()}
        right={<Badge label={`${totalStars} stars`} color={colors.amber} textColor="#4A3000" icon={<StarIcon size={16} color="#4A3000" />} />}
      />

      <Panel style={styles.progressCard}>
        <View style={styles.progressHead}>
          <Text style={type.bodyBold}>Collection power</Text>
          <Text style={type.small}>{`${ownedCount} hatched`}</Text>
        </View>
        <ProgressBar value={ownedCount} max={SKINS.length} gradient={gradients.gold} />
      </Panel>

      <View style={styles.filterRow}>
        {FILTERS.map((entry) => (
          <PillButton
            key={entry.id}
            label={entry.label}
            tone="grape"
            selected={filter === entry.id}
            onPress={() => setFilter(entry.id)}
          />
        ))}
      </View>

      <View style={styles.grid}>
        {visible.map((skin, index) => {
          const owned = isOwned(skin);
          const tone = RARITY_COLORS[skin.rarity] ?? RARITY_COLORS.common;
          const equipped = skin.companion === true ? profile.activeCompanionId === skin.id : profile.equippedSkinId === skin.id;
          return (
            <PopIn key={skin.id} delay={Math.min(index * 30, 240)} from={0.92} style={{ width: cardWidth }}>
              <Panel
                padded={false}
                onPress={() => setSelected(skin)}
                borderColor={owned ? tone.border : colors.cardLine}
                style={styles.card}
                accessibilityLabel={owned ? `${skin.name}, ${RARITY_LABEL[skin.rarity]}` : 'Locked dinosaur'}
              >
                <LinearGradient
                  colors={owned ? tone.gradient : LOCKED_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardHead}
                >
                  <Dino skin={skin} stageIndex={skin.companion === true ? 0 : stageIndex} size={cardWidth - 30} aura={owned} />
                  {!owned ? (
                    <View style={styles.silhouette}>
                      <LockIcon size={24} color={colors.inkSoft} />
                    </View>
                  ) : null}
                  {equipped ? (
                    <View style={styles.equipTag}>
                      <Badge
                        label={skin.companion === true ? 'Buddy' : 'Wearing'}
                        color={skin.companion === true ? colors.grape : colors.jungle}
                        textColor={skin.companion === true ? '#FFFFFF' : '#083A22'}
                        icon={skin.companion === true ? <PawIcon size={13} color="#FFFFFF" /> : undefined}
                      />
                    </View>
                  ) : null}
                </LinearGradient>
                <View style={styles.cardBody}>
                  <Text style={[type.h3, styles.cardName]} numberOfLines={1}>
                    {owned ? skin.name : 'Not found yet'}
                  </Text>
                  <Text style={type.small} numberOfLines={2}>
                    {owned ? skin.species : skin.companion === true ? 'Hides in a Buddy Egg' : 'Hides in a mystery egg'}
                  </Text>
                  <Badge label={RARITY_LABEL[skin.rarity]} color={tone.border} textColor={tone.text} />
                </View>
              </Panel>
            </PopIn>
          );
        })}
      </View>

      <Text style={[type.small, styles.footNote]}>
        Tip: a buddy watches you spell and shows up next to your dino on the home screen
      </Text>

      <GameModal
        visible={selected !== null}
        badge={selected === null ? undefined : RARITY_LABEL[selected.rarity]}
        gradient={selectedTone.gradient}
        title={selected === null ? undefined : selectedOwned ? selected.name : 'Still out there'}
        message={
          selected === null
            ? undefined
            : selectedOwned
              ? selected.blurb
              : 'Hatch mystery eggs in the hatchery to bring this one into your team.'
        }
        mascot={
          selected !== null ? (
            <Bobbing amount={7}>
              <Dino skin={selected} stageIndex={selected.companion === true ? 0 : stageIndex} size={210} />
            </Bobbing>
          ) : undefined
        }
        actions={detailActions()}
        onDismiss={() => setSelected(null)}
      >
        {selected !== null ? (
          <View style={styles.detailRows}>
            <View style={styles.detailRow}>
              <Text style={type.bodyBold}>Family</Text>
              <Text style={type.body}>{selected.companion === true ? 'Little buddy' : 'Battle dino'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={type.bodyBold}>Status</Text>
              <Text style={type.body}>
                {!selectedOwned ? 'Not hatched yet' : selected.companion === true ? (selectedIsBuddy ? 'Following you now' : 'Ready to follow') : selectedIsWorn ? 'On your team' : 'Ready to wear'}
              </Text>
            </View>
          </View>
        ) : null}
      </GameModal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  progressCard: { gap: spacing.sm, marginTop: spacing.sm },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'flex-start' },
  card: { overflow: 'hidden', borderRadius: radii.lg },
  cardHead: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, minHeight: 132 },
  silhouette: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(231,238,246,0.82)' },
  equipTag: { position: 'absolute', top: 6, right: 6 },
  cardBody: { padding: spacing.sm, gap: 4, alignItems: 'flex-start' },
  cardName: { fontSize: 17, lineHeight: 21 },
  footNote: { textAlign: 'center', paddingVertical: spacing.lg },
  detailRows: { width: '100%', gap: 6, marginTop: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
});
