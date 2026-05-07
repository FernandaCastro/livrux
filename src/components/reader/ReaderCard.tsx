import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Reader } from '../../types';
import { MultiavatarView } from './MultiavatarView';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../constants/theme';

interface ReaderCardProps {
  reader: Reader;
  onPress: () => void;
  onLongPress?: () => void;
  locked?: boolean;
}

export function ReaderCard({ reader, onPress, onLongPress, locked }: ReaderCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.82}
      style={styles.cardShell}
    >
      <LinearGradient
        colors={['#FEFBFF', '#FFFAF4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {locked && (
          <View style={styles.lockBadge}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}

        {/* Avatar with vibrant purple ring */}
        <View style={styles.avatarContainer}>
          <MultiavatarView
            seed={reader.avatar_seed}
            size={AVATAR_SIZE}
            borderColor={Colors.secondary}
            borderWidth={3}
          />
        </View>

        {/* Right side */}
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {reader.name}
          </Text>

          {/* Coin balance — hero stat */}
          <View style={styles.coinPill}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinValue}>{reader.livrux_balance.toFixed(2)}</Text>
          </View>

          {/* Secondary stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statPill, styles.xpPill]}>
              <Text style={styles.statEmoji}>⭐</Text>
              <Text style={styles.statValueDark}>{reader.xp}</Text>
              <Text style={styles.statLabelDark}>XP</Text>
            </View>
            <View style={[styles.statPill, styles.badgePill]}>
              <Text style={styles.statEmoji}>🏅</Text>
              <Text style={styles.statValueLight}>{reader.badge_count ?? 0}</Text>
            </View>
            <View style={[styles.statPill, styles.bookPill]}>
              <Text style={styles.statEmoji}>📚</Text>
              <Text style={styles.statValueLight}>{reader.book_count ?? 0}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  cardShell: {
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    ...Shadows.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  lockBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 1,
  },
  lockIcon: { fontSize: 14 },
  avatarContainer: {
    flexShrink: 0,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
  },
  name: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.coin,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    gap: 5,
    alignSelf: 'flex-start',
    shadowColor: Colors.coinShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius: 6,
    elevation: 3,
  },
  coinEmoji: { fontSize: 14 },
  coinValue: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 2,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 3,
  },
  xpPill: { backgroundColor: '#FCD34D' },
  badgePill: { backgroundColor: '#22C55E' },
  bookPill: { backgroundColor: '#38BDF8' },
  statEmoji: { fontSize: 11 },
  statValueDark: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: FontSizes.sm,
    color: '#78350F',
  },
  statLabelDark: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: '#92400E',
  },
  statValueLight: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: FontSizes.sm,
    color: Colors.textOnPrimary,
  },
});
