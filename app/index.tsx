import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';

import { useReaders } from '../src/hooks/useReaders';
import { useReaderStore } from '../src/stores/readerStore';
import { useAuthStore } from '../src/stores/authStore';
import { ReaderCard } from '../src/components/reader/ReaderCard';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/constants/theme';
import type { Reader } from '../src/types';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { readers, isLoading, refresh } = useReaders();
  const { setSelectedReader } = useReaderStore();
  const { profile } = useAuthStore();

  useFocusEffect(
    useCallback(() => { refresh(); }, [])
  );

  const handleSelectReader = (reader: Reader) => {
    setSelectedReader(reader);
    router.push(`/app/reader/${reader.id}`);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📖</Text>
      <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
      <Text style={styles.emptySubtitle}>{t('home.emptySubtitle')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>{t('common.appName')}</Text>
          {profile?.display_name && (
            <Text style={styles.greeting}>👋 {profile.display_name}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.push('/app/settings')}
          style={styles.settingsButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Readers grid */}
      {isLoading ? (
        <ActivityIndicator
          color={Colors.primary}
          size="large"
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={readers}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <ReaderCard reader={item} onPress={() => handleSelectReader(item)} />
          )}
          // "Add reader" card appended after the real items.
          ListFooterComponent={
            <TouchableOpacity
              onPress={() => router.push('/app/reader/add')}
              style={styles.addCard}
              activeOpacity={0.75}
            >
              <Text style={styles.addIcon}>＋</Text>
              <Text style={styles.addLabel}>{t('home.addReader')}</Text>
            </TouchableOpacity>
          }
        />
      )}
    </SafeAreaView>
  );
}

const CARD_SIZE = 140;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  appName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  greeting: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  settingsIcon: { fontSize: 24 },
  loader: { flex: 1 },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  row: {
    justifyContent: 'flex-start',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIcon: { fontSize: 72, marginBottom: Spacing.lg },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  addCard: {
    width: CARD_SIZE,
    height: CARD_SIZE + 20,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.sm,
    ...Shadows.sm,
  },
  addIcon: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    color: Colors.secondary,
  },
  addLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
