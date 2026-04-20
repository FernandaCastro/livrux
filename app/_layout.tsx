import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
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
import '../src/i18n'; // initialize i18n before any component renders

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading, setSession, fetchProfile, fetchFormula } = useAuthStore();
  const { lock } = useParentalStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const [fontsLoaded] = useFonts({
    FredokaOne_400Regular,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

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
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user data whenever a session becomes available.
  useEffect(() => {
    if (session) {
      fetchProfile();
      fetchFormula();
    }
  }, [session?.user?.id]);

  // Route guard: redirect based on auth state once fonts and session are ready.
  useEffect(() => {
    if (!fontsLoaded || isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inAppGroup  = segments[0] === 'app';

    if (!session && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (session && !inAppGroup) {
      router.replace('/app');
    }
  }, [session, isLoading, fontsLoaded, segments]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  if (!fontsLoaded || isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#FAFAF7" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
