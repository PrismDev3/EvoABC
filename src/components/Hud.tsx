import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing, shadow } from '../theme';
import { CoinIcon, FlameIcon, GemIcon, HeartIcon, SoundOffIcon, SoundOnIcon, StarIcon } from '../art/Icons';
import { CounterChip, IconButton } from './Button';
import { useGame } from '../state/GameContext';

/**
 * The persistent heads up display: currency, streak and the sound toggle.
 * It renders itself from the game state so screens only place it.
 */

interface HudProps {
  showStars?: boolean;
  showHearts?: boolean;
  compact?: boolean;
  rightSlot?: React.ReactNode;
}

export function Hud({ showStars = false, compact = false, rightSlot }: HudProps) {
  const { profile, updateSettings, totalStars } = useGame();
  const { coins, gems, streak } = profile;

  return (
    <View style={[styles.hud, compact ? styles.hudCompact : null]}>
      <View style={styles.hudLeft}>
        <CounterChip icon={<CoinIcon size={20} />} value={coins} />
        <CounterChip icon={<GemIcon size={19} />} value={gems} tint={colors.cardAlt} />
        {showStars ? <CounterChip icon={<StarIcon size={19} />} value={totalStars} tint={colors.cardAlt} /> : null}
        <CounterChip icon={<FlameIcon size={19} color={streak.count >= 3 ? colors.lava : colors.inkFaint} />} value={streak.count} tint={colors.cardAlt} />
      </View>
      <View style={styles.hudRight}>
        {rightSlot}
        <IconButton
          icon={profile.settings.sfx ? <SoundOnIcon size={22} /> : <SoundOffIcon size={22} />}
          onPress={() => updateSettings({ sfx: !profile.settings.sfx })}
          tint={colors.card}
          size={compact ? 40 : 46}
          accessibilityLabel={profile.settings.sfx ? 'Turn sound off' : 'Turn sound on'}
        />
      </View>
    </View>
  );
}

/** Hearts that pop and grey out when one is lost. */
export function HeartsRow({ hearts, max = 3, size = 30 }: { hearts: number; max?: number; size?: number }) {
  return (
    <View style={styles.heartsRow}>
      {Array.from({ length: max }, (_, index) => (
        <HeartSlot key={`heart-${index}`} alive={index < hearts} size={size} />
      ))}
    </View>
  );
}

function HeartSlot({ alive, size }: { alive: boolean; size: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const wasAlive = useRef(alive);

  useEffect(() => {
    if (wasAlive.current && !alive) {
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 130, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
    wasAlive.current = alive;
  }, [alive, pulse]);

  return (
    <Animated.View
      style={[
        styles.heartSlot,
        {
          opacity: alive ? 1 : 0.35,
          transform: [
            { scale: alive ? 1 : 0.82 },
            { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) },
            { rotate: pulse.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-14deg'] }) },
          ],
        },
      ]}
    >
      <HeartIcon size={size} color={alive ? colors.heart : colors.inkFaint} />
    </Animated.View>
  );
}

/** Combo counter that grows with the streak of correct answers. */
export function ComboMeter({ combo }: { combo: number }) {
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (combo <= 1) return;
    pop.setValue(1.35);
    Animated.timing(pop, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start();
  }, [combo, pop]);

  if (combo < 2) return null;

  return (
    <Animated.View style={[styles.combo, { transform: [{ scale: pop }] }]}>
      <Text style={styles.comboText}>{`COMBO x${combo}`}</Text>
    </Animated.View>
  );
}

export function SessionTopBar({ hearts, maxHearts, progress, combo }: { hearts: number; maxHearts: number; progress: number; combo: number }) {
  return (
    <View style={styles.sessionBar}>
      <View style={styles.sessionProgress}>
        <View style={styles.sessionTrack}>
          <Animated.View style={[styles.sessionFill, { width: `${Math.max(0.04, Math.min(1, progress)) * 100}%` }]} />
        </View>
      </View>
      <HeartsRow hearts={hearts} max={maxHearts} size={26} />
      <ComboMeter combo={combo} />
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, gap: spacing.sm },
  hudCompact: { paddingVertical: spacing.sm },
  hudLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, flexWrap: 'wrap' },
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heartsRow: { flexDirection: 'row', alignItems: 'center' },
  heartSlot: { marginRight: 6 },
  combo: { backgroundColor: colors.grape, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill, borderWidth: 2, borderColor: '#B39CFF', ...shadow(1) },
  comboText: { fontFamily: fonts.display, fontSize: 14, color: '#FFFFFF', letterSpacing: 0.6 },
  sessionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.sm },
  sessionProgress: { flex: 1 },
  sessionTrack: { height: 14, borderRadius: 7, backgroundColor: 'rgba(23,38,61,0.14)', overflow: 'hidden' },
  sessionFill: { height: '100%', backgroundColor: colors.jungle },
});
