import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect } from 'react';

import { useBooks } from '../../../src/hooks/useBooks';
import { useReaderStore } from '../../../src/stores/readerStore';
import { useReaders } from '../../../src/hooks/useReaders';
import { useParentalStore } from '../../../src/stores/parentalStore';
import { supabase } from '../../../src/lib/supabase';
import { BookCard } from '../../../src/components/book/BookCard';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { MultiavatarView } from '../../../src/components/reader/MultiavatarView';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';
import type { Reader } from '../../../src/types';

export default function ReaderDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedReader, setSelectedReader, bookPersistedCount } = useReaderStore();
  const { deleteReader } = useReaders();
  const { books, isLoading, refresh } = useBooks(id ?? null);
  const { canEditReader, canAccessReader } = useParentalStore();

  const canEdit = canEditReader();
  const canAccess = canAccessReader(id ?? '');

  // Refresh books + reader data whenever a book is successfully persisted to
  // the DB — the confetti animation plays during this window, so this update
  // lands right as (or just after) the overlay fades out.
  useEffect(() => {
    if (bookPersistedCount > 0 && id) {
      refresh();
      supabase
        .from('readers')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => { if (data) setSelectedReader(data as Reader); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookPersistedCount]);

  // Refresh books list and re-fetch the reader from DB to get the latest balance.
  useFocusEffect(
    useCallback(() => {
      refresh();
      if (id) {
        supabase
          .from('readers')
          .select('*')
          .eq('id', id)
          .single()
          .then(({ data }) => { if (data) setSelectedReader(data as Reader); });
      }
    }, [id])
  );

  // Use reader data from the store (set when the card was tapped on Home).
  const reader = selectedReader;

  if (!reader) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      t('reader.deleteReader'),
      t('reader.deleteConfirm', { name: reader.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteReader(reader.id);
            router.replace('/app');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {canAccess && (
            <TouchableOpacity
              onPress={() => router.push(`/app/reader/add?editId=${reader.id}`)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.editText}>{t('reader.editReader')}</Text>
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity
              onPress={handleDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteText}>{t('reader.deleteReader')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Reader hero */}
      <View style={styles.hero}>
        <MultiavatarView
          seed={reader.avatar_seed}
          size={AVATAR_SIZE}
          borderColor={Colors.primaryLight}
          borderWidth={3}
        />
        <Text style={styles.readerName}>{reader.name}</Text>
      </View>

      <View style={styles.heroBalance}>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{books.length}</Text>
            <Text style={styles.statLabel}>{t('reader.books')}</Text>
          </View>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('reader.balance')}</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceCoin}>🪙</Text>
            <Text style={styles.balanceAmount}>
              {reader.livrux_balance.toFixed(2)}
            </Text>
            <Text style={styles.balanceCurrency}>Livrux</Text>
          </View>
        </View>
      </View>

      {/* Add book button — fixed, centered below the stats/balance section */}
      <TouchableOpacity
        style={styles.addBookButton}
        onPress={() => router.push(`/app/book/add?readerId=${reader.id}&bookCount=${books.length}`)}
        activeOpacity={0.85}
      >
        <Text style={styles.addBookButtonText}>+ {t('book.logBook')}</Text>
      </TouchableOpacity>
      <View style={styles.addBookButtonDivider} />

      {/* Books list */}
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>{t('reader.books')}</Text>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyText}>{t('reader.noBooks')}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <BookCard
            book={item}
            onPress={() => router.push(`/app/book/${item.id}`)}
            onLongPress={canEdit ? () => router.push(`/app/book/edit?bookId=${item.id}`) : undefined}
          />
        )}
      />

      <BottomMenu showWallet readerId={id} />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  editText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.secondary,
  },
  deleteText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.error,
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  heroBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  readerName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    paddingLeft: 10,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.md,
    marginBottom: Spacing.xs,
  },
  balanceLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  balanceCoin: { fontSize: 28 },
  balanceAmount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['4xl'],
    color: Colors.textOnPrimary,
  },
  balanceCurrency: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  stat: { alignItems: 'center' },
  statValue: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.secondary,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyContainer: { alignItems: 'center', paddingTop: Spacing['2xl'] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  addBookButton: {
    alignSelf: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: 0,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  addBookButtonDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: Spacing.xs,
  },
  addBookButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
  },
});
