import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../constants/theme';
import type { AwardedBadge } from '../hooks/useLivrux';
import type { BadgeTier } from '../types';

const TIER_COLORS: Record<BadgeTier, string> = {
  bronze: '#CD7F32',
  silver: '#A8A9AD',
  gold: '#F5A623',
};

// Badge icon and tier from the catalog — derived client-side to avoid an
// extra network round-trip since the catalog is small and static.
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

const SLIDE_DISTANCE = 120;
const SHOW_DURATION  = 4000;
const ANIM_IN_MS     = 420;
const ANIM_OUT_MS    = 320;

interface Props {
  badges: AwardedBadge[];
  onDone: () => void;
}

function BadgeCard({ badge, index }: { badge: AwardedBadge; index: number }) {
  const { t } = useTranslation();
  const translateY = useSharedValue(SLIDE_DISTANCE);
  const opacity    = useSharedValue(0);

  const meta = BADGE_CATALOG[badge.slug] ?? { icon: '🏅', tier: 'bronze' as BadgeTier };
  const tierColor = TIER_COLORS[meta.tier];

  useEffect(() => {
    const delay = index * 600;
    translateY.value = withDelay(
      delay,
      withSequence(
        withTiming(0,               { duration: ANIM_IN_MS,  easing: Easing.out(Easing.back(1.4)) }),
        withTiming(0,               { duration: SHOW_DURATION }),
        withTiming(SLIDE_DISTANCE,  { duration: ANIM_OUT_MS, easing: Easing.in(Easing.quad) }),
      ),
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: ANIM_IN_MS }),
        withTiming(1, { duration: SHOW_DURATION }),
        withTiming(0, { duration: ANIM_OUT_MS }),
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={[styles.iconCircle, { borderColor: tierColor }]}>
        <Text style={styles.icon}>{meta.icon}</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.unlockLabel}>{t('badges.unlocked')}</Text>
        <Text style={styles.badgeName}>{t(`badges.${badge.slug}.name`)}</Text>
        {badge.bonus_xp > 0 && (
          <Text style={[styles.bonus, { color: tierColor }]}>
            {`+${badge.bonus_xp} XP`}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

export function BadgeUnlockToast({ badges, onDone }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (badges.length === 0) return;
    const total = ANIM_IN_MS + SHOW_DURATION + ANIM_OUT_MS + (badges.length - 1) * 600 + 200;
    timer.current = setTimeout(onDone, total);
    return () => { if (timer.current) clearTimeout(timer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges]);

  if (badges.length === 0) return null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDone}>
        <View style={styles.stack}>
          {badges.map((b, i) => (
            <BadgeCard key={b.slug} badge={b} index={i} />
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 100,
    paddingHorizontal: Spacing.xl,
    pointerEvents: 'box-none',
  },
  stack: {
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.lg,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  icon: { fontSize: 26 },
  textBlock: { flex: 1 },
  unlockLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badgeName: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  bonus: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
});
