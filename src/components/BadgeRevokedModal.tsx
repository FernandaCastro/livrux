import React from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, Fonts, FontSizes, Radius, Spacing } from '../constants/theme';
import type { RevokedBadge } from '../hooks/useLivrux';
import type { BadgeTier } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BADGE_CATALOG: Record<string, { icon: string; tier: BadgeTier }> = {
  first_book:       { icon: '📖', tier: 'bronze' },
  bookworm_5:       { icon: '🐛', tier: 'bronze' },
  bookworm_25:      { icon: '🦋', tier: 'silver' },
  centurion:        { icon: '🏆', tier: 'gold'   },
  page_hunter_500:  { icon: '📜', tier: 'bronze' },
  page_hunter_5000: { icon: '🗺️',  tier: 'gold'   },
  polyglot:         { icon: '🌍', tier: 'silver' },
  streak_7:         { icon: '🔥', tier: 'bronze' },
  streak_30:        { icon: '⚡', tier: 'gold'   },
  book_club:        { icon: '🤝', tier: 'silver' },
};

const TIER_BORDER: Record<BadgeTier, string> = {
  bronze: '#E07B00',
  silver: '#5C6BC0',
  gold:   '#F9A825',
};

interface Props {
  badges: RevokedBadge[];
  onClose: () => void;
}

export function BadgeRevokedModal({ badges, onClose }: Props) {
  const { t } = useTranslation();

  if (badges.length === 0) return null;

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Sad header */}
          <View style={styles.header}>
            <Text style={styles.sadEmoji}>😢</Text>
            <Text style={styles.title}>{t('book.badgesRevoked')}</Text>
            <Text style={styles.subtitle}>{t('book.badgesRevokedSubtitle')}</Text>
          </View>

          {/* Badge list */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {badges.map((rb) => {
              const meta = BADGE_CATALOG[rb.slug] ?? { icon: '🏅', tier: 'bronze' as BadgeTier };
              const borderColor = TIER_BORDER[meta.tier];
              return (
                <View key={rb.slug} style={[styles.badgeRow, { borderColor }]}>
                  <View style={[styles.iconCircle, { borderColor }]}>
                    <Text style={styles.badgeIcon}>{meta.icon}</Text>
                  </View>
                  <View style={styles.badgeInfo}>
                    <Text style={styles.badgeName}>{t(`badges.${rb.slug}.name`)}</Text>
                    {rb.penalty_xp > 0 && (
                      <Text style={styles.penalty}>{`-${rb.penalty_xp} XP`}</Text>
                    )}
                  </View>
                  <Text style={styles.lostEmoji}>💔</Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Encouragement + dismiss */}
          <View style={styles.footer}>
            <Text style={styles.encouragement}>{t('book.badgesRevokedEncouragement')}</Text>
            <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.btnText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CARD_WIDTH = Math.min(SCREEN_WIDTH - Spacing['2xl'] * 2, 340);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#F0EEF8',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    backgroundColor: '#6B5B9A',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  sadEmoji: {
    fontSize: 52,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  list: {
    maxHeight: 260,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 2,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeInfo: {
    flex: 1,
    gap: 2,
  },
  badgeName: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  penalty: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  lostEmoji: {
    fontSize: 20,
  },
  footer: {
    padding: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0DCF0',
  },
  encouragement: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#6B5B9A',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.sm + 2,
  },
  btnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: '#FFFFFF',
  },
});
