import { useEffect, useRef, useState } from 'react';
import { AppState, Image, View, Text, StyleSheet, LogBox, type AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, FredokaOne_400Regular } from '@expo-google-fonts/fredoka-one';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/authStore';
import { useParentalStore } from '../src/stores/parentalStore';
import { useReaderStore } from '../src/stores/readerStore';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { Colors, Fonts, FontSizes } from '../src/constants/theme';
import '../src/i18n';

// Keep the native splash visible until we explicitly hide it.
SplashScreen.preventAutoHideAsync();

// Supabase logs this internally before firing TOKEN_REFRESH_FAILED — the app
// already handles it by redirecting to login, so the log is noise.
LogBox.ignoreLogs(['Invalid Refresh Token', 'Refresh Token Not Found']);

// Custom loading screen shown while fonts load and auth is checked.
// Text only appears once fonts are ready to avoid a font-swap flash.
function AppLoadingScreen({ fontsReady }: { fontsReady: boolean }) {
  return (
    <View style={styles.loadingRoot}>
      <Image
        source={require('../assets/splash-icon.png')}
        style={styles.icon}
        resizeMode="contain"
      />
      {fontsReady && <Text style={styles.appName}>Livrux</Text>}
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading, setSession, fetchProfile, fetchFormula } = useAuthStore();
  const { lock } = useParentalStore();
  const { setSelectedReader } = useReaderStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [hasNavigated, setHasNavigated] = useState(false);

  const [fontsLoaded] = useFonts({
    FredokaOne_400Regular,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  // Hide the native splash immediately on mount so our AppLoadingScreen
  // takes over without the user ever seeing the old native splash image.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Lock parental state when the app goes to the background.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        lock();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  // Subscribe to Supabase auth state changes for the lifetime of the app.
  // We skip INITIAL_SESSION when the access token is already expired so the
  // loading screen stays visible while Supabase attempts a token refresh.
  // The follow-up TOKEN_REFRESHED or TOKEN_REFRESH_FAILED event will resolve
  // the final session state and redirect accordingly.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && session) {
        const isExpired = (session.expires_at ?? 0) * 1000 < Date.now();
        if (isExpired) return;
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user data whenever a session becomes available.
  // Also reset parental lock so no session starts with the PIN already unlocked.
  useEffect(() => {
    if (session) {
      lock();
      setSelectedReader(null);
      fetchProfile();
      fetchFormula();
    }
  }, [session?.user?.id]);

  // Route guard: redirect based on auth state once fonts and session are ready.
  // Setting hasNavigated=true dismisses AppLoadingScreen.
  useEffect(() => {
    if (!fontsLoaded || isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inAppGroup  = segments[0] === 'app';

    if (!session && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (session && !inAppGroup) {
      router.replace('/app');
    }

    setHasNavigated(true);
  }, [session, isLoading, fontsLoaded, segments]);

  // Show our branded screen for the entire pre-navigation period
  // (covers both font loading and auth check, regardless of order).
  if (!hasNavigated) {
    return (
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <StatusBar style="dark" backgroundColor={Colors.background} />
            <AppLoadingScreen fontsReady={fontsLoaded} />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="dark" backgroundColor={Colors.background} />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  icon: {
    width: 120,
    height: 120,
  },
  appName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    color: Colors.primary,
    letterSpacing: 0.5,
  },
});
