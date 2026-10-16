import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts as useBalooFonts } from 'expo-font';
// Only the seven weights the theme actually uses are imported, so the app
// does not ship every weight of both families.
// One pack at a time: the package index would pull in every icon font it
// ships, which is about five megabytes of fonts this app never draws.
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Baloo2_600SemiBold } from '@expo-google-fonts/baloo-2/600SemiBold';
import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2/700Bold';
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2/800ExtraBold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';

import { GameProvider, useGame } from './src/state/GameContext';
import { Navigator } from './src/navigation/Navigator';
import { ScreenName } from './src/types';
import { colors, fonts, spacing } from './src/theme';
import { Dino } from './src/art/Dino';
import { Bobbing } from './src/art/Effects';
import { skinById } from './src/data/dinosaurs';

import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import PlayScreen from './src/screens/PlayScreen';
import ResultScreen from './src/screens/ResultScreen';
import EggsScreen from './src/screens/EggsScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import StreakScreen from './src/screens/StreakScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TestScreen from './src/screens/TestScreen';
import TestSessionScreen from './src/screens/TestSessionScreen';

SplashScreen.preventAutoHideAsync().catch(() => {
  // already hidden
});

const SCREENS: Record<ScreenName, React.ComponentType> = {
  onboarding: OnboardingScreen,
  home: HomeScreen,
  map: MapScreen,
  play: PlayScreen,
  result: ResultScreen,
  eggs: EggsScreen,
  collection: CollectionScreen,
  streak: StreakScreen,
  settings: SettingsScreen,
  test: TestScreen,
  testSession: TestSessionScreen,
};

/** First paint while the save file and fonts are still loading. */
function BootSplash() {
  return (
    <View style={styles.boot}>
      <Bobbing amount={10}>
        <Dino skin={skinById('rex_verdant')} stageIndex={2} size={190} />
      </Bobbing>
      <Text style={styles.bootTitle}>EvoABC</Text>
      <Text style={styles.bootLine}>Spell words. Evolve monsters.</Text>
      <View style={styles.bootDots}>
        {[0, 1, 2].map((dot) => (
          <View key={`dot-${dot}`} style={[styles.bootDot, dot === 1 ? styles.bootDotTall : null]} />
        ))}
      </View>
    </View>
  );
}

function Shell() {
  const { ready, profile } = useGame();
  // The picture cue icons are fonts too, and an unloaded icon draws nothing.
  // Waiting for them behind the splash screen means the first word card already
  // has its picture instead of a blank plate on the first frame.
  const [loaded] = useBalooFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    ...MaterialCommunityIcons.font,
    ...FontAwesome6.font,
  });

  const hideSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {
      // nothing to hide
    });
  }, []);

  useEffect(() => {
    if (ready && loaded) hideSplash();
  }, [hideSplash, loaded, ready]);

  if (!ready || !loaded) {
    return <BootSplash />;
  }

  return <Navigator initial={profile.onboarded ? 'home' : 'onboarding'} screens={SCREENS} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <StatusBar style="dark" />
        <Shell />
      </GameProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: '#A7E7FF', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  bootTitle: { fontFamily: fonts.display, fontSize: 34, color: colors.ink, marginTop: spacing.lg },
  bootLine: { fontFamily: fonts.body, fontSize: 16, color: colors.inkSoft, textAlign: 'center' },
  bootDots: { flexDirection: 'row', gap: 8, marginTop: spacing.xl, alignItems: 'flex-end', height: 22 },
  bootDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.grape },
  bootDotTall: { height: 22, borderRadius: 5 },
});
