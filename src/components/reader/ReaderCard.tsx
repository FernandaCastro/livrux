import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
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
      activeOpacity={0.8}
      style={styles.card}
    >
      {locked && (
        <View style={styles.lockBadge}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <MultiavatarView
          seed={reader.avatar_seed}
          size={AVATAR_SIZE}
          borderColor={Colors.readerBlueLight}
          borderWidth={3}
        />
      </View>

      {/* Right side: name + chips */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {reader.name}
        </Text>

        <View style={styles.chipsGrid}>
          <View style={styles.chipsRow}>
            <View style={[styles.chip, styles.livruxChip]}>
              <Text style={styles.chipEmoji}>🪙</Text>
              <Text style={styles.chipValue} numberOfLines={1}>{reader.livrux_balance.toFixed(2)}</Text>
            </View>
            <View style={[styles.chip, styles.xpChip]}>
              <Text style={styles.chipEmoji}>⭐</Text>
              <Text style={styles.chipValue} numberOfLines={1}>{reader.xp}</Text>
              <Text style={styles.chipLabel}>XP</Text>
            </View>
          </View>
          <View style={styles.chipsRow}>
            <View style={[styles.chip, styles.badgesChip]}>
              <Text style={styles.chipEmoji}>🏅</Text>
              <Text style={styles.chipValue} numberOfLines={1}>{reader.badge_count ?? 0}</Text>
            </View>
            <View style={[styles.chip, styles.booksChip]}>
              <Text style={styles.chipEmoji}>📚</Text>
              <Text style={styles.chipValue} numberOfLines={1}>{reader.book_count ?? 0}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const AVATAR_SIZE = 64;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    // borderWidth: 2,
    // borderColor: Colors.readerBlue,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.md,
  },
  lockBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    zIndex: 1,
  },
  lockIcon: { fontSize: 14 },
  avatarContainer: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: Spacing.sm,
  },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  chipsGrid: {
    gap: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 3,
    overflow: 'hidden',
  },
  livruxChip: { backgroundColor: Colors.primary },
  xpChip: { backgroundColor: '#B45309' },
  badgesChip: { backgroundColor: '#2D6A4F' },
  booksChip: { backgroundColor: Colors.secondary },
  chipEmoji: { fontSize: 11 },
  chipValue: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: FontSizes.sm,
    color: Colors.textOnPrimary,
  },
  chipLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
  },
});
