import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { Book } from '../../types';
import { Fonts, FontSizes, Spacing, Radius, Shadows, createShadows, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

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

const COVER_WIDTH = 64;
const COVER_HEIGHT = 92;

function createStyles(theme: ColorPalette) {
  const S = createShadows(theme.shadowColor);
  return StyleSheet.create({
    shell: {
      borderRadius: Radius.xl,
      marginBottom: Spacing.sm,
      ...S.md,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'stretch',
      borderRadius: Radius.xl,
      overflow: 'hidden',
    },
    accentStrip: {
      width: 5,
      backgroundColor: theme.secondary,
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverPlaceholderEmoji: {
      fontSize: COVER_HEIGHT * 0.55,
    },
    ratingBadge: {
      position: 'absolute',
      bottom: -6,
      right: -6,
      backgroundColor: theme.surface,
      borderRadius: Radius.full,
      width: 26,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
      ...S.sm,
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
      color: theme.textPrimary,
      lineHeight: 20,
      marginBottom: 2,
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
      marginBottom: Spacing.sm,
      flexWrap: 'wrap',
    },
    pageChip: {
      backgroundColor: theme.secondaryLight,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    foreignChip: {
      backgroundColor: theme.secondaryLight,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    pageChipText: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.xs,
      color: theme.secondaryDark,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.xs,
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
      backgroundColor: theme.secondary,
    },
    progressText: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.xs,
      color: theme.textSecondary,
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
      backgroundColor: theme.chipCoin,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
    },
    coinEmoji: { fontSize: 13 },
    coinAmount: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.xs,
      color: theme.textOnPrimary,
    },
    date: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.xs,
      color: theme.textDisabled,
    },
  });
}

export function BookCard({ book, onPress, onLongPress }: BookCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const cardColors = theme.cardGradient;

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.82} style={styles.shell}>
      <LinearGradient
        colors={cardColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Accent strip */}
        <View style={styles.accentStrip} />

        {/* Cover with rating badge */}
        <View style={styles.coverWrapper}>
          {book.cover_url ? (
            <Image source={{ uri: book.cover_url }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}><Text style={styles.coverPlaceholderEmoji}>📕</Text></View>
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

          {/* Progress bar for reading books */}
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

          {/* Footer: coins + date */}
          <View style={styles.footer}>
            {book.status !== 'reading' && (
              <View style={styles.coinBadge}>
                <Text style={styles.coinEmoji}>🪙</Text>
                <Text style={styles.coinAmount}>+{book.livrux_earned}</Text>
              </View>
            )}
            <Text style={styles.date}>
              {book.status === 'reading' ? '🥚' : '🐣'} {format(new Date(book.date_completed ?? book.date_start), 'dd/MM/yy')}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
