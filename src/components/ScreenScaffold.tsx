import React from 'react';
import { ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, gradients, radii, shadow, spacing, type } from '../theme';
import { BackIcon } from '../art/Icons';
import { IconButton } from './Button';

/**
 * Every screen sits on the same jungle sky so the app feels like one world.
 * Content is capped in width so an iPad shows a comfortable column instead of
 * a stretched phone layout.
 */

export const CONTENT_MAX_WIDTH = 640;

interface ScreenScaffoldProps {
  children: React.ReactNode;
  gradient?: readonly [string, string, ...string[]];
  scroll?: boolean;
  /**
   * Turn scrolling off while something inside is being dragged, so a finger
   * that is moving a letter tile cannot drag the page out from under it.
   */
  scrollEnabled?: boolean;
  padded?: boolean;
  contentStyle?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  hills?: boolean;
}

export function ScreenScaffold({
  children,
  gradient = gradients.sky,
  scroll = false,
  scrollEnabled = true,
  padded = true,
  contentStyle,
  edges = ['top', 'bottom'],
  hills = true,
}: ScreenScaffoldProps) {
  const body = (
    <View style={[styles.content, padded ? styles.padded : null, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} />
      {hills ? <Hills /> : null}
      <SafeAreaView style={styles.safe} edges={edges}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
            bounces
            keyboardShouldPersistTaps="handled"
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </SafeAreaView>
    </View>
  );
}

function Hills() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.cloud, { top: 70, left: -30, width: 150, height: 54 }]} />
      <View style={[styles.cloud, { top: 130, right: -20, width: 190, height: 62, opacity: 0.75 }]} />
      <View style={[styles.cloud, { top: 250, left: 60, width: 110, height: 42, opacity: 0.6 }]} />
      <View style={[styles.hillBack, { backgroundColor: colors.leaf }]} />
      <View style={[styles.hillFront, { backgroundColor: colors.jungle }]} />
    </View>
  );
}

interface ScreenHeaderProps {
  title: string;
  /** Plain text gets the body type style; a node is drawn as it comes, for rows with an icon. */
  subtitle?: React.ReactNode;
  onBack?: () => void;
  right?: React.ReactNode;
  compact?: boolean;
}

export function ScreenHeader({ title, subtitle, onBack, right, compact = false }: ScreenHeaderProps) {
  return (
    <View style={[styles.header, compact ? styles.headerCompact : null]}>
      <View style={styles.headerLeft}>
        {onBack !== undefined ? <IconButton icon={<BackIcon size={24} color={colors.ink} />} onPress={onBack} tint={colors.card} /> : null}
        <View style={styles.headerText}>
          <Text style={type.h1} numberOfLines={1}>
            {title}
          </Text>
          {typeof subtitle === 'string' ? (
            <Text style={type.body} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : subtitle !== undefined ? (
            <View style={styles.headerSubtitle}>{subtitle}</View>
          ) : null}
        </View>
      </View>
      {right !== undefined ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.skyLow, overflow: 'hidden' },
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
  content: { flex: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  padded: { paddingHorizontal: spacing.lg },
  cloud: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 999, opacity: 0.85 },
  hillBack: { position: 'absolute', bottom: -110, left: -80, right: -80, height: 210, borderTopLeftRadius: 260, borderTopRightRadius: 260, opacity: 0.45 },
  hillFront: { position: 'absolute', bottom: -150, left: -60, right: -60, height: 230, borderTopLeftRadius: 300, borderTopRightRadius: 300, opacity: 0.35 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, gap: spacing.md },
  headerCompact: { paddingVertical: spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  headerText: { flex: 1 },
  headerSubtitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

export const containerStyles = { CONTENT_MAX_WIDTH, shadow, radii };
