import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Fonts, FontSizes, Spacing, Radius, Shadows, type ColorPalette } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import type { BadgeTier } from '../types';

interface BadgeData {
  slug: string;
  icon: string;
  tier: BadgeTier;
  earned: boolean;
  bonus_livrux?: number;
}

interface BadgeCardProps {
  badge: BadgeData;
  locked?: boolean;
}

const TIER_COLOR: Record<BadgeTier, string> = {
  bronze: '#CD7F32',
  silver: '#A8A9AD',
  gold: '#F5A623',
};

const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
};

function createStyles(theme: ColorPalette) {
  return StyleSheet.create({
    card: {
      width: '47%',
      borderRadius: Radius.xl,
      padding: Spacing.md,
      paddingTop: Spacing.lg,
      alignItems: 'center',
      overflow: 'hidden',
      ...Shadows.sm,
    },
    cardLocked: {
      backgroundColor: theme.statusBarStyle === 'light'
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(255,255,255,0.45)',
      opacity: 0.65,
    },
    tierStrip: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
    },
    tierPill: {
      position: 'absolute',
      top: Spacing.sm,
      right: Spacing.sm,
      borderRadius: Radius.full,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tierPillText: { fontSize: 14 },
    iconCircle: {
      width: 60,
      height: 60,
      borderRadius: Radius.full,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
      backgroundColor: theme.background,
    },
    iconCircleLocked: { borderColor: theme.border },
    icon: { fontSize: 30 },
    iconLocked: { fontSize: 30, opacity: 0.35 },
    lockedIconWrap: {
      position: 'relative',
      marginBottom: Spacing.sm,
    },
    lockOverlay: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      fontSize: 18,
    },
    name: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.sm,
      color: theme.textPrimary,
      textAlign: 'center',
      marginBottom: 4,
    },
    nameLocked: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.sm,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 4,
    },
    desc: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.xs,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 16,
    },
    bonusPill: {
      marginTop: Spacing.sm,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
    },
    bonusText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.xs,
    },
  });
}

export function BadgeCard({ badge, locked = false }: BadgeCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tierColor = TIER_COLOR[badge.tier];

  const cardColors: [string, string] = theme.statusBarStyle === 'light'
    ? [theme.surface, theme.surfaceVariant]
    : ['#FEFBFF', '#FFFAF4'];

  if (locked) {
    return (
      <View style={[styles.card, styles.cardLocked]}>
        <View style={styles.lockedIconWrap}>
          <View style={[styles.iconCircle, styles.iconCircleLocked]}>
            <Text style={styles.iconLocked}>{badge.icon}</Text>
          </View>
          <Text style={styles.lockOverlay}>🔒</Text>
        </View>
        <Text style={styles.nameLocked} numberOfLines={2}>
          {t(`badges.${badge.slug}.name`)}
        </Text>
        <Text style={styles.desc} numberOfLines={2}>
          {t(`badges.${badge.slug}.description`)}
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={cardColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={[styles.tierStrip, { backgroundColor: tierColor }]} />
      <View style={[styles.tierPill, { backgroundColor: tierColor }]}>
        <Text style={styles.tierPillText}>{TIER_LABEL[badge.tier]}</Text>
      </View>
      <View style={[styles.iconCircle, { borderColor: tierColor }]}>
        <Text style={styles.icon}>{badge.icon}</Text>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {t(`badges.${badge.slug}.name`)}
      </Text>
      <Text style={styles.desc} numberOfLines={2}>
        {t(`badges.${badge.slug}.description`)}
      </Text>
      {!!badge.bonus_livrux && badge.bonus_livrux > 0 && (
        <View style={[styles.bonusPill, { backgroundColor: tierColor + '22' }]}>
          <Text style={[styles.bonusText, { color: tierColor }]}>
            🪙 {t('badges.bonusEarned', { amount: badge.bonus_livrux })}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}
