import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { Book } from '../../types';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../constants/theme';

interface FriendBookCardProps {
  book: Book;
}

const RATING_EMOJI: Record<string, string> = {
  disliked: '😕',
  liked: '😊',
  loved: '😍',
};

const RATING_COLOR: Record<string, string> = {
  disliked: '#FFE0DE',
  liked: '#FFF3DC',
  loved: '#E8F5E9',
};

const RATING_TEXT_COLOR: Record<string, string> = {
  disliked: '#C62828',
  liked: '#E65100',
  loved: '#2E7D32',
};

export function FriendBookCard({ book }: FriendBookCardProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      {/* Coral accent strip */}
      <View style={styles.accentStrip} />

      {/* Cover */}
      <View style={styles.coverWrapper}>
        {book.cover_url ? (
          <Image source={{ uri: book.cover_url }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverIcon}>📕</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        {/* Title + right meta column */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
          <View style={styles.metaCol}>
            <Text style={styles.date}>{format(new Date(book.date_completed), 'dd/MM/yy')}</Text>
            <Text style={styles.pages}>📄 {book.total_pages} p.</Text>
          </View>
        </View>

        {book.author && (
          <Text style={styles.author} numberOfLines={1}>{book.author}</Text>
        )}

        {/* Chips */}
        {book.is_foreign_language && (
          <View style={styles.chips}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>🌍 {t('book.foreignLanguage')}</Text>
            </View>
          </View>
        )}

        {/* Rating pill */}
        {book.rating && (
          <View style={[styles.ratingPill, { backgroundColor: RATING_COLOR[book.rating] }]}>
            <Text style={styles.ratingEmoji}>{RATING_EMOJI[book.rating]}</Text>
            <Text style={[styles.ratingText, { color: RATING_TEXT_COLOR[book.rating] }]}>
              {book.rating === 'disliked'
                ? t('book.ratingDisliked')
                : book.rating === 'liked'
                ? t('book.ratingLiked')
                : t('book.ratingLoved')}
            </Text>
          </View>
        )}

        {/* Review snippet */}
        {book.review && (
          <Text style={styles.review} numberOfLines={2}>💬 {book.review}</Text>
        )}
      </View>
    </View>
  );
}

const COVER_WIDTH = 68;
const COVER_HEIGHT = 98;

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
    backgroundColor: Colors.accent,
  },
  coverWrapper: {
    margin: Spacing.md,
    marginRight: Spacing.sm,
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
  coverIcon: { fontSize: 32 },
  info: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.heading,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  metaCol: {
    alignItems: 'flex-end',
    gap: 2,
    paddingTop: 2,
  },
  date: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textDisabled,
  },
  pages: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textDisabled,
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
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  chipText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    marginBottom: Spacing.xs,
  },
  ratingEmoji: { fontSize: 14 },
  ratingText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xs,
  },
  review: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 17,
  },
});
