import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, radii, shadow, spacing, type } from '../theme';
import { SoundOnIcon } from '../art/Icons';
import { CueIcon } from '../art/CueIcon';
import { haptic } from '../lib/feedback';
import { playSfx } from '../audio/sfx';

/** Letter tiles and the slot board used by all three spelling modes. */

export type TileState = 'idle' | 'placed' | 'correct' | 'wrong' | 'ghost';

const TILE_TONES: Record<TileState, { face: string; lip: string; border: string; text: string }> = {
  idle: { face: colors.card, lip: '#C9D9EA', border: '#E4EFFA', text: colors.ink },
  placed: { face: '#FFF6DC', lip: colors.amberDark, border: colors.amber, text: colors.ink },
  correct: { face: colors.success, lip: colors.successDark, border: '#8BEFB6', text: '#FFFFFF' },
  wrong: { face: colors.danger, lip: colors.dangerDark, border: '#FFA3A6', text: '#FFFFFF' },
  ghost: { face: 'rgba(255,255,255,0.55)', lip: 'rgba(23,38,61,0.10)', border: 'rgba(23,38,61,0.10)', text: colors.inkFaint },
};

interface LetterTileProps {
  letter: string;
  onPress?: () => void;
  state?: TileState;
  size?: number;
  disabled?: boolean;
  style?: ViewStyle;
  dim?: boolean;
}

export function LetterTile({ letter, onPress, state = 'idle', size = 58, disabled = false, style, dim = false }: LetterTileProps) {
  const tone = TILE_TONES[state];
  const press = useRef(new Animated.Value(0)).current;
  const lip = Math.max(3, size * 0.09);

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        playSfx('tap');
        haptic('light');
        onPress?.();
      }}
      onPressIn={() => Animated.timing(press, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
      onPressOut={() => Animated.timing(press, { toValue: 0, duration: 90, useNativeDriver: true }).start()}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Letter ${letter}`}
      style={style}
    >
      <View style={[styles.tileLip, { backgroundColor: tone.lip, borderRadius: size * 0.24, paddingBottom: lip }]}>
        <Animated.View
          style={[
            styles.tileFace,
            {
              width: size,
              height: size,
              backgroundColor: tone.face,
              borderColor: tone.border,
              borderRadius: size * 0.22,
              opacity: dim ? 0.45 : 1,
              transform: [{ translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, lip] }) }],
            },
            shadow(1),
          ]}
        >
          <Text style={[styles.tileLetter, { fontSize: size * 0.52, lineHeight: size * 0.62, color: tone.text }]}>{letter}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

interface WordSlotsProps {
  total: number;
  filled: (string | null)[];
  onPressSlot?: (index: number) => void;
  size?: number;
  activeIndex?: number;
  highlightIndex?: number;
  state?: TileState;
}

/** The row of blank spaces a word gets written into. */
export function WordSlots({ total, filled, onPressSlot, size = 62, activeIndex = -1, highlightIndex = -1, state = 'ghost' }: WordSlotsProps) {
  return (
    <View style={styles.slotsRow}>
      {Array.from({ length: total }, (_, index) => {
        const value = filled[index] ?? null;
        const isActive = index === activeIndex;
        const tone: TileState = value !== null ? 'placed' : isActive ? 'idle' : state;
        const tileState: TileState = index === highlightIndex ? (value === null ? 'wrong' : 'correct') : tone;
        return (
          <View key={`slot-${index}`} style={styles.slotWrap}>
            <SlotTile
              letter={value ?? ''}
              size={size}
              state={tileState}
              active={isActive}
              onPress={onPressSlot === undefined || value === null ? undefined : () => onPressSlot(index)}
            />
            <View style={[styles.slotBase, { width: size * 0.86, backgroundColor: value === null ? 'rgba(23,38,61,0.18)' : colors.jungle }]} />
          </View>
        );
      })}
    </View>
  );
}

function SlotTile({ letter, size, state, active, onPress }: { letter: string; size: number; state: TileState; active: boolean; onPress?: () => void }) {
  const tone = TILE_TONES[state];
  const pop = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (letter === '') return;
    pop.setValue(1.18);
    Animated.timing(pop, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [letter, pop]);

  return (
    <Pressable onPress={onPress} disabled={onPress === undefined} accessibilityRole={onPress !== undefined ? 'button' : 'image'} accessibilityLabel={letter === '' ? 'empty letter space' : `letter ${letter}`}>
      <Animated.View
        style={[
          styles.slotTile,
          {
            width: size,
            height: size,
            borderRadius: size * 0.22,
            backgroundColor: tone.face,
            borderColor: active ? colors.amber : tone.border,
            borderWidth: active ? 3 : 2,
            transform: [{ scale: pop }],
          },
        ]}
      >
        <Text style={[styles.tileLetter, { fontSize: size * 0.52, lineHeight: size * 0.6, color: tone.text }]}>{letter}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Round button that reads the word out loud. */
export function SpeakerButton({ onPress, label = 'Hear it again', tint = colors.gem, size = 52 }: { onPress: () => void; label?: string; tint?: string; size?: number }) {
  return (
    <Pressable
      onPress={() => {
        playSfx('tap');
        haptic('light');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.speakerRow}
    >
      <View style={[styles.speakerCircle, { backgroundColor: tint, width: size, height: size, borderRadius: size / 2 }, shadow(1)]}>
        <SoundOnIcon size={size * 0.5} color="#053A4D" />
      </View>
      <Text style={type.bodyBold}>{label}</Text>
    </Pressable>
  );
}

/** Big friendly illustration card for the word being spelled. */
export function PictureCue({
  cue,
  hint,
  tint = colors.cardAlt,
  size = 130,
  reveal,
  fallback,
}: {
  cue: string;
  hint: string;
  tint?: string;
  size?: number;
  reveal?: boolean;
  fallback?: string;
}) {
  return (
    <View style={styles.cueWrap}>
      <LinearGradient colors={[tint, '#FFFFFF']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.cueCard, { width: size, height: size, borderRadius: size * 0.28 }, shadow(1)]}>
        <CueIcon cue={cue} size={size - 22} fallback={fallback ?? hint} />
        {reveal === true ? <View style={styles.cueTick} /> : null}
      </LinearGradient>
      <Text style={[type.body, styles.cueHint]} numberOfLines={3}>
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tileLip: { paddingHorizontal: 0 },
  tileFace: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  tileLetter: { fontFamily: fonts.display, textAlign: 'center' },
  slotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', flexWrap: 'wrap', gap: 6 },
  slotWrap: { alignItems: 'center' },
  slotTile: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  slotBase: { height: 5, borderRadius: 3, marginTop: 3 },
  speakerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  speakerCircle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  cueWrap: { alignItems: 'center', gap: spacing.sm },
  cueCard: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.cardLine },
  cueLetter: { fontFamily: fonts.display, color: colors.inkFaint },
  cueTick: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.success },
  cueHint: { textAlign: 'center', paddingHorizontal: spacing.md },
});

export const tileTones = TILE_TONES;
export { radii as tileRadii };
