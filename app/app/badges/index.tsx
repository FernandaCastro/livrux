import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBadges } from '../../../src/hooks/useBadges';
import { useReaderStore } from '../../../src/stores/readerStore';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';
import type { BadgeTier } from '../../../src/types';

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

export default function BadgesScreen() {
  const { t } = useTranslation();
  const { selectedReader } = useReaderStore();
  const { earnedBadges, pendingBadges, isLoading, error } = useBadges(selectedReader?.id ?? null);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyText}>{t('common.error')}</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
        </View>
        <BottomMenu />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>{t('badges.title')}</Text>

        {/* Empty state — catalog not loaded (migrations pending) */}
        {earnedBadges.length === 0 && pendingBadges.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏅</Text>
            <Text style={styles.emptyText}>{t('badges.empty')}</Text>
          </View>
        )}

        {/* Earned */}
        {earnedBadges.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('badges.earned')}</Text>
            <View style={styles.grid}>
              {earnedBadges.map((badge) => (
                <View key={badge.slug} style={[styles.badgeCard, styles.badgeCardEarned]}>
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
                  {!!badge.bonus_livrux && badge.bonus_livrux > 0 && (
                    <Text style={[styles.bonusText, { color: TIER_COLORS[badge.tier] }]}>
                      {t('badges.bonusEarned', { amount: badge.bonus_livrux })}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Pending */}
        {pendingBadges.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('badges.pending')}</Text>
            <View style={styles.grid}>
              {pendingBadges.map((badge) => (
                <View key={badge.slug} style={[styles.badgeCard, styles.badgeCardLocked]}>
                  <View style={[styles.iconCircle, styles.iconCircleLocked]}>
                    <Text style={[styles.badgeIcon, styles.badgeIconLocked]}>{badge.icon}</Text>
                  </View>
                  <Text style={[styles.badgeName, styles.badgeNameLocked]}>
                    {t(`badges.${badge.slug}.name`)}
                  </Text>
                  <Text style={styles.badgeDesc}>
                    {t(`badges.${badge.slug}.description`)}
                  </Text>
                </View>
              ))}
            </View>
          </>
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
  heading: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
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
  badgeCard: {
    width: '47%',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  badgeCardEarned: {
    backgroundColor: Colors.surface,
  },
  badgeCardLocked: {
    backgroundColor: Colors.surfaceVariant,
    opacity: 0.7,
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
  iconCircleLocked: {
    borderColor: Colors.border,
  },
  badgeIcon: { fontSize: 28 },
  badgeIconLocked: { opacity: 0.4 },
  badgeName: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeNameLocked: {
    color: Colors.textSecondary,
  },
  badgeDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  bonusText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xs,
    marginTop: 4,
  },
  tierIcon: {
    marginTop: -8,
    marginBottom: -10,
    marginLeft: 100, 
    fontSize: 30 
  },
});
