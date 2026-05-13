import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  AppState,
  Image,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';

import { useBooks, useReadingBooks } from '../../../src/hooks/useBooks';
import { useReaderStore } from '../../../src/stores/readerStore';
import { useReaders } from '../../../src/hooks/useReaders';
import { useDialogStore } from '../../../src/stores/dialogStore';
import { useParentalStore } from '../../../src/stores/parentalStore';
import { useStreak } from '../../../src/hooks/useStreak';
import { useBadges } from '../../../src/hooks/useBadges';
import { useTheme } from '../../../src/hooks/useTheme';
import { GestureDetector } from 'react-native-gesture-handler';
import { useTabSwipe } from '../../../src/hooks/useTabSwipe';
import { supabase } from '../../../src/lib/supabase';
import { BookCard } from '../../../src/components/book/BookCard';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { MultiavatarView } from '../../../src/components/reader/MultiavatarView';
import { FloatingEmojis } from '../../../src/components/FloatingEmojis';
import { Fonts, FontSizes, Spacing, Radius, Shadows, type ColorPalette } from '../../../src/constants/theme';
import type { Reader } from '../../../src/types';

const AVATAR_SIZE = 80;

function createStyles(theme: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1, backgroundColor: 'transparent' },

    heroBanner: {
      alignItems: 'center',
      borderRadius: Radius.xl,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.xs,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
      overflow: 'hidden',
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
      color: theme.textOnPrimary,
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
      color: theme.textOnPrimary,
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
      backgroundColor: theme.chipCoin,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      ...Shadows.sm,
    },
    badgeCoin: { fontSize: 20 },
    balanceAmount: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes.lg,
      color: theme.textOnPrimary,
    },
    xpAmount: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes.lg,
      color: '#78350F',
    },
    xpCurrency: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.sm,
      color: '#92400E',
    },
    xpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: '#FCD34D',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      ...Shadows.sm,
    },
    badgesBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: '#22C55E',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      ...Shadows.sm,
    },
    badgeIcon: { fontSize: 18 },
    booksCount: {
      marginTop: 3,
      fontFamily: Fonts.heading,
      fontSize: FontSizes.lg,
      color: theme.textOnPrimary,
    },
    streakRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    streakChip: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    streakText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.md,
      color: theme.textOnPrimary,
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
      paddingVertical: Spacing.xs,
      alignItems: 'center',
    },
    bookRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: Spacing.xs,
      marginTop: Spacing.sm,
    },
    booksChipText: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.xs,
      color: theme.textOnPrimary,
    },
    addBookBtn: {
      alignSelf: 'stretch',
      marginTop: Spacing.lg,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: Radius.xl,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.55)',
    },
    addBookBtnText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.md,
      color: theme.textOnPrimary,
    },
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
      color: theme.secondary,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: Spacing['2xl'],
    },
    emptyIcon: { width: 56, height: 56, marginBottom: Spacing.md },
    emptyTitle: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes.xl,
      color: theme.textPrimary,
      marginBottom: Spacing.xs,
      textAlign: 'center',
    },
    emptySubtext: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.sm,
      color: theme.textSecondary,
      textAlign: 'center',
      paddingHorizontal: Spacing.xl,
      lineHeight: 20,
    },
    bookIcon: {
      width: 25,
      height: 25,
      resizeMode: 'contain',
    },
  });
}

export default function ReaderDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedReader, setSelectedReader, bookPersistedCount, loadThemeForReader } = useReaderStore();
  const { deleteReader } = useReaders();
  const showDialog = useDialogStore((s) => s.show);
  const { books, isLoading, refresh, fetchNextPage, hasNextPage, isFetchingNextPage } = useBooks(id ?? null);
  const { readingBooks, refresh: refreshReading } = useReadingBooks(id ?? null);
  const { streak } = useStreak(id ?? null);
  const { earnedBadges, refresh: refreshBadges } = useBadges(id ?? null);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const swipeGesture = useTabSwipe('reader');

  const completedBooks = books;
  const { canEditReader, isParentUnlocked } = useParentalStore();
  const appStateRef = useRef(AppState.currentState);
  const flatListRef = useRef<any>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        refresh();
        refreshReading();
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

  const canEdit = true;
  const canDelete = isParentUnlocked;

  useEffect(() => {
    if (bookPersistedCount > 0) {
      refresh();
      refreshReading();
      refreshBadges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookPersistedCount]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshReading();
      refreshBadges();
      if (id) {
        loadThemeForReader(id);
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
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.root}>
          <LinearGradient
            colors={theme.backgroundGradient}
            locations={[0, 0.6, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.safe}>
            <ActivityIndicator color={theme.secondary} style={{ flex: 1 }} />
          </SafeAreaView>
        </View>
      </GestureDetector>
    );
  }

  const handleDelete = () => {
    showDialog({
      title: t('reader.deleteReader'),
      message: t('reader.deleteConfirm', { name: reader.name }),
      confirmLabel: t('common.delete'),
      danger: true,
      onConfirm: async () => {
        await deleteReader(reader.id);
        router.replace('/app');
      },
    });
  };

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.root}>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.background} />
      <LinearGradient
        colors={theme.backgroundGradient}
        locations={[0, 0.6, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <FloatingEmojis />

      <SafeAreaView style={styles.safe}>
        {/* ── Hero banner ── */}
        <LinearGradient
          colors={[theme.secondary, theme.secondary2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          {/* Actions row */}
          <View style={styles.bannerHeader}>
            <View style={styles.bannerActions}>
              <TouchableOpacity
                onPress={() => router.push(`/app/reader/add?editId=${reader.id}`)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>{t('reader.editReader')}</Text>
              </TouchableOpacity>
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
          </View>

          {/* Avatar + Name */}
          <View style={styles.heroContent}>
            <View style={styles.avatarRing}>
              <MultiavatarView
                seed={reader.avatar_seed}
                size={AVATAR_SIZE}
                borderColor="rgba(255,255,255,0.9)"
                borderWidth={4}
              />
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.readerName} numberOfLines={2}>{reader.name}</Text>
            </View>
          </View>

          {/* Stats chips */}
          <View style={styles.heroBadgesRow}>
            <View style={styles.balanceBadge}>
              <Text style={styles.badgeCoin}>🪙</Text>
              <Text style={styles.balanceAmount}>{reader.livrux_balance.toFixed(2)}</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.badgeCoin}>⭐</Text>
              <Text style={styles.xpAmount}>{reader.xp}</Text>
              <Text style={styles.xpCurrency}>XP</Text>
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

          {/* Streak + books row */}
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
              <View style={styles.bookRow}>
                <Image source={require('../../../assets/livrux-clean.png')} style={styles.bookIcon} />
                <Text style={styles.booksCount}>{completedBooks.length} </Text>
              </View>
              <Text style={styles.booksChipText}>{t('reader.books')}</Text>
            </View>
          </View>

          {/* Add book button */}
          <TouchableOpacity
            style={styles.addBookBtn}
            onPress={() => router.push(`/app/book/add?readerId=${reader.id}&bookCount=${books.length}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.addBookBtnText}>📖 + {t('book.logBook')}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Books list ── */}
        <FlashList
          ref={flatListRef}
          data={completedBooks}
          keyExtractor={(item) => item.id}
          drawDistance={500}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => { refresh(); refreshReading(); }}
              tintColor={theme.secondary}
            />
          }
          onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <>
              {readingBooks.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionIcon}>📖</Text>
                    <Text style={styles.sectionTitle}>{t('reader.readingNow')}</Text>
                  </View>
                  {readingBooks.map((item) => (
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
                  <Text style={styles.sectionTitle}>{t('reader.books')}</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !isLoading && readingBooks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Image source={require('../../../assets/livrux-clean.png')} style={styles.emptyIcon} />
                <Text style={styles.emptyTitle}>{t('reader.noBooks')}</Text>
                <Text style={styles.emptySubtext}>{t('reader.noBooksHint')}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={theme.secondary} style={{ paddingVertical: 16 }} />
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
    </View>
    </GestureDetector>
  );
}
