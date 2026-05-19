import { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  AppState,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback, useRef } from 'react';

import { supabase } from '../../../../src/lib/supabase';
import { useBooks, useReadingBooks } from '../../../../src/hooks/useBooks';
import { useTheme } from '../../../../src/hooks/useTheme';
import { MultiavatarView } from '../../../../src/components/reader/MultiavatarView';
import { FriendBookCard } from '../../../../src/components/book/FriendBookCard';
import { FloatingEmojis } from '../../../../src/components/FloatingEmojis';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../../src/components/BottomMenu';
import { Fonts, FontSizes, Spacing, Radius, Shadows, createShadows, type ColorPalette } from '../../../../src/constants/theme';
import { BackButton } from '../../../../src/components/BackButton';

interface FriendReader {
  id: string;
  name: string;
  avatar_seed: string | null;
  xp: number;
}

const AVATAR_SIZE = 80;

function createStyles(theme: ColorPalette) {
  const S = createShadows(theme.shadowColor);
  return StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1, backgroundColor: 'transparent' },
    heroBanner: {
      borderRadius: Radius.xl,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.xs,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xl,
      ...S.lg,
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
      ...S.md,
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
      color: theme.textOnPrimary,
    },
    heroBadgesRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.sm,
    },
    statChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: '#38BDF8',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      ...S.sm,
    },
    statChipIcon: {
      width: FontSizes['3xl'],
      height: FontSizes['3xl'],
      resizeMode: 'contain',
    },
    statChipText: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes.lg,
      color: theme.textOnPrimary,
    },
    xpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: '#FCD34D',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      ...S.sm,
    },
    badgesBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: '#22C55E',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      ...S.sm,
    },
    badgeIcon: { fontSize: 18 },
    badgeCount: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes.lg,
      color: theme.textOnPrimary,
    },
    badgeChevron: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes.xl,
      color: 'rgba(255,255,255,0.7)',
      marginLeft: Spacing.xs,
    },
    badgeCountAmber: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes.lg,
      color: '#78350F',
    },
    badgeCurrencyAmber: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.sm,
      color: '#92400E',
    },
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
    sectionHeaderSpaced: { marginTop: Spacing.xl },
    sectionIcon: { fontSize: 20 },
    sectionTitle: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes.lg,
      color: theme.textPrimary,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: Spacing['2xl'],
    },
    emptyIcon: { fontSize: 56, marginBottom: Spacing.md },
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
  });
}

export default function FriendProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { readerId, fromReaderId } = useLocalSearchParams<{ readerId: string; fromReaderId: string }>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [friendReader, setFriendReader] = useState<FriendReader | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [readerLoading, setReaderLoading] = useState(true);

  const { books: completedBooks, isLoading: booksLoading, refresh: refreshBooks } = useBooks(readerId ?? null);
  const { readingBooks: readingNow, isLoading: readingLoading, refresh: refreshReading } = useReadingBooks(readerId ?? null);

  const fetchReader = useCallback(async () => {
    if (!readerId) return;
    setReaderLoading(true);
    const [{ data: readerData }, { count }] = await Promise.all([
      supabase.from('readers').select('id, name, avatar_seed, xp').eq('id', readerId).single(),
      supabase.from('reader_badges').select('*', { count: 'exact', head: true }).eq('reader_id', readerId),
    ]);
    setFriendReader(readerData ?? null);
    setBadgeCount(count ?? 0);
    setReaderLoading(false);
  }, [readerId]);

  useEffect(() => { fetchReader(); }, [fetchReader]);

  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        fetchReader();
        refreshBooks();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  const isLoading = readerLoading || booksLoading || readingLoading;

  const swipeBack = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-10, 10])
    .runOnJS(true)
    .onEnd((e) => {
      const isHorizontal = Math.abs(e.translationX) > Math.abs(e.translationY) * 2;
      if (!isHorizontal) return;
      if (e.translationX > 80) {
        router.back();
      } else if (e.translationX < -80) {
        router.push('/app/ranking');
      }
    });

  const bgGradient = (
    <LinearGradient
      colors={theme.backgroundGradient}
      locations={[0, 0.6, 1]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );

  if (readerLoading) {
    return (
      <View style={styles.root}>
        <StatusBar style={theme.statusBarStyle} backgroundColor={theme.background} />
        {bgGradient}
        <SafeAreaView style={styles.safe}>
          <ActivityIndicator color={theme.secondary} style={{ flex: 1 }} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <GestureDetector gesture={swipeBack}>
    <View style={styles.root}>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.background} />
      {bgGradient}
      <FloatingEmojis />
      <SafeAreaView style={styles.safe}>
        <BackButton style={{ paddingHorizontal: Spacing.xl }} />
        {/* Jade hero — fixed friends accent */}
        <LinearGradient
          colors={['#3ECA8C', '#0A6E48']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          {friendReader && (
            <>
              <View style={styles.heroContent}>
                <View style={styles.avatarRing}>
                  <MultiavatarView
                    seed={friendReader.avatar_seed}
                    size={AVATAR_SIZE}
                    borderColor={theme.friendEmeraldLight}
                    borderWidth={4}
                  />
                </View>
                <View style={styles.heroRight}>
                  <Text style={styles.readerName} numberOfLines={2}>
                    {friendReader.name}
                  </Text>
                </View>
              </View>

              <View style={styles.heroBadgesRow}>
                <View style={styles.xpBadge}>
                  <Text style={styles.badgeIcon}>⭐</Text>
                  <Text style={styles.badgeCountAmber}>{friendReader.xp}</Text>
                  <Text style={styles.badgeCurrencyAmber}>XP</Text>
                </View>
                <TouchableOpacity
                  style={styles.badgesBadge}
                  onPress={() => router.push(`/app/friends/badges/${readerId}?fromReaderId=${fromReaderId}`)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.badgeIcon}>🏅</Text>
                  <Text style={styles.badgeCount}>{badgeCount}</Text>
                  <Text style={styles.badgeChevron}>›</Text>
                </TouchableOpacity>
                <View style={styles.statChip}>
                  <Image source={require('../../../../assets/livrux-clean.png')} style={styles.statChipIcon} />
                  <Text style={styles.statChipText}>{completedBooks.length}</Text>
                </View>
              </View>
            </>
          )}
        </LinearGradient>

        <FlatList
          data={completedBooks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={async () => { await fetchReader(); await Promise.all([refreshBooks(), refreshReading()]); }}
              tintColor={theme.secondary}
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
            !isLoading && completedBooks.length === 0 && readingNow.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🌱</Text>
                <Text style={styles.emptyTitle}>{t('reader.noBooks')}</Text>
                <Text style={styles.emptySubtext}>{friendReader?.name} {t('friends.noBooksSub')}</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => <FriendBookCard book={item} />}
        />

        <BottomMenu />
      </SafeAreaView>
    </View>
    </GestureDetector>
  );
}
