/**
 * Root. Spec §19 — no bottom navigation, so screens are a simple state machine
 * rather than a router. The phone-width frame keeps the layout honest on
 * tablets and on web previews.
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Wordmark, StudioMark } from './src/ui/components/Wordmark';
import { GameScreen } from './src/ui/screens/GameScreen';
import { HomeScreen } from './src/ui/screens/HomeScreen';
import { LevelsScreen } from './src/ui/screens/LevelsScreen';
import { AboutScreen, SettingsScreen } from './src/ui/screens/SettingsScreen';
import { CompleteSheet, DailyDoneScreen, FailSheet } from './src/ui/screens/overlays';
import { colors, layout } from './src/ui/theme';
import { useAppState } from './src/ui/useAppState';

export default function App() {
  const app = useAppState();

  // Splash holds for a beat, then hands over to Home.
  useEffect(() => {
    if (!app.ready || app.screen !== 'splash') return;
    const timer = setTimeout(() => app.setScreen('home'), 1400);
    return () => clearTimeout(timer);
  }, [app]);

  return (
    <SafeAreaProvider>
      <StatusBar style={app.screen === 'splash' ? 'light' : 'dark'} />
      <View style={styles.outer}>
        <SafeAreaView style={styles.frame}>
          {app.screen === 'splash' ? (
            <Splash />
          ) : (
            <>
              {app.screen === 'home' ? <HomeScreen app={app} /> : null}
              {app.screen === 'game' ? <GameScreen app={app} /> : null}
              {app.screen === 'levels' ? <LevelsScreen app={app} /> : null}
              {app.screen === 'settings' ? <SettingsScreen app={app} /> : null}
              {app.screen === 'about' ? <AboutScreen app={app} /> : null}
              {app.screen === 'dailyDone' ? <DailyDoneScreen app={app} /> : null}

              <CompleteSheet app={app} />
              <FailSheet app={app} />
            </>
          )}
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

function Splash() {
  return (
    <View style={styles.splash}>
      <View style={styles.splashMark}>
        <Wordmark size={54} dark />
      </View>
      <StudioMark dark />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.outerBg, alignItems: 'center' },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: layout.screenMaxWidth,
    backgroundColor: colors.bg,
  },
  splash: { ...StyleSheet.absoluteFill, backgroundColor: colors.on, padding: 24 },
  splashMark: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
