import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, radii, shadow, spacing, type } from '../theme';
import { Badge } from './Cards';
import { SparkleIcon, SoundOnIcon } from '../art/Icons';
import { Pattern } from '../game/phonics';
import { haptic } from '../lib/feedback';
import { playSfx } from '../audio/sfx';

/**
 * The teaching card. It shows the pattern a child is about to practise and,
 * when it is handed a word, colours the letters that carry the sound and dims
 * the letters that stay quiet. That highlight is the whole lesson.
 */

export interface RuleCardProps {
  title: string;
  text: string;
  examples?: string[];
  focusPair?: string;
  tint?: string;
  gradient?: readonly [string, string, ...string[]];
  onSpeak?: () => void;
  /** When given, the card also teaches this individual word. */
  word?: string;
  pattern?: Pattern | null;
  style?: ViewStyle;
}

const SILENT_INDEXES = (pattern: Pattern | null | undefined): number[] => pattern?.silent ?? [];
const FOCUS_INDEXES = (pattern: Pattern | null | undefined): number[] => pattern?.focus ?? [];

export function WordLetters({
  word,
  pattern,
  size = 40,
  dim = false,
}: {
  word: string;
  pattern?: Pattern | null;
  size?: number;
  dim?: boolean;
}) {
  const focus = new Set(FOCUS_INDEXES(pattern));
  const silent = new Set(SILENT_INDEXES(pattern));
  const letters = word.toUpperCase().split('');

  return (
    <View style={styles.lettersRow}>
      {letters.map((letter, index) => {
        const isSilent = silent.has(index);
        const isFocus = focus.has(index);
        return (
          <View key={`${letter}-${index}`} style={styles.letterSlot}>
            <Text
              style={[
                styles.letter,
                {
                  fontSize: size,
                  lineHeight: size * 1.18,
                  color: isSilent ? colors.inkFaint : isFocus ? colors.grapeDark : colors.ink,
                  opacity: dim ? 0.5 : 1,
                },
              ]}
            >
              {letter}
            </Text>
            {isSilent ? <View style={[styles.strike, { width: size * 0.62, top: size * 0.58 }]} /> : null}
            {isFocus ? <View style={[styles.focusBar, { width: size * 0.66, backgroundColor: colors.grape }]} /> : null}
          </View>
        );
      })}
    </View>
  );
}

export function RuleCard({
  title,
  text,
  examples = [],
  focusPair,
  tint = colors.grape,
  gradient,
  onSpeak,
  word,
  pattern,
  style,
}: RuleCardProps) {
  const body = (
    <View style={[styles.card, style]}>
      <View style={styles.head}>
        <View style={[styles.iconWrap, { backgroundColor: `${tint}22` }]}>
          <SparkleIcon size={18} color={tint} />
        </View>
        <Text style={[type.h3, styles.title]} numberOfLines={2}>
          {title}
        </Text>
        {focusPair !== undefined ? <Badge label={focusPair} color={tint} /> : null}
      </View>

      {word !== undefined && word.length > 0 ? (
        <View style={styles.wordRow}>
          <WordLetters word={word} pattern={pattern} size={38} />
        </View>
      ) : null}

      <Text style={[type.body, styles.text]}>{text}</Text>

      {examples.length > 0 ? (
        <View style={styles.examples}>
          {examples.slice(0, 4).map((example) => (
            <View key={example} style={styles.exampleChip}>
              <Text style={styles.exampleText}>{example.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {onSpeak !== undefined ? (
        <Pressable
          onPress={() => {
            playSfx('tap');
            haptic('light');
            onSpeak();
          }}
          accessibilityRole="button"
          accessibilityLabel="Hear the rule again"
          style={styles.speakRow}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.speakCircle, { backgroundColor: tint }]}>
            <SoundOnIcon size={18} color="#FFFFFF" />
          </View>
          <Text style={[type.bodyBold, { color: tint }]}>Hear it again</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (gradient === undefined) {
    return <View style={[styles.shell, shadow(1)]}>{body}</View>;
  }

  return (
    <LinearGradient colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.shell, shadow(1)]}>
      {body}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: radii.lg, borderWidth: 2, borderColor: colors.cardLine, backgroundColor: colors.card, overflow: 'hidden' },
  card: { padding: spacing.lg, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  iconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  title: { flexShrink: 1 },
  text: { color: colors.inkSoft },
  wordRow: { alignItems: 'center', paddingVertical: spacing.xs },
  lettersRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', flexWrap: 'wrap' },
  letterSlot: { alignItems: 'center', marginHorizontal: 1 },
  letter: { fontFamily: fonts.display, textAlign: 'center' },
  strike: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: colors.inkFaint },
  focusBar: { height: 5, borderRadius: 3, marginTop: 2 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  exampleChip: { backgroundColor: colors.cardAlt, borderWidth: 2, borderColor: colors.cardLine, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
  exampleText: { fontFamily: fonts.bodyBlack, fontSize: 12, color: colors.inkSoft, letterSpacing: 0.6 },
  speakRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  speakCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
