import { useMemo } from 'react';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useTabSwipe } from '../../../src/hooks/useTabSwipe';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

import { useReaderStore } from '../../../src/stores/readerStore';
import { useFriends } from '../../../src/hooks/useFriends';
import { useTheme } from '../../../src/hooks/useTheme';
import { MultiavatarView } from '../../../src/components/reader/MultiavatarView';
import { Fonts, FontSizes, Spacing, Radius, Shadows, createShadows, type ColorPalette } from '../../../src/constants/theme';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { FloatingEmojis } from '@/components/FloatingEmojis';

const ACCENT = '#FF6B35';

interface RankingEntry {
  id: string;
  name: string;
  avatar_seed: string | null;
  xp: number;
  book_count: number;
  isMe: boolean;
}

function positionEmoji(pos: number): string {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return `${pos}`;
}

function createStyles(theme: ColorPalette) {
  const S = createShadows(theme.shadowColor);
  return StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1, backgroundColor: 'transparent' },
    hero: {
      marginTop: Spacing.xs,
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.md,
      borderRadius: Radius.xl,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing['2xl'],
      paddingBottom: Spacing['2xl'],
      alignItems: 'center',
      gap: Spacing.sm,
      ...S.lg,
    },
    heroTitle: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes['2xl'],
      color: theme.textOnPrimary,
      letterSpacing: 1,
    },
    heroPositionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    heroMedal: { fontSize: 38 },
    heroPositionText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.lg,
      color: theme.textOnPrimary,
      opacity: 0.92,
    },
    list: { flex: 1 },
    listContent: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: BOTTOM_MENU_HEIGHT + Spacing.xl,
      gap: Spacing.sm,
    },
    loader: { marginTop: Spacing['3xl'] },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      gap: Spacing.md,
      overflow: 'hidden',
      ...S.sm,
    },
    myRow: {
      backgroundColor: theme.statusBarStyle === 'light'
        ? 'rgba(255,107,53,0.15)'
        : '#FFF5F0',
    },
    myAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: ACCENT,
      borderTopLeftRadius: Radius.lg,
      borderBottomLeftRadius: Radius.lg,
    },
    positionWrap: {
      width: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    medal: { fontSize: 28 },
    positionCircle: {
      width: 30,
      height: 30,
      borderRadius: Radius.full,
      backgroundColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    positionNum: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.sm,
      color: theme.textSecondary,
    },
    rowInfo: { flex: 1, gap: 2 },
    rowNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    rowName: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.md,
      color: theme.textPrimary,
      flexShrink: 1,
    },
    myName: { color: ACCENT },
    youBadge: {
      backgroundColor: ACCENT,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    youLabel: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.xs,
      color: theme.textOnPrimary,
    },
    rowStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    bookIcon: { width: 25, height: 25, resizeMode: 'contain' },
    bookBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: '#38BDF8',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 0,
    },
    bookCount: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.xs,
      color: theme.textOnPrimary,
    },
    xpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: '#FCD34D',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
    },
    xpIcon: { fontSize: 13 },
    xpCount: {
      marginTop: 1,
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.xs,
      color: '#78350F',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: Spacing['2xl'],
      paddingHorizontal: Spacing.xl,
      gap: Spacing.sm,
    },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.xs },
    emptyText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.lg,
      color: theme.textPrimary,
      textAlign: 'center',
    },
    emptySubtext: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.md,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
}

function RankingRow({ entry, position, styles }: { entry: RankingEntry; position: number; styles: ReturnType<typeof createStyles> }) {
  const { t } = useTranslation();
  const isTop3 = position <= 3;

  return (
    <View style={[styles.row, entry.isMe && styles.myRow]}>
      {entry.isMe && <View style={styles.myAccent} />}
      <View style={styles.positionWrap}>
        {isTop3 ? (
          <Text style={styles.medal}>{positionEmoji(position)}</Text>
        ) : (
          <View style={styles.positionCircle}>
            <Text style={styles.positionNum}>{position}</Text>
          </View>
        )}
      </View>
      <MultiavatarView seed={entry.avatar_seed} size={46} />
      <View style={styles.rowInfo}>
        <View style={styles.rowNameRow}>
          <Text style={[styles.rowName, entry.isMe && styles.myName]} numberOfLines={1}>
            {entry.name}
          </Text>
          {entry.isMe && (
            <View style={styles.youBadge}>
              <Text style={styles.youLabel}>{t('ranking.you')}</Text>
            </View>
          )}
        </View>
        <View style={styles.rowStats}>
          <View style={styles.bookBadge}>
            <Image source={require('../../../assets/livrux-clean.png')} style={styles.bookIcon} />
            <Text style={styles.bookCount}>{entry.book_count} {t('friends.booksRead')}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpIcon}>⭐</Text>
            <Text style={styles.xpCount}>{entry.xp} XP</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function RankingScreen() {
  const { t } = useTranslation();
  const { selectedReader } = useReaderStore();
  const { friends, isLoading } = useFriends(selectedReader?.id ?? null);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { gesture: swipeGesture, animatedStyle: swipeStyle } = useTabSwipe('ranking');

  const entries = useMemo<RankingEntry[]>(() => {
    if (!selectedReader) return [];
    const me: RankingEntry = {
      id: selectedReader.id,
      name: selectedReader.name,
      avatar_seed: selectedReader.avatar_seed,
      xp: selectedReader.xp,
      book_count: selectedReader.book_count ?? 0,
      isMe: true,
    };
    const friendEntries: RankingEntry[] = friends.map((f) => ({
      id: f.reader.id,
      name: f.reader.name,
      avatar_seed: f.reader.avatar_seed,
      xp: f.reader.xp,
      book_count: f.reader.book_count,
      isMe: false,
    }));
    return [me, ...friendEntries].sort((a, b) => b.xp - a.xp);
  }, [selectedReader, friends]);

  const myPosition = entries.findIndex((e) => e.isMe) + 1;
  const hasFriends = friends.length > 0;

  if (!selectedReader) return null;

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[styles.root, swipeStyle]}>
      <Stack.Screen options={{ animation: 'none' }} />
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
        {/* Orange hero — fixed ranking accent */}
        <LinearGradient
          colors={['#FF6B35', '#FF9B50']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>{t('ranking.title')}</Text>
          <View style={styles.heroPositionRow}>
            <Text style={styles.heroMedal}>{positionEmoji(myPosition || 1)}</Text>
            <Text style={styles.heroPositionText}>
              {t('ranking.yourPosition', { position: myPosition || 1 })}
            </Text>
          </View>
        </LinearGradient>

        <FlatList
          style={styles.list}
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <RankingRow entry={item} position={index + 1} styles={styles} />
          )}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator size="large" color={ACCENT} style={styles.loader} />
            ) : null
          }
          ListFooterComponent={
            !isLoading && !hasFriends ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🤔</Text>
                <Text style={styles.emptyText}>{t('ranking.noFriends')}</Text>
                <Text style={styles.emptySubtext}>{t('ranking.noFriendsHint')}</Text>
              </View>
            ) : null
          }
        />
        <BottomMenu />
      </SafeAreaView>
      </Animated.View>
    </GestureDetector>
  );
}
