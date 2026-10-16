import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients, radii, shadow, spacing, type } from '../theme';
import { ChunkyButton, ButtonTone } from './Button';
import { Confetti, PopIn } from '../art/Effects';

/** Celebration overlay used for rewards, hatches, encouragement and level ups. */

export interface ModalAction {
  label: string;
  tone?: ButtonTone;
  onPress: () => void;
}

interface GameModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  badge?: string;
  gradient?: readonly [string, string, ...string[]];
  mascot?: React.ReactNode;
  children?: React.ReactNode;
  actions?: ModalAction[];
  confetti?: boolean;
  onDismiss?: () => void;
  dismissible?: boolean;
}

export function GameModal({
  visible,
  title,
  message,
  badge,
  gradient = gradients.bone,
  mascot,
  children,
  actions = [],
  confetti = false,
  onDismiss,
  dismissible = true,
}: GameModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => (dismissible ? onDismiss?.() : undefined)} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Confetti run={confetti && visible} />
        </View>
        <PopIn style={styles.cardWrap} from={0.7}>
          <LinearGradient colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.card, shadow(3)]}>
            {badge !== undefined ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
            {mascot !== undefined ? <View style={styles.mascot}>{mascot}</View> : null}
            {title !== undefined ? (
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
            ) : null}
            {message !== undefined ? <Text style={styles.message}>{message}</Text> : null}
            {children}
            {actions.length > 0 ? (
              <View style={styles.actions}>
                {actions.map((action) => (
                  <ChunkyButton key={action.label} label={action.label} tone={action.tone ?? 'lava'} onPress={action.onPress} size="md" />
                ))}
              </View>
            ) : null}
          </LinearGradient>
        </PopIn>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  cardWrap: { width: '100%', maxWidth: 420 },
  card: { borderRadius: radii.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)', gap: spacing.sm },
  badge: { backgroundColor: 'rgba(23,38,61,0.08)', paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radii.pill },
  badgeText: { ...type.label, color: colors.inkSoft },
  mascot: { marginBottom: spacing.xs },
  title: { ...type.h1, textAlign: 'center' },
  message: { ...type.body, textAlign: 'center' },
  actions: { width: '100%', gap: spacing.sm, marginTop: spacing.md },
});
