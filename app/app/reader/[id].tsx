import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';

import { useBooks } from '../../../src/hooks/useBooks';
import { useReaderStore } from '../../../src/stores/readerStore';
import { useReaders } from '../../../src/hooks/useReaders';
import { useParentalStore } from '../../../src/stores/parentalStore';
import { supabase } from '../../../src/lib/supabase';
import { BookCard } from '../../../src/components/book/BookCard';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';
import type { Reader } from '../../../src/types';

export default function ReaderDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedReader, setSelectedReader } = useReaderStore();
  const { deleteReader } = useReaders();
  const { books, isLoading, refresh } = useBooks(id ?? null);
  const { canEditReader } = useParentalStore();
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  const canEdit = canEditReader();

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
            await deleteReader(reader.id, reader.avatar_url);
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
        {canEdit && (
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteText}>{t('reader.deleteReader')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Avatar full-screen modal */}
      {reader.avatar_url && (
        <Modal
          visible={avatarModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAvatarModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setAvatarModalVisible(false)}>
            <Image source={{ uri: reader.avatar_url }} style={styles.modalAvatar} resizeMode="contain" />
          </Pressable>
        </Modal>
      )}

      {/* Reader hero */}
      <View style={styles.hero}>
        {reader.avatar_url ? (
          <TouchableOpacity onPress={() => setAvatarModalVisible(true)} activeOpacity={0.85}>
            <Image source={{ uri: reader.avatar_url }} style={styles.avatar} />
          </TouchableOpacity>
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {reader.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
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


      {/* FAB — Log a book. Pass current count so add screen can compute prev/next for confetti. */}
      <TouchableOpacity
        style={styles.fabR}
        onPress={() => router.push(`/app/book/add?readerId=${reader.id}&bookCount=${books.length}`)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ {t('book.logBook')}</Text>
      </TouchableOpacity>

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
    borderBottomWidth: 0,
    borderBottomColor: Colors.divider,
  },
  heroBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
    marginBottom: Spacing.sm,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primaryLight,
    marginBottom: Spacing.sm,
  },
  avatarInitial: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    color: Colors.secondary,
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
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing.xl + Spacing['2xl'],
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatar: {
    width: '80%',
    aspectRatio: 1,
    borderRadius: 9999,
    borderWidth: 4,
    borderColor: Colors.primaryLight,
  },
  fabR: {
    position: 'absolute',
    bottom: BOTTOM_MENU_HEIGHT + Spacing.md,
    right: Spacing.xl,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...Shadows.lg,
  },
  fabText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
  },
});
