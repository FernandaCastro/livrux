import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import type { Book } from '../../types';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../constants/theme';

interface BookCardProps {
  book: Book;
  onPress: () => void;
}

export function BookCard({ book, onPress }: BookCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.card}>
      {/* Cover thumbnail */}
      <View style={styles.coverContainer}>
        {book.cover_url ? (
          <Image source={{ uri: book.cover_url }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverIcon}>📕</Text>
          </View>
        )}
      </View>

      {/* Metadata */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        {book.author && (
          <Text style={styles.author} numberOfLines={1}>{book.author}</Text>
        )}
        <Text style={styles.pages}>{book.total_pages} p.</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeCoin}>🪙</Text>
          <Text style={styles.badgeAmount}>+{book.livrux_earned}</Text>
        </View>
      </View>

      {/* Date */}
      <Text style={styles.date}>
        {format(new Date(book.date_completed), 'dd/MM/yy')}
      </Text>
    </TouchableOpacity>
  );
}

const COVER_WIDTH = 56;
const COVER_HEIGHT = 80;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  coverContainer: { marginRight: Spacing.md },
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
  coverIcon: { fontSize: 28 },
  info: { flex: 1 },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  author: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  pages: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textDisabled,
    marginBottom: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeCoin: { fontSize: 12 },
  badgeAmount: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  date: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textDisabled,
    marginLeft: Spacing.sm,
    alignSelf: 'flex-start',
  },
});
