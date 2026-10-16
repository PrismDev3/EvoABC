import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors, fonts, radii, shadow } from '../theme';

/**
 * Juice. Confetti, shakes and pops are what turn a spelling drill into
 * something a six year old wants to do again tomorrow.
 */

const CONFETTI_COLORS = [colors.lava, colors.amber, colors.jungle, colors.grape, colors.gem, colors.heart, '#FFFFFF'];

export function Confetti({ run, count = 46, travel = 620 }: { run: boolean; count?: number; travel?: number }) {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        key: `piece-${index}`,
        left: Math.random() * width,
        delay: Math.random() * 0.32,
        drift: (Math.random() - 0.5) * 90,
        size: 7 + Math.random() * 9,
        spin: 220 + Math.random() * 520,
        flip: Math.random() > 0.5 ? 1 : -1,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length] ?? colors.amber,
      })),
    [count, width],
  );

  useEffect(() => {
    if (!run) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }).start();
  }, [progress, run]);

  if (!run) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece) => (
        <Animated.View
          key={piece.key}
          style={[
            styles.confetti,
            {
              left: piece.left,
              width: piece.size,
              height: piece.size * 0.62,
              backgroundColor: piece.color,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [piece.delay, 1],
                    outputRange: [-40, travel],
                    extrapolate: 'clamp',
                  }),
                },
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, piece.drift],
                  }),
                },
                {
                  rotate: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${piece.spin * piece.flip}deg`],
                  }),
                },
              ],
              opacity: progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Wraps content and gives it a physical kick when `trigger` changes. */
export function ScreenShake({ trigger, children, intensity = 10 }: { trigger: number; children: React.ReactNode; intensity?: number }) {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger <= 0) return;
    offset.setValue(0);
    Animated.sequence([
      Animated.timing(offset, { toValue: intensity, duration: 45, useNativeDriver: true }),
      Animated.timing(offset, { toValue: -intensity, duration: 45, useNativeDriver: true }),
      Animated.timing(offset, { toValue: intensity * 0.6, duration: 45, useNativeDriver: true }),
      Animated.timing(offset, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [intensity, offset, trigger]);

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX: offset }, { rotate: offset.interpolate({ inputRange: [-intensity, intensity], outputRange: ['-1.2deg', '1.2deg'] }) }] }}>
      {children}
    </Animated.View>
  );
}

/** Scale in from small with a springy overshoot. */
export function PopIn({ children, delay = 0, from = 0.6, style }: { children: React.ReactNode; delay?: number; from?: number; style?: object }) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(value, {
      toValue: 1,
      duration: 260,
      delay,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start();
  }, [delay, value]);

  return (
    <Animated.View style={[style, { opacity: value, transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Endless gentle bob used by mascots. */
export function Bobbing({ children, amount = 6, duration = 1800, style }: { children: React.ReactNode; amount?: number; duration?: number; style?: object }) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [duration, value]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -amount] }) },
            { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A reward that floats up out of the spot the player just tapped. */
export function FloatingReward({ trigger, label, tint = colors.amber }: { trigger: number; label: string; tint?: string }) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger <= 0) return;
    value.setValue(0);
    Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: 820, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [trigger, value]);

  if (trigger <= 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floating,
        {
          opacity: value,
          transform: [
            { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -78] }) },
            { scale: value.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.5, 1.15, 1] }) },
          ],
        },
      ]}
    >
      <View style={[styles.floatingPill, { backgroundColor: tint, ...shadow(2) }]}>
        <Text style={styles.floatingText}>{label}</Text>
      </View>
    </Animated.View>
  );
}

/** Ring of sparkles that fires on a big combo. */
export function SparkleRing({ trigger, count = 10, tint = colors.amber }: { trigger: number; count?: number; tint?: string }) {
  const value = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (trigger <= 0) return;
    value.setValue(0);
    Animated.timing(value, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [trigger, value]);

  const sparkles = useMemo(() => Array.from({ length: count }, (_, index) => (index / count) * Math.PI * 2), [count]);

  if (trigger <= 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {sparkles.map((angle, index) => (
        <Animated.View
          key={`sparkle-${index}`}
          style={[
            styles.sparkle,
            {
              backgroundColor: tint,
              opacity: value.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 90] }) },
                { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 90] }) },
                { scale: value.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.2, 1, 0.4] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Big friendly burst shown when a dinosaur evolves. */
export function EvolveBurst({ run, tint = colors.grape }: { run: boolean; tint?: string }) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!run) return;
    value.setValue(0);
    Animated.loop(
      Animated.timing(value, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ).start();
  }, [run, value]);

  if (!run) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[0, 1, 2].map((ring) => (
        <Animated.View
          key={`ring-${ring}`}
          style={[
            styles.ring,
            {
              borderColor: tint,
              opacity: value.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.5, 0] }),
              transform: [
                { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.2 + ring * 0.18, 1.5 + ring * 0.3] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  confetti: { position: 'absolute', top: -20, borderRadius: 3 },
  floating: { position: 'absolute', top: '40%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  floatingPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.pill },
  floatingText: { fontFamily: fonts.display, fontSize: 22, color: '#FFFFFF' },
  sparkle: { position: 'absolute', top: '50%', left: '50%', width: 12, height: 12, borderRadius: 6 },
  ring: { position: 'absolute', alignSelf: 'center', top: '28%', width: 160, height: 160, borderRadius: 80, borderWidth: 6 },
});
