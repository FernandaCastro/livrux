import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { Book } from '../../types';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../constants/theme';

interface BookCardProps {
  book: Book;
  onPress: () => void;
  onLongPress?: () => void;
}

const RATING_EMOJI: Record<string, string> = {
  disliked: '😕',
  liked: '😊',
  loved: '😍',
};

export function BookCard({ book, onPress, onLongPress }: BookCardProps) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8} style={styles.card}>
      {/* Accent strip */}
      <View style={styles.accentStrip} />

      {/* Cover with rating badge */}
      <View style={styles.coverWrapper}>
        {book.cover_url ? (
          <Image source={{ uri: book.cover_url }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverIcon}>📕</Text>
          </View>
        )}
        {book.rating && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingEmoji}>{RATING_EMOJI[book.rating]}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        {book.author && (
          <Text style={styles.author} numberOfLines={1}>{book.author}</Text>
        )}

        <View style={styles.chips}>
          <View style={styles.pageChip}>
            <Text style={styles.pageChipText}>📄 {book.total_pages} p.</Text>
          </View>
          {book.is_foreign_language && (
            <View style={styles.foreignChip}>
              <Text style={styles.pageChipText}>🌍</Text>
            </View>
          )}
        </View>

        {/* Footer: coins + date */}
        <View style={styles.footer}>
          <View style={styles.coinBadge}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinAmount}>+{book.livrux_earned}</Text>
          </View>
          <Text style={styles.date}>
            {format(new Date(book.date_completed), 'dd/MM/yy')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const COVER_WIDTH = 64;
const COVER_HEIGHT = 92;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.md,
  },
  accentStrip: {
    width: 5,
    backgroundColor: Colors.secondary,
  },
  coverWrapper: {
    margin: Spacing.md,
    marginRight: Spacing.sm,
    position: 'relative',
    alignSelf: 'center',
  },
  cover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: Radius.sm,
  },
  coverPlaceholder: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverIcon: { fontSize: 30 },
  ratingBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  ratingEmoji: { fontSize: 15 },
  info: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 2,
  },
  author: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  pageChip: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  foreignChip: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  pageChipText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  coinEmoji: { fontSize: 13 },
  coinAmount: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xs,
    color: Colors.textOnPrimary,
  },
  date: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textDisabled,
  },
});
