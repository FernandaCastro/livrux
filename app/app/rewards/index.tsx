import { useMemo } from 'react';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useTabSwipe } from '../../../src/hooks/useTabSwipe';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  AppState,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

import { useLivrux } from '../../../src/hooks/useLivrux';
import { useReaderStore } from '../../../src/stores/readerStore';
import { useTheme } from '../../../src/hooks/useTheme';
import type { LivruxTransaction } from '../../../src/types';
import { FloatingEmojis } from '../../../src/components/FloatingEmojis';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { MultiavatarView } from '../../../src/components/reader/MultiavatarView';
import { Fonts, FontSizes, Spacing, Radius, Shadows, createShadows, type ColorPalette } from '../../../src/constants/theme';

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
      paddingVertical: Spacing.xl,
      alignItems: 'center',
      ...S.lg,
    },
    bannerAvatar: {
      position: 'absolute',
      top: Spacing.md,
      left: Spacing.md,
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
    balanceCoin: { fontSize: 36 },
    balanceAmount: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes['4xl'],
      color: theme.textOnPrimary,
    },
    balanceCurrency: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.md,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
    },
    spendButton: {
      alignSelf: 'stretch',
      marginTop: Spacing.lg,
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: Radius.xl,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.6)',
    },
    spendButtonText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.md,
      color: theme.textOnPrimary,
    },
    noReaderText: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.md,
      color: theme.textSecondary,
    },
    list: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: BOTTOM_MENU_HEIGHT + Spacing.xl,
    },
    sectionTitle: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes.lg,
      letterSpacing: 0.8,
      color: theme.primary,
      marginBottom: Spacing.md,
    },
    title: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes['2xl'],
      color: theme.textOnPrimary,
      marginBottom: Spacing.sm,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: Radius.md,
      padding: Spacing.md,
      paddingLeft: Spacing.md + 4,
      marginBottom: Spacing.sm,
      overflow: 'hidden',
      ...S.sm,
    },
    txAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },
    txAccentEarned: { backgroundColor: theme.success },
    txAccentSpent: { backgroundColor: theme.error },
    txIcon: { fontSize: 24, marginRight: Spacing.md },
    txInfo: { flex: 1 },
    txDescription: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.sm,
      color: theme.textPrimary,
    },
    txReason: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.xs,
      color: theme.textSecondary,
      marginTop: 1,
      textTransform: 'capitalize',
    },
    txDate: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.xs,
      color: theme.textDisabled,
      marginTop: 2,
    },
    txAmount: {
      fontFamily: Fonts.bodyExtraBold,
      fontSize: FontSizes.md,
    },
    earned: { color: theme.success },
    spent: { color: theme.error },
    empty: { alignItems: 'center', paddingTop: Spacing['2xl'] },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
    emptyText: {
      fontFamily: Fonts.body,
      fontSize: FontSizes.md,
      color: theme.textSecondary,
    },
  });
}

function TransactionRow({ tx }: { tx: LivruxTransaction }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isEarned = tx.amount > 0;
  const reasonKey =
    tx.reason === 'book_completed' ? 'rewards.reasonBookCompleted'
      : tx.reason === 'book_deleted' ? 'rewards.reasonBookDeleted'
        : tx.reason === 'book_updated' ? 'rewards.reasonBookUpdated'
          : 'rewards.reasonManualSpend';

  return (
    <LinearGradient
      colors={theme.cardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.txRow}
    >
      <View style={[styles.txAccent, isEarned ? styles.txAccentEarned : styles.txAccentSpent]} />
      <Text style={styles.txIcon}>{isEarned ? '🪙' : '💸'}</Text>
      <View style={styles.txInfo}>
        <Text style={styles.txDescription} numberOfLines={1}>
          {tx.description ?? t(reasonKey)}
        </Text>
        <Text style={styles.txReason}>{t(reasonKey)}</Text>
        <Text style={styles.txDate}>
          {format(new Date(tx.created_at), 'dd/MM/yyyy')}
        </Text>
      </View>
      <Text style={[styles.txAmount, isEarned ? styles.earned : styles.spent]}>
        {isEarned ? '+' : ''}{tx.amount.toFixed(2)} Lx
      </Text>
    </LinearGradient>
  );
}

export default function RewardsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedReader } = useReaderStore();
  const { transactions, isLoading, refresh, fetchNextPage, hasNextPage, isFetchingNextPage } = useLivrux(selectedReader?.id ?? null);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const appStateRef = useRef(AppState.currentState);
  const { gesture: swipeGesture, animatedStyle: swipeStyle } = useTabSwipe('rewards');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') refresh();
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  const totalBalance = selectedReader?.livrux_balance ?? 0;

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
        {/* Gold banner — fixed brand color, intentionally not themed */}
        <LinearGradient
          colors={['#F5A623', '#FF7F3E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          {selectedReader ? (
            <>
              <View style={styles.bannerAvatar}>
                <MultiavatarView seed={selectedReader.avatar_seed} size={38} borderColor="rgba(255,255,255,0.6)" borderWidth={2} />
              </View>
              <Text style={styles.title}>{t('rewards.title')}</Text>
              <Text style={styles.balanceLabel}>{t('rewards.totalBalance')}</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceCoin}>🪙</Text>
                <Text style={styles.balanceAmount}>{totalBalance.toFixed(2)}</Text>
                <Text style={styles.balanceCurrency}>Livrux</Text>
              </View>
              <TouchableOpacity
                style={styles.spendButton}
                onPress={() => router.push(`/app/spend?readerId=${selectedReader.id}`)}
                activeOpacity={0.85}
              >
                <Text style={styles.spendButtonText}>💸 {t('rewards.spendButton')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.noReaderText}>{t('home.emptyTitle')}</Text>
          )}
        </LinearGradient>

        {isLoading ? (
          <ActivityIndicator color={theme.secondary} style={{ flex: 1 }} />
        ) : (
          <FlashList
            data={transactions}
            keyExtractor={(item) => item.id}
            drawDistance={500}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refresh}
                tintColor={theme.secondary}
              />
            }
            onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
            onEndReachedThreshold={0.4}
            ListHeaderComponent={
              <Text style={styles.sectionTitle}>{t('rewards.history')}</Text>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🏦</Text>
                <Text style={styles.emptyText}>{t('rewards.emptyHistory')}</Text>
              </View>
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator color={theme.secondary} style={{ paddingVertical: 16 }} />
              ) : null
            }
            renderItem={({ item }) => <TransactionRow tx={item} />}
          />
        )}
        <BottomMenu />
      </SafeAreaView>
      </Animated.View>
    </GestureDetector>
  );
}
