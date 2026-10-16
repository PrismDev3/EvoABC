import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { colors, fonts, hitSlop, radii, shadow, spacing, type } from '../theme';
import { haptic } from '../lib/feedback';
import { playSfx } from '../audio/sfx';

/**
 * Big, squishy, obviously tappable buttons. Each one has a darker lip under
 * the face so it looks like something a six year old can press hard.
 */

export type ButtonTone = 'lava' | 'jungle' | 'grape' | 'gem' | 'amber' | 'bone' | 'danger';

const TONES: Record<ButtonTone, { face: string; lip: string; text: string; border: string }> = {
  lava: { face: colors.lava, lip: colors.lavaDark, text: '#FFFFFF', border: '#FF8A5C' },
  jungle: { face: colors.jungle, lip: colors.jungleDark, text: '#083A22', border: '#7BE495' },
  grape: { face: colors.grape, lip: colors.grapeDark, text: '#FFFFFF', border: '#B39CFF' },
  gem: { face: colors.gem, lip: colors.gemDark, text: '#053A4D', border: '#9BE7FF' },
  amber: { face: colors.amber, lip: colors.amberDark, text: '#4A3000', border: '#FFE07A' },
  bone: { face: colors.card, lip: colors.cardLine, text: colors.ink, border: colors.cardLine },
  danger: { face: colors.danger, lip: colors.dangerDark, text: '#FFFFFF', border: '#FF9AA0' },
};

export type ButtonSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ButtonSize, { height: number; pad: number; font: number; lip: number; radius: number }> = {
  sm: { height: 40, pad: 14, font: 15, lip: 3, radius: radii.md },
  md: { height: 54, pad: 20, font: 17, lip: 5, radius: radii.lg },
  lg: { height: 68, pad: 26, font: 22, lip: 6, radius: radii.xl },
};

interface ChunkyButtonProps {
  label: string;
  onPress?: () => void;
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  sound?: boolean;
  accessibilityLabel?: string;
}

export function ChunkyButton({
  label,
  onPress,
  tone = 'lava',
  size = 'lg',
  icon,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
  sound = true,
  accessibilityLabel,
}: ChunkyButtonProps) {
  const config = TONES[tone];
  const dims = SIZES[size];
  const press = useRef(new Animated.Value(0)).current;

  const animate = (to: number) => {
    Animated.timing(press, { toValue: to, duration: 90, useNativeDriver: true }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    if (sound) playSfx('tap');
    haptic('light');
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={[fullWidth ? styles.fullWidth : undefined, style]}
      hitSlop={hitSlop}
    >
      <View
        style={[
          styles.lip,
          {
            backgroundColor: config.lip,
            borderRadius: dims.radius,
            paddingBottom: dims.lip,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.face,
            {
              backgroundColor: config.face,
              borderColor: config.border,
              borderRadius: dims.radius - 2,
              height: dims.height,
              paddingHorizontal: dims.pad,
              opacity: disabled ? 0.55 : 1,
              transform: [
                { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, dims.lip] }) },
              ],
            },
            shadow(2),
          ]}
        >
          {icon !== undefined ? <View style={styles.icon}>{icon}</View> : null}
          <Text
            style={[
              {
                fontFamily: fonts.displayBold,
                fontSize: dims.font,
                lineHeight: dims.font + 6,
                color: config.text,
              },
              textStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

interface IconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  tint?: string;
  size?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export function IconButton({ icon, onPress, tint = colors.card, size = 46, style, accessibilityLabel, disabled = false }: IconButtonProps) {
  const press = useRef(new Animated.Value(0)).current;
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        playSfx('tap');
        haptic('light');
        onPress?.();
      }}
      onPressIn={() => Animated.timing(press, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
      onPressOut={() => Animated.timing(press, { toValue: 0, duration: 80, useNativeDriver: true }).start()}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'button'}
      hitSlop={hitSlop}
      style={style}
    >
      <Animated.View
        style={[
          styles.iconButton,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: tint, opacity: disabled ? 0.5 : 1 },
          shadow(1),
          { transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) }] },
        ]}
      >
        {icon}
      </Animated.View>
    </Pressable>
  );
}

interface PillButtonProps {
  label: string;
  onPress?: () => void;
  tone?: ButtonTone;
  icon?: React.ReactNode;
  selected?: boolean;
  style?: ViewStyle;
}

export function PillButton({ label, onPress, tone = 'bone', icon, selected = false, style }: PillButtonProps) {
  const config = TONES[tone];
  return (
    <Pressable
      onPress={() => {
        playSfx('tap');
        haptic('select');
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={hitSlop}
    >
      <View
        style={[
          styles.pill,
          {
            backgroundColor: selected ? config.face : colors.card,
            borderColor: selected ? config.lip : colors.cardLine,
          },
          selected ? shadow(1) : undefined,
          style,
        ]}
      >
        {icon !== undefined ? <View style={styles.pillIcon}>{icon}</View> : null}
        <Text
          style={{
            fontFamily: fonts.bodyBold,
            fontSize: 14,
            color: selected ? config.text : colors.inkSoft,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/** Small round token used for counter rows such as coins and gems. */
export function CounterChip({ icon, value, tint = colors.card, textColor = colors.ink }: { icon: React.ReactNode; value: string | number; tint?: string; textColor?: string }) {
  return (
    <View style={[styles.counter, { backgroundColor: tint }]}>
      {icon}
      <Text style={[styles.counterText, { color: textColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  lip: { width: '100%' },
  face: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  icon: { marginRight: spacing.sm },
  iconButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 2,
    minHeight: 38,
  },
  pillIcon: { marginRight: spacing.xs },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    gap: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
    ...shadow(1),
  },
  counterText: { fontFamily: fonts.displayMid, fontSize: 16, ...type.body },
});

export const buttonStyles = { TONES, SIZES };
