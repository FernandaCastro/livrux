import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, AppState, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useBadges } from '../../../src/hooks/useBadges';
import { useReaderStore } from '../../../src/stores/readerStore';
import { useTheme } from '../../../src/hooks/useTheme';
import { FloatingEmojis } from '../../../src/components/FloatingEmojis';
import { BadgeCard } from '../../../src/components/BadgeCard';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Fonts, FontSizes, Spacing, Radius, Shadows, createShadows, type ColorPalette } from '../../../src/constants/theme';
import { BackButton } from '../../../src/components/BackButton';

function createStyles(theme: ColorPalette) {
  const S = createShadows(theme.shadowColor);
  return StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1, backgroundColor: 'transparent' },
    heroBanner: {
      borderRadius: Radius.xl,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.xs,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xl,
      ...S.lg,
    },
    heroContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginTop: Spacing['2xl'],
      marginBottom: Spacing.md,
    },
    heroBannerEmoji: { fontSize: 56 },
    heroRight: { flex: 1, justifyContent: 'center' },
    heroTitle: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes['2xl'],
      color: theme.textOnPrimary,
    },
    heroSubtitle: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.sm,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    statsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignSelf: 'stretch',
    },
    statChip: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    statChipText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.sm,
      color: theme.textOnPrimary,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingBottom: BOTTOM_MENU_HEIGHT + Spacing['2xl'],
      paddingTop: Spacing.sm,
    },
    sectionLabel: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.sm,
      color: '#C2410C',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: Spacing.md,
      marginTop: Spacing.sm,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
      marginBottom: Spacing.xl,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing['2xl'],
    },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
    emptyText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.md,
      color: theme.textPrimary,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    emptySubtext: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.sm,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
}

export default function BadgesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedReader } = useReaderStore();
  const { earnedBadges, pendingBadges, isLoading, error, refresh } = useBadges(selectedReader?.id ?? null);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const appStateRef = useRef(AppState.currentState);

  const swipeNav = Gesture.Pan()
    .runOnJS(true)
    .onEnd((e) => {
      const isHorizontal = Math.abs(e.translationX) > Math.abs(e.translationY) * 2;
      if (!isHorizontal) return;
      if (e.translationX > 80) {
        router.back();
      } else if (e.translationX < -80) {
        router.push('/app/rewards');
      }
    });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') refresh();
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  const bgGradient = (
    <LinearGradient
      colors={theme.backgroundGradient}
      locations={[0, 0.6, 1]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar style={theme.statusBarStyle} backgroundColor={theme.background} />
        {bgGradient}
        <SafeAreaView style={styles.safe}>
          <ActivityIndicator color={theme.secondary} style={{ flex: 1 }} />
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <StatusBar style={theme.statusBarStyle} backgroundColor={theme.background} />
        {bgGradient}
        <SafeAreaView style={styles.safe}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyText}>{t('common.error')}</Text>
            <Text style={styles.emptySubtext}>{error}</Text>
          </View>
          <BottomMenu />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <GestureDetector gesture={swipeNav}>
    <View style={styles.root}>
      <Stack.Screen options={{ animation: 'none' }} />
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.background} />
      {bgGradient}
      <FloatingEmojis />
      <SafeAreaView style={styles.safe}>
        <BackButton style={{ paddingHorizontal: Spacing.xl }} />
        {/* Orange/bronze hero — fixed badge accent */}
        <LinearGradient
          colors={['#FF7F3E', '#C2410C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroBannerEmoji}>🏅</Text>
            <View style={styles.heroRight}>
              <Text style={styles.heroTitle}>{t('badges.title')}</Text>
              {selectedReader && (
                <Text style={styles.heroSubtitle}>{selectedReader.name}</Text>
              )}
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipText}>🏆 {earnedBadges.length} {t('badges.earned')}</Text>
            </View>
            {pendingBadges.length > 0 && (
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>🔒 {pendingBadges.length} {t('badges.pending')}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {earnedBadges.length === 0 && pendingBadges.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏅</Text>
              <Text style={styles.emptyText}>{t('badges.empty')}</Text>
            </View>
          )}
          {earnedBadges.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('badges.earned')}</Text>
              <View style={styles.grid}>
                {earnedBadges.map((badge) => (
                  <BadgeCard key={badge.slug} badge={badge} />
                ))}
              </View>
            </>
          )}
          {pendingBadges.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('badges.pending')}</Text>
              <View style={styles.grid}>
                {pendingBadges.map((badge) => (
                  <BadgeCard key={badge.slug} badge={badge} locked />
                ))}
              </View>
            </>
          )}
        </ScrollView>
        <BottomMenu />
      </SafeAreaView>
    </View>
    </GestureDetector>
  );
}
