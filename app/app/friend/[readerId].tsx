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
import { Colors, Fonts, FontSizes, Spacing, Radius } from '../../../src/constants/theme';

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ width: 32 }} />
      </View>

      {/* Hero */}
      {friendReader && (
        <View style={styles.hero}>
          <MultiavatarView
            seed={friendReader.avatar_seed}
            size={AVATAR_SIZE}
            borderColor={Colors.primaryLight}
            borderWidth={3}
          />
          <Text style={styles.readerName}>{friendReader.name}</Text>
          <View style={styles.booksBadge}>
            <Text style={styles.booksBadgeIcon}>📚</Text>
            <Text style={styles.booksBadgeCount}>{books.length}</Text>
            <Text style={styles.booksBadgeLabel}>{t('reader.books')}</Text>
          </View>
        </View>
      )}

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
          <Text style={styles.sectionTitle}>{t('reader.books')}</Text>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📖</Text>
              <Text style={styles.emptyText}>{t('reader.noBooks')}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <FriendBookCard book={item} />}
      />

      <BottomMenu showWallet showFriends readerId={fromReaderId} />
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 88;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xl,
    color: Colors.secondary,
  },
  hero: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  readerName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  booksBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  booksBadgeIcon: { fontSize: 18 },
  booksBadgeCount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.secondary,
  },
  booksBadgeLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyContainer: { alignItems: 'center', paddingTop: Spacing['2xl'] },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.sm },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});
