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
import { useEffect, useRef } from 'react';

import { useBadges } from '../../../../src/hooks/useBadges';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../../src/constants/theme';
import type { BadgeTier } from '../../../../src/types';

const TIER_COLORS: Record<BadgeTier, string> = {
  bronze: '#CD7F32',
  silver: '#A8A9AD',
  gold: '#F5A623',
};
const TIER_ICON: Record<BadgeTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
};

export default function FriendBadgesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { readerId, fromReaderId } = useLocalSearchParams<{ readerId: string; fromReaderId: string }>();

  const { earnedBadges, isLoading, refresh } = useBadges(readerId ?? null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') refresh();
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>🏅 {t('badges.title')}</Text>
        </View>

        {earnedBadges.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏅</Text>
            <Text style={styles.emptyText}>{t('badges.friendEmpty')}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {earnedBadges.map((badge) => (
              <View key={badge.slug} style={styles.badgeCard}>
                <Text style={styles.tierIcon}>{TIER_ICON[badge.tier]}</Text>
                <View style={[styles.iconCircle, { borderColor: TIER_COLORS[badge.tier] }]}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                </View>
                <Text style={styles.badgeName}>
                  {t(`badges.${badge.slug}.name`)}
                </Text>
                <Text style={styles.badgeDesc}>
                  {t(`badges.${badge.slug}.description`)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomMenu />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing['2xl'],
    paddingTop: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  backText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  heading: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  badgeCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  badgeIcon: { fontSize: 28 },
  badgeName: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
  },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.md },
  emptyText: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tierIcon: {
    marginTop: -8,
    marginBottom: -10,
    marginLeft: 100, 
    fontSize: 30 
  },
});
