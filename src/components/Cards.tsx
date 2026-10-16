import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, radii, shadow, spacing, type } from '../theme';
import { StarIcon } from '../art/Icons';
import { haptic } from '../lib/feedback';
import { playSfx } from '../audio/sfx';

/** White rounded card used for basically everything. */
export function Panel({
  children,
  style,
  onPress,
  tone = 'card',
  padded = true,
  borderColor,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  tone?: 'card' | 'alt' | 'glass';
  padded?: boolean;
  borderColor?: string;
  accessibilityLabel?: string;
}) {
  const background = tone === 'card' ? colors.card : tone === 'alt' ? colors.cardAlt : 'rgba(255,255,255,0.86)';
  const content = (
    <View
      style={[
        styles.panel,
        { backgroundColor: background, borderColor: borderColor ?? colors.cardLine },
        padded ? styles.panelPadded : undefined,
        shadow(1),
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress === undefined) return content;

  return (
    <Pressable
      onPress={() => {
        playSfx('tap');
        haptic('light');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'card'}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {content}
    </Pressable>
  );
}

export function Badge({ label, color = colors.grape, textColor = '#FFFFFF', icon }: { label: string; color?: string; textColor?: string; icon?: React.ReactNode }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      {icon !== undefined ? <View style={styles.badgeIcon}>{icon}</View> : null}
      <Text style={[styles.badgeText, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Small stacked stat used on the profile and result cards. */
export function StatPill({ icon, value, label, tint = colors.cardAlt }: { icon: React.ReactNode; value: string | number; label: string; tint?: string }) {
  return (
    <View style={[styles.statPill, { backgroundColor: tint }]}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({
  value,
  max,
  gradient = ['#FFE07A', '#FFC531'],
  height = 16,
  showLabel = false,
  label,
}: {
  value: number;
  max: number;
  gradient?: readonly [string, string, ...string[]];
  height?: number;
  showLabel?: boolean;
  label?: string;
}) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${ratio * 100}%`, borderRadius: height / 2 }]}
        />
      </View>
      {showLabel ? (
        <Text style={styles.progressLabel}>
          {label ?? `${Math.round(ratio * 100)}%`}
        </Text>
      ) : null}
    </View>
  );
}

export function StarRow({ count, total = 3, size = 22, dim = colors.locked }: { count: number; total?: number; size?: number; dim?: string }) {
  return (
    <View style={styles.starRow}>
      {Array.from({ length: total }, (_, index) => (
        <View key={`star-${index}`} style={styles.starSlot}>
          <StarIcon size={size} color={index < count ? colors.amber : dim} />
        </View>
      ))}
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

export function InfoRow({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={type.bodyBold}>{label}</Text>
      <Text style={[type.body, tint !== undefined ? { color: tint, fontFamily: fonts.bodyBold } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radii.lg, borderWidth: 2 },
  panelPadded: { padding: spacing.lg },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill },
  badgeIcon: { marginRight: 5 },
  badgeText: { fontFamily: fonts.bodyBlack, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  statPill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: radii.lg, borderWidth: 2, borderColor: colors.cardLine, gap: 2 },
  statValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  progressWrap: { gap: 4 },
  progressTrack: { backgroundColor: 'rgba(23,38,61,0.12)', overflow: 'hidden', width: '100%' },
  progressFill: { height: '100%' },
  progressLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft, alignSelf: 'flex-end' },
  starRow: { flexDirection: 'row', alignItems: 'center' },
  starSlot: { marginRight: 3 },
  divider: { height: 2, backgroundColor: colors.cardLine, borderRadius: 1, marginVertical: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, gap: spacing.md },
});
