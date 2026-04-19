import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import type { Reader } from '../../types';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../constants/theme';

interface ReaderCardProps {
  reader: Reader;
  onPress: () => void;
  onLongPress?: () => void;
  locked?: boolean;
}

// Displays a single reader as a tappable card in the home grid.
export function ReaderCard({ reader, onPress, onLongPress, locked }: ReaderCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={styles.card}
    >
      {/* Lock badge — shown when reader has a PIN and isn't unlocked this session */}
      {locked && (
        <View style={styles.lockBadge}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {reader.avatar_url ? (
          <Image source={{ uri: reader.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {reader.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>
        {reader.name}
      </Text>

      {/* Balance badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeCoin}>🪙</Text>
        <Text style={styles.badgeAmount}>
          {reader.livrux_balance.toFixed(2)}
        </Text>
      </View>

      {/* Books read badge */}
      <View style={[styles.badge, styles.booksBadge]}>
        <Text style={styles.badgeCoin}>📚</Text>
        <Text style={styles.badgeAmount}>
          {reader.book_count ?? 0}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const CARD_SIZE = 140;
const AVATAR_SIZE = 72;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    margin: Spacing.sm,
    ...Shadows.md,
  },
  lockBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    zIndex: 1,
  },
  lockIcon: {
    fontSize: 16,
  },
  avatarContainer: {
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  avatarInitial: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.secondary,
  },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  booksBadge: {
    marginTop: Spacing.xs,
  },
  badgeCoin: {
    fontSize: 14,
  },
  badgeAmount: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
});
