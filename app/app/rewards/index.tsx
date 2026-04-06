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
      {/* Balance hero */}
      <View style={styles.hero}>
        {selectedReader ? (
          <>
            <Text style={styles.readerName}>{selectedReader.name}</Text>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>{t('rewards.totalBalance')}</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceCoin}>🪙</Text>
                <Text style={styles.balanceAmount}>{totalBalance.toFixed(2)}</Text>
              </View>
              <Text style={styles.balanceCurrency}>Livrux</Text>
            </View>

            {/* Spend button */}
            <TouchableOpacity
              style={styles.spendButton}
              onPress={() => router.push(`/app/spend?readerId=${selectedReader.id}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.spendButtonText}>💸 {t('rewards.spendButton')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.noReaderText}>
            {t('home.emptyTitle')}
          </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  hero: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  readerName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
    marginBottom: Spacing.md,
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
    backgroundColor: Colors.secondary,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    ...Shadows.sm,
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
    paddingBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
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
