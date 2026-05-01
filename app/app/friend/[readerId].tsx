import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
}

export default function FriendProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { readerId, fromReaderId } = useLocalSearchParams<{ readerId: string; fromReaderId: string }>();

  const [friendReader, setFriendReader] = useState<FriendReader | null>(null);
  const [readerLoading, setReaderLoading] = useState(true);

  const { books, isLoading: booksLoading, refresh: refreshBooks } = useBooks(readerId ?? null);

  const fetchReader = useCallback(async () => {
    if (!readerId) return;
    setReaderLoading(true);
    const { data } = await supabase
      .from('readers')
      .select('id, name, avatar_seed')
      .eq('id', readerId)
      .single();
    setFriendReader(data ?? null);
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
      {/* Hero banner — back button + avatar + name + stats */}
      <View style={styles.heroBanner}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        {friendReader && (
          <View style={styles.heroContent}>
            <View style={styles.avatarRing}>
              <MultiavatarView
                seed={friendReader.avatar_seed}
                size={AVATAR_SIZE}
                borderColor={Colors.primaryLight}
                borderWidth={4}
              />
            </View>

            <Text style={styles.readerName}>{friendReader.name}</Text>

            <View style={styles.statsBadge}>
              <Text style={styles.statsBadgeIcon}>📚</Text>
              <Text style={styles.statsBadgeCount}>{books.length}</Text>
              <Text style={styles.statsBadgeLabel}>{t('reader.books')}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Books list */}
      <FlatList
        data={books}
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
          books.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📖</Text>
              <Text style={styles.sectionTitle}>{t('reader.books')}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🌱</Text>
              <Text style={styles.emptyTitle}>{t('reader.noBooks')}</Text>
              <Text style={styles.emptySubtext}>{friendReader?.name} {t('friends.noBooksSub')}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <FriendBookCard book={item} />}
      />

      <BottomMenu showWallet showFriends readerId={fromReaderId} />
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  /* ── Hero ── */
  heroBanner: {
    backgroundColor: Colors.friendEmerald,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.xl,
    paddingBottom: Spacing.xl,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    ...Shadows.lg,
  },
  backBtn: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xl,
    color: 'rgba(255,255,255,0.85)',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  avatarRing: {
    borderRadius: Radius.full,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    ...Shadows.md,
  },
  readerName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textOnPrimary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  statsBadgeIcon: { fontSize: 18 },
  statsBadgeCount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textOnPrimary,
  },
  statsBadgeLabel: {
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
