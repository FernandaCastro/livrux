import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Colors, Fonts, FontSizes, Radius, Spacing } from '../constants/theme';
import type { AwardedBadge } from '../hooks/useLivrux';
import type { BadgeTier } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Badge metadata
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Per-tier color palette
// ---------------------------------------------------------------------------
interface TierTheme {
  border: string;
  headerBg: string;
  glow: string;
  iconBg: string;
  nameColor: string;
}

const TIER_THEME: Record<BadgeTier, TierTheme> = {
  bronze: {
    border:    '#E07B00',
    headerBg:  '#FF9800',
    glow:      '#E07B00',
    iconBg:    '#FFF3E0',
    nameColor: '#4E2600',
  },
  silver: {
    border:    '#5C6BC0',
    headerBg:  '#7986CB',
    glow:      '#3949AB',
    iconBg:    '#E8EAF6',
    nameColor: '#1A237E',
  },
  gold: {
    border:    '#F9A825',
    headerBg:  '#FFD600',
    glow:      '#F57F17',
    iconBg:    '#FFFDE7',
    nameColor: '#33180A',
  },
};

// ---------------------------------------------------------------------------
// Timing constants
// ---------------------------------------------------------------------------
// Time to wait before showing the first badge (lets the counter animation finish).
const INITIAL_DELAY_MS = 1700;
const REVEAL_MS        = 600;
const SETTLE_MS        = 150;
const HOLD_MS          = 2500;
const DISMISS_MS       = 380;
// Gap between consecutive badges (after dismiss animation ends).
const BETWEEN_MS       = 400;

const CARD_TOTAL_MS = REVEAL_MS + SETTLE_MS + HOLD_MS + DISMISS_MS;

// ---------------------------------------------------------------------------
// Decorative sparkles
// ---------------------------------------------------------------------------
const SPARKLES = [
  { top: -22,    left: 10,   label: '✨' },
  { top: -22,    right: 10,  label: '🌟' },
  { top: 20,     left: -22,  label: '⭐' },
  { top: 20,     right: -22, label: '✨' },
  { bottom: -20, left: 30,   label: '🌟' },
  { bottom: -20, right: 30,  label: '✨' },
];

// ---------------------------------------------------------------------------
// Single badge card — rendered alone, calls onDone when its animation finishes
// ---------------------------------------------------------------------------
function BadgeCard({
  badge,
  initialDelay,
  onAnimationDone,
}: {
  badge: AwardedBadge;
  initialDelay: number;
  onAnimationDone: () => void;
}) {
  const { t } = useTranslation();
  const meta  = BADGE_CATALOG[badge.slug] ?? { icon: '🏅', tier: 'bronze' as BadgeTier };
  const theme = TIER_THEME[meta.tier];

  const opacity = useSharedValue(0);
  const scale   = useSharedValue(0.15);
  const rotate  = useSharedValue(180);

  useEffect(() => {
    opacity.value = withDelay(initialDelay, withSequence(
      withTiming(1,    { duration: REVEAL_MS,  easing: Easing.out(Easing.cubic) }),
      withTiming(1,    { duration: HOLD_MS }),
      withTiming(0,    { duration: DISMISS_MS, easing: Easing.in(Easing.quad) }),
    ));
    scale.value = withDelay(initialDelay, withSequence(
      withTiming(1.12, { duration: REVEAL_MS,  easing: Easing.out(Easing.back(1.6)) }),
      withTiming(1,    { duration: SETTLE_MS,  easing: Easing.out(Easing.quad) }),
      withTiming(1,    { duration: HOLD_MS }),
      withTiming(0.85, { duration: DISMISS_MS, easing: Easing.in(Easing.quad) }),
    ));
    rotate.value = withDelay(initialDelay, withSequence(
      withTiming(0,  { duration: REVEAL_MS + SETTLE_MS, easing: Easing.out(Easing.back(1.2)) }),
      withTiming(0,  { duration: HOLD_MS }),
      withTiming(-8, { duration: DISMISS_MS }),
    ));

    const timer = setTimeout(onAnimationDone, initialDelay + CARD_TOTAL_MS + BETWEEN_MS);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale:  scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.cardWrapper, animStyle]}>
      {SPARKLES.map((s, i) => (
        <Text key={i} style={[styles.sparkle, s as object]}>{s.label}</Text>
      ))}

      {/* Glow halo */}
      <View style={[styles.glow, { backgroundColor: theme.glow }]} />

      {/* Card */}
      <View style={[styles.card, { borderColor: theme.border }]}>
        <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
          <Text style={styles.headerText}>{t('badges.unlocked')}</Text>
        </View>

        <View style={[styles.content, { backgroundColor: theme.iconBg }]}>
          <View style={[styles.iconCircle, { borderColor: theme.border, shadowColor: theme.glow }]}>
            <Text style={styles.icon}>{meta.icon}</Text>
          </View>

          <Text style={[styles.badgeName, { color: theme.nameColor }]}>
            {t(`badges.${badge.slug}.name`)}
          </Text>

          {badge.bonus_xp > 0 && (
            <View style={[styles.xpPill, { backgroundColor: theme.border }]}>
              <Text style={styles.xpText}>{`⭐ +${badge.bonus_xp} XP`}</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Public component — sequences badges one at a time
// ---------------------------------------------------------------------------
interface Props {
  badges: AwardedBadge[];
  onDone: () => void;
}

export function BadgeUnlockToast({ badges, onDone }: Props) {
  // Index of the badge currently being shown (-1 = waiting for initial delay).
  const [currentIndex, setCurrentIndex] = useState(-1);
  // Refs avoid stale-closure bugs in callbacks that fire long after render.
  const badgesRef = useRef(badges);
  badgesRef.current = badges;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Wait for the counter animation before showing the first badge.
  useEffect(() => {
    if (badges.length === 0) return;
    const timer = setTimeout(() => setCurrentIndex(0), INITIAL_DELAY_MS);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges.length]);

  // Advance to the next badge or finish — runs after state is committed,
  // keeping side effects out of the setState updater.
  useEffect(() => {
    if (currentIndex < 0) return;
    if (currentIndex >= badgesRef.current.length) {
      onDoneRef.current();
    }
  }, [currentIndex]);

  const handleCardDone = () => setCurrentIndex(prev => prev + 1);

  if (badges.length === 0) return null;

  const badge = currentIndex >= 0 && currentIndex < badges.length
    ? badges[currentIndex]
    : null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDoneRef.current}>
        {badge && (
          // key forces a full remount (fresh animation) for each new badge.
          <BadgeCard
            key={badge.slug}
            badge={badge}
            initialDelay={0}
            onAnimationDone={handleCardDone}
          />
        )}
      </TouchableOpacity>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const CARD_WIDTH = Math.min(SCREEN_WIDTH - Spacing['2xl'] * 2, 320);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cardWrapper: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: CARD_WIDTH + 32,
    height: '110%',
    borderRadius: Radius.xl + 16,
    opacity: 0.35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 0,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Radius.xl,
    borderWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
  },
  header: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  headerText: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  content: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  icon: {
    fontSize: 46,
  },
  badgeName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    textAlign: 'center',
    lineHeight: FontSizes['3xl'] * 1.2,
  },
  xpPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  xpText: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: FontSizes.lg,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 22,
    zIndex: 10,
  },
});
