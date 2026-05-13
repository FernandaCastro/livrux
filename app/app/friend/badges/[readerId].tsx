import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

import { useBadges } from '../../../../src/hooks/useBadges';
import { useTheme } from '../../../../src/hooks/useTheme';
import { FloatingEmojis } from '../../../../src/components/FloatingEmojis';
import { BadgeCard } from '../../../../src/components/BadgeCard';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../../src/components/BottomMenu';
import { Fonts, FontSizes, Spacing, Radius, Shadows, createShadows, type ColorPalette } from '../../../../src/constants/theme';

function createStyles(theme: ColorPalette) {
  const S = createShadows(theme.shadowColor);
  return StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1, backgroundColor: 'transparent' },
    backBtn: {
      alignSelf: 'flex-start',
      marginHorizontal: Spacing.xl,
      marginTop: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    backText: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.sm,
      color: '#0A6E48',
    },
    heroBanner: {
      borderRadius: Radius.xl,
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.xl,
      ...S.lg,
    },
    heroContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    heroBannerEmoji: { fontSize: 52 },
    heroRight: { flex: 1, gap: Spacing.sm },
    heroTitle: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes['2xl'],
      color: theme.textOnPrimary,
    },
    countChip: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
    },
    countChipText: {
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
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: Spacing['2xl'],
    },
    emptyIcon: { fontSize: 56, marginBottom: Spacing.md },
    emptyText: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes.xl,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
}

export default function FriendBadgesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { readerId } = useLocalSearchParams<{ readerId: string; fromReaderId: string }>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { earnedBadges, isLoading, refresh } = useBadges(readerId ?? null);
  const appStateRef = useRef(AppState.currentState);

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

  return (
    <View style={styles.root}>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.background} />
      {bgGradient}
      <FloatingEmojis />
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t('common.back')}</Text>
        </TouchableOpacity>

        {/* Jade hero — fixed friends accent */}
        <LinearGradient
          colors={['#3ECA8C', '#0A6E48']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroBannerEmoji}>🏅</Text>
            <View style={styles.heroRight}>
              <Text style={styles.heroTitle}>{t('badges.title')}</Text>
              <View style={styles.countChip}>
                <Text style={styles.countChipText}>🏆 {earnedBadges.length} {t('badges.earned')}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {earnedBadges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏅</Text>
              <Text style={styles.emptyText}>{t('badges.friendEmpty')}</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {earnedBadges.map((badge) => (
                <BadgeCard key={badge.slug} badge={badge} />
              ))}
            </View>
          )}
        </ScrollView>
        <BottomMenu />
      </SafeAreaView>
    </View>
  );
}
