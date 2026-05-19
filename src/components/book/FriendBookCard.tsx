import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { Book } from '../../types';
import { Fonts, FontSizes, Spacing, Radius, Shadows, createShadows, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

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

const COVER_WIDTH = 68;
const COVER_HEIGHT = 98;

function createStyles(theme: ColorPalette) {
  const S = createShadows(theme.shadowColor);
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: theme.cardGradient[0],
      borderRadius: Radius.lg,
      marginBottom: Spacing.sm,
      overflow: 'hidden',
      ...S.md,
    },
    accentStrip: {
      width: 5,
      backgroundColor: theme.friendEmerald,
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverPlaceholderEmoji: {
      fontSize: COVER_HEIGHT * 0.55,
    },
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
      color: theme.textPrimary,
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
      color: theme.textDisabled,
    },
    pages: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.xs,
      color: theme.textDisabled,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    progressBar: {
      flex: 1,
      height: 4,
      borderRadius: Radius.full,
      backgroundColor: theme.surfaceVariant,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: Radius.full,
      backgroundColor: theme.friendEmerald,
    },
    progressText: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.xs,
      color: theme.textSecondary,
    },
    author: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.xs,
      color: theme.textSecondary,
      marginBottom: Spacing.xs,
    },
    chips: {
      flexDirection: 'row',
      gap: Spacing.xs,
      flexWrap: 'wrap',
      marginBottom: Spacing.sm,
    },
    chip: {
      backgroundColor: theme.surfaceVariant,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    chipText: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.xs,
      color: theme.textSecondary,
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
      color: theme.textSecondary,
      fontStyle: 'italic',
      lineHeight: 17,
    },
  });
}

export function FriendBookCard({ book }: FriendBookCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.accentStrip} />

      <View style={styles.coverWrapper}>
        {book.cover_url ? (
          <Image source={{ uri: book.cover_url }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}><Text style={styles.coverPlaceholderEmoji}>📕</Text></View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
          <View style={styles.metaCol}>
            <Text style={styles.date}>{format(new Date(book.date_completed ?? book.date_start), 'dd/MM/yy')}</Text>
            <Text style={styles.pages}>📄 {book.total_pages} p.</Text>
          </View>
        </View>

        {book.author && (
          <Text style={styles.author} numberOfLines={1}>{book.author}</Text>
        )}

        {book.status === 'reading' && (
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(((book.current_page ?? 0) / book.total_pages) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {book.current_page ?? 0}/{book.total_pages}
            </Text>
          </View>
        )}

        {book.is_foreign_language && (
          <View style={styles.chips}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>🌍 {t('book.foreignLanguage')}</Text>
            </View>
          </View>
        )}

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

        {book.review && (
          <Text style={styles.review} numberOfLines={2}>💬 {book.review}</Text>
        )}
      </View>
    </View>
  );
}
