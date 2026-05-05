import React, { useEffect, useRef } from 'react';
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
  xpColor: string;
}

const TIER_THEME: Record<BadgeTier, TierTheme> = {
  bronze: {
    border:    '#E07B00',
    headerBg:  '#FF9800',
    glow:      '#E07B00',
    iconBg:    '#FFF3E0',
    nameColor: '#4E2600',
    xpColor:   '#BF360C',
  },
  silver: {
    border:    '#5C6BC0',
    headerBg:  '#7986CB',
    glow:      '#3949AB',
    iconBg:    '#E8EAF6',
    nameColor: '#1A237E',
    xpColor:   '#283593',
  },
  gold: {
    border:    '#F9A825',
    headerBg:  '#FFD600',
    glow:      '#F57F17',
    iconBg:    '#FFFDE7',
    nameColor: '#33180A',
    xpColor:   '#E65100',
  },
};

// ---------------------------------------------------------------------------
// Timing constants
// Per-badge sequence: wait for counter (~1350ms) + small gap, then animate in.
// ---------------------------------------------------------------------------
const INITIAL_DELAY_MS = 1700; // waits for the ConfettiOverlay counter to finish
const REVEAL_MS        = 600;
const SETTLE_MS        = 150;
const HOLD_MS          = 2500;
const DISMISS_MS       = 380;
const BETWEEN_MS       = 300;  // gap between consecutive badges

const PER_BADGE_MS = REVEAL_MS + SETTLE_MS + HOLD_MS + DISMISS_MS + BETWEEN_MS;

// ---------------------------------------------------------------------------
// Decorative sparkles positioned around the card
// ---------------------------------------------------------------------------
const SPARKLES = [
  { top: -22, left: 10,  label: '✨' },
  { top: -22, right: 10, label: '🌟' },
  { top: 20,  left: -22, label: '⭐' },
  { top: 20,  right: -22,label: '✨' },
  { bottom: -20, left: 30, label: '🌟' },
  { bottom: -20, right: 30, label: '✨' },
];

// ---------------------------------------------------------------------------
// Single animated badge card
// ---------------------------------------------------------------------------
function BadgeCard({ badge, index }: { badge: AwardedBadge; index: number }) {
  const { t } = useTranslation();
  const meta  = BADGE_CATALOG[badge.slug] ?? { icon: '🏅', tier: 'bronze' as BadgeTier };
  const theme = TIER_THEME[meta.tier];
  const delay = INITIAL_DELAY_MS + index * PER_BADGE_MS;

  const opacity  = useSharedValue(0);
  const scale    = useSharedValue(0.15);
  const rotate   = useSharedValue(180);

  useEffect(() => {
    // Reveal: fade + spin + scale bounce
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: REVEAL_MS, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: HOLD_MS }),
      withTiming(0, { duration: DISMISS_MS, easing: Easing.in(Easing.quad) }),
    ));
    scale.value = withDelay(delay, withSequence(
      withTiming(1.12, { duration: REVEAL_MS,  easing: Easing.out(Easing.back(1.6)) }),
      withTiming(1,    { duration: SETTLE_MS,  easing: Easing.out(Easing.quad) }),
      withTiming(1,    { duration: HOLD_MS }),
      withTiming(0.85, { duration: DISMISS_MS, easing: Easing.in(Easing.quad) }),
    ));
    rotate.value = withDelay(delay, withSequence(
      withTiming(0, { duration: REVEAL_MS + SETTLE_MS, easing: Easing.out(Easing.back(1.2)) }),
      withTiming(0, { duration: HOLD_MS }),
      withTiming(-8, { duration: DISMISS_MS }),
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale:   scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.cardWrapper, animStyle]}>
      {/* Decorative sparkles */}
      {SPARKLES.map((s, i) => (
        <Text key={i} style={[styles.sparkle, s as object]}>{s.label}</Text>
      ))}

      {/* Glow halo behind the card */}
      <View style={[styles.glow, { backgroundColor: theme.glow }]} />

      {/* Card */}
      <View style={[styles.card, { borderColor: theme.border }]}>
        {/* Coloured header strip */}
        <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
          <Text style={styles.headerText}>{t('badges.unlocked')}</Text>
        </View>

        {/* Content */}
        <View style={[styles.content, { backgroundColor: theme.iconBg }]}>
          {/* Icon circle */}
          <View style={[styles.iconCircle, { borderColor: theme.border, shadowColor: theme.glow }]}>
            <Text style={styles.icon}>{meta.icon}</Text>
          </View>

          {/* Badge name */}
          <Text style={[styles.badgeName, { color: theme.nameColor }]}>
            {t(`badges.${badge.slug}.name`)}
          </Text>

          {/* XP pill */}
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
// Public component
// ---------------------------------------------------------------------------
interface Props {
  badges: AwardedBadge[];
  onDone: () => void;
}

export function BadgeUnlockToast({ badges, onDone }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (badges.length === 0) return;
    const total = INITIAL_DELAY_MS + badges.length * PER_BADGE_MS;
    timer.current = setTimeout(onDone, total);
    return () => { if (timer.current) clearTimeout(timer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges]);

  if (badges.length === 0) return null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDone}>
        {badges.map((b, i) => (
          <BadgeCard key={b.slug} badge={b} index={i} />
        ))}
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
    position: 'absolute',
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  // Blurred glow halo — uses shadow on iOS, elevation tint on Android
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
