import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Reader } from '../../types';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../constants/theme';

interface ReaderCardProps {
  reader: Reader;
  onPress: () => void;
}

// Displays a single reader as a tappable card in the home grid.
export function ReaderCard({ reader, onPress }: ReaderCardProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.card}
    >
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
    </TouchableOpacity>
  );
}

const CARD_SIZE = 140;
const AVATAR_SIZE = 72;

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    margin: Spacing.sm,
    ...Shadows.md,
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
  badgeCoin: {
    fontSize: 14,
  },
  badgeAmount: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
});
