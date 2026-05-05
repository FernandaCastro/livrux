import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLivrux } from '../../../src/hooks/useLivrux';
import { useReaderStore } from '../../../src/stores/readerStore';
import type { LivruxTransaction } from '../../../src/types';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { MultiavatarView } from '../../../src/components/reader/MultiavatarView';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';

function TransactionRow({ tx }: { tx: LivruxTransaction }) {
  const { t } = useTranslation();
  const isEarned = tx.amount > 0;
  const reasonKey =
    tx.reason === 'book_completed' ? 'rewards.reasonBookCompleted'
      : tx.reason === 'book_deleted' ? 'rewards.reasonBookDeleted'
        : tx.reason === 'book_updated' ? 'rewards.reasonBookUpdated'
          : 'rewards.reasonManualSpend';
  return (
    <View style={styles.txRow}>
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
    </View>
  );
}

export default function RewardsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedReader } = useReaderStore();
  const { transactions, isLoading, refresh } = useLivrux(selectedReader?.id ?? null);

  const totalBalance = selectedReader?.livrux_balance ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Gold banner */}
      <View style={styles.heroBanner}>
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
      </View>

      {/* Transaction history */}
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={transactions}
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
            <Text style={styles.sectionTitle}>{t('rewards.history')}</Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏦</Text>
              <Text style={styles.emptyText}>{t('rewards.emptyHistory')}</Text>
            </View>
          }
          renderItem={({ item }) => <TransactionRow tx={item} />}
        />
      )}
      <BottomMenu />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  heroBanner: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    ...Shadows.lg,
  },
  bannerAvatar: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  readerName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textOnPrimary,
    marginBottom: Spacing.sm,
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
    color: Colors.textOnPrimary,
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
    color: Colors.textOnPrimary,
  },
  noReaderText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textOnPrimary,
    marginBottom: Spacing.sm,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 4,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  txAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  txAccentEarned: { backgroundColor: Colors.success },
  txAccentSpent: { backgroundColor: Colors.error },
  txIcon: { fontSize: 24, marginRight: Spacing.md },
  txInfo: { flex: 1 },
  txDescription: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  txReason: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  txDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textDisabled,
    marginTop: 2,
  },
  txAmount: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: FontSizes.md,
  },
  earned: { color: Colors.success },
  spent: { color: Colors.error },
  empty: { alignItems: 'center', paddingTop: Spacing['2xl'] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});
