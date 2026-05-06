import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  AppState,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef } from 'react';

import { useBooks } from '../../../src/hooks/useBooks';
import { useReaderStore } from '../../../src/stores/readerStore';
import { useReaders } from '../../../src/hooks/useReaders';
import { useParentalStore } from '../../../src/stores/parentalStore';
import { useStreak } from '../../../src/hooks/useStreak';
import { useBadges } from '../../../src/hooks/useBadges';
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
  const { streak } = useStreak(id ?? null);
  const { earnedBadges, refresh: refreshBadges } = useBadges(id ?? null);

  const readingNow = books.filter((b) => b.status === 'reading');
  const completedBooks = books.filter((b) => b.status === 'completed');
  const { canEditReader, isParentUnlocked } = useParentalStore();
  const appStateRef = useRef(AppState.currentState);
  const flatListRef = useRef<any>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        // Synchronous state update forces an immediate re-render so SafeAreaView
        // recalculates its insets before the async data fetches complete.
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        refresh();
        refreshBadges();
        if (id) {
          supabase
            .from('readers')
            .select('*')
            .eq('id', id)
            .single()
            .then(({ data }) => { if (data) setSelectedReader(data as Reader); });
        }
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [id]);

  const canEdit = canEditReader(id);
  const canDelete = isParentUnlocked;

  useEffect(() => {
    if (bookPersistedCount > 0 && id) {
      refresh();
      refreshBadges();
      supabase
        .from('readers')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => { if (data) setSelectedReader(data as Reader); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookPersistedCount]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshBadges();
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
      {/* ── Hero banner ── */}
      <View style={styles.heroBanner}>
        {/* Actions row — always rendered to keep heroBanner height stable.
            Buttons are only visible when the parent has unlocked edit/delete. */}
        <View style={styles.bannerHeader}>
          {(canEdit || canDelete) && (
            <View style={styles.bannerActions}>
              {canEdit && (
                <TouchableOpacity
                  onPress={() => router.push(`/app/reader/add?editId=${reader.id}`)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionBtnText}>{t('reader.editReader')}</Text>
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.actionBtn, styles.actionBtnDelete]}
                >
                  <Text style={styles.actionBtnDeleteText}>{t('reader.deleteReader')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Avatar (left) + Name aligned to avatar bottom (right) */}
        <View style={styles.heroContent}>
          <View style={styles.avatarRing}>
            <MultiavatarView
              seed={reader.avatar_seed}
              size={AVATAR_SIZE}
              borderColor={Colors.primaryLight}
              borderWidth={4}
            />
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.readerName} numberOfLines={2}>{reader.name}</Text>
          </View>
        </View>

        {/* Livrux + XP + Conquistas */}
        <View style={styles.heroBadgesRow}>
          <View style={styles.balanceBadge}>
            <Text style={styles.badgeCoin}>🪙</Text>
            <Text style={styles.balanceAmount}>{reader.livrux_balance.toFixed(2)}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.badgeCoin}>⭐</Text>
            <Text style={styles.balanceAmount}>{reader.xp}</Text>
            <Text style={styles.balanceCurrency}>XP</Text>
          </View>
          <TouchableOpacity
            style={styles.badgesBadge}
            onPress={() => router.push('/app/badges')}
            activeOpacity={0.75}
          >
            <Text style={styles.badgeIcon}>🏅</Text>
            <Text style={styles.booksCount}>{earnedBadges.length}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Streak + books row ── */}
        <View style={styles.streakRow}>
          <View style={styles.streakChip}>
            <Text style={styles.streakText}>
              {streak.current_streak > 0
                ? t(streak.current_streak === 1 ? 'streak.current' : 'streak.current_plural', { count: streak.current_streak })
                : '🔥 0'}
            </Text>
            {streak.best_streak > 0 && (
              <Text style={styles.streakBest}>{t('streak.best', { count: streak.best_streak })}</Text>
            )}
          </View>
          <View style={styles.booksChip}>
            <Text style={styles.booksCount}>📚 {completedBooks.length} </Text>
            <Text style={styles.booksChipText}>{t('reader.books')}</Text>
          </View>
        </View>

        {/* ── Add book button ── */}
        <TouchableOpacity
          style={styles.addBookBtn}
          onPress={() => router.push(`/app/book/add?readerId=${reader.id}&bookCount=${books.length}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.addBookBtnText}>📖 + {t('book.logBook')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Books list ── */}
      <FlatList
        ref={flatListRef}
        data={completedBooks}
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
          <>
            {/* Currently reading section */}
            {readingNow.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📖</Text>
                  <Text style={styles.sectionTitle}>{t('reader.readingNow')}</Text>
                </View>
                {readingNow.map((item) => (
                  <BookCard
                    key={item.id}
                    book={item}
                    onPress={() => router.push(`/app/book/${item.id}`)}
                    onLongPress={canEdit ? () => router.push(`/app/book/edit?bookId=${item.id}`) : undefined}
                  />
                ))}
              </>
            )}
            {completedBooks.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>✅</Text>
                <Text style={styles.sectionTitle}>{t('reader.books')}</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading && readingNow.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>{t('reader.noBooks')}</Text>
              <Text style={styles.emptySubtext}>{t('reader.noBooksHint')}</Text>
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

      <BottomMenu />
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  /* ── Hero ── */
  heroBanner: {
    backgroundColor: Colors.readerBlue,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    ...Shadows.lg,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
    paddingTop: Spacing.md,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  actionBtnDelete: {
    backgroundColor: 'rgba(255,100,100,0.25)',
  },
  actionBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textOnPrimary,
  },
  actionBtnDeleteText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: '#FFB3B3',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  heroRight: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  avatarRing: {
    borderRadius: Radius.full,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    ...Shadows.md,
    marginTop: -20,
  },
  readerName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textOnPrimary,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.chipCoin,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Shadows.sm,
  },
  badgeCoin: { fontSize: 20 },
  balanceAmount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textOnPrimary,
  },
  balanceCurrency: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.chipXp,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Shadows.sm,
  },
  badgesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.chipBadge,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Shadows.sm,
  },
  badgeIcon: { fontSize: 18 },
  booksCount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textOnPrimary,
  },
  booksLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },

  /* ── Streak ── */
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  streakChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  streakText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
  },
  streakBest: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  booksChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  badgesBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
  },
  booksChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.textOnPrimary,
  },

  /* ── Add book ── */
  addBookBtn: {
    alignSelf: 'stretch',
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.xl,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },

  addBookBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
  },

  /* ── List ── */
  list: {
    paddingHorizontal: Spacing.xl,
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
