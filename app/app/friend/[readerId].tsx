import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';

import { supabase } from '../../../src/lib/supabase';
import { useBooks } from '../../../src/hooks/useBooks';
import { MultiavatarView } from '../../../src/components/reader/MultiavatarView';
import { FriendBookCard } from '../../../src/components/book/FriendBookCard';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';

interface FriendReader {
  id: string;
  name: string;
  avatar_seed: string | null;
  xp: number;
}

export default function FriendProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { readerId, fromReaderId } = useLocalSearchParams<{ readerId: string; fromReaderId: string }>();

  const [friendReader, setFriendReader] = useState<FriendReader | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [readerLoading, setReaderLoading] = useState(true);

  const { books, isLoading: booksLoading, refresh: refreshBooks } = useBooks(readerId ?? null);

  const readingNow = books.filter((b) => b.status === 'reading');
  const completedBooks = books.filter((b) => b.status === 'completed');

  const fetchReader = useCallback(async () => {
    if (!readerId) return;
    setReaderLoading(true);
    const [{ data: readerData }, { count }] = await Promise.all([
      supabase
        .from('readers')
        .select('id, name, avatar_seed, xp')
        .eq('id', readerId)
        .single(),
      supabase
        .from('reader_badges')
        .select('*', { count: 'exact', head: true })
        .eq('reader_id', readerId),
    ]);
    setFriendReader(readerData ?? null);
    setBadgeCount(count ?? 0);
    setReaderLoading(false);
  }, [readerId]);

  useEffect(() => { fetchReader(); }, [fetchReader]);

  const isLoading = readerLoading || booksLoading;

  if (readerLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Hero banner ── */}
      <View style={styles.heroBanner}>
        {friendReader && (
          <>
            {/* Avatar (left) + Name (right) */}
            <View style={styles.heroContent}>
              <View style={styles.avatarRing}>
                <MultiavatarView
                  seed={friendReader.avatar_seed}
                  size={AVATAR_SIZE}
                  borderColor={Colors.primaryLight}
                  borderWidth={4}
                />
              </View>
              <View style={styles.heroRight}>
                <Text style={styles.readerName} numberOfLines={2}>
                  {friendReader.name}
                </Text>
              </View>
            </View>

            {/* XP + Badges chips */}
            <View style={styles.heroBadgesRow}>
              <View style={styles.xpBadge}>
                <Text style={styles.badgeIcon}>⭐</Text>
                <Text style={styles.badgeCount}>{friendReader.xp}</Text>
                <Text style={styles.badgeCurrency}>XP</Text>
              </View>

              <TouchableOpacity
                style={styles.badgesBadge}
                onPress={() => router.push(`/app/friend/badges/${readerId}?fromReaderId=${fromReaderId}`)}
                activeOpacity={0.75}
              >
                <Text style={styles.badgeIcon}>🏅</Text>
                <Text style={styles.badgeCount}>{badgeCount}</Text>
                <Text style={styles.badgeCurrency}>{t('badges.title')}</Text>
              </TouchableOpacity>
            </View>

            {/* Books stats row — simple semi-transparent buttons */}
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>📚 {completedBooks.length} {t('reader.books')}</Text>
              </View>
              {readingNow.length > 0 && (
                <View style={styles.statChip}>
                  <Text style={styles.statChipText}>📖 {readingNow.length} {t('reader.readingNow')}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* ── Books list ── */}
      <FlatList
        data={completedBooks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={async () => { await fetchReader(); await refreshBooks(); }}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {readingNow.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📖</Text>
                  <Text style={styles.sectionTitle}>{t('reader.readingNow')}</Text>
                </View>
                {readingNow.map((item) => (
                  <FriendBookCard key={item.id} book={item} />
                ))}
              </>
            )}
            {completedBooks.length > 0 && (
              <View style={[styles.sectionHeader, readingNow.length > 0 && styles.sectionHeaderSpaced]}>
                <Text style={styles.sectionIcon}>✅</Text>
                <Text style={styles.sectionTitle}>{t('reader.books')}</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading && books.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🌱</Text>
              <Text style={styles.emptyTitle}>{t('reader.noBooks')}</Text>
              <Text style={styles.emptySubtext}>{friendReader?.name} {t('friends.noBooksSub')}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <FriendBookCard book={item} />}
      />

      <BottomMenu showReader showWallet showFriends readerId={fromReaderId} />
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  /* ── Hero ── */
  heroBanner: {
    backgroundColor: Colors.friendEmerald,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    ...Shadows.lg,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    gap: Spacing.md,
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.md,
  },
  avatarRing: {
    borderRadius: Radius.full,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    ...Shadows.md,
    marginTop: -10,
  },
  heroRight: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  readerName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textOnPrimary,
  },

  /* ── Chips rows ── */
  heroBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  statChipText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.sm,
    color: Colors.textOnPrimary,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#B45309',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Shadows.sm,
  },
  badgesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#2D6A4F',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Shadows.sm,
  },
  badgeIcon: { fontSize: 18 },
  badgeCount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textOnPrimary,
  },
  badgeCurrency: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },

  /* ── List ── */
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sectionHeaderSpaced: {
    marginTop: Spacing.xl,
  },
  sectionIcon: { fontSize: 20 },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
  },

  /* ── Empty ── */
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
  },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },
});
