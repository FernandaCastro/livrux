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
import { useCallback, useEffect } from 'react';

import { useReaders } from '../src/hooks/useReaders';
import { useReaderStore } from '../src/stores/readerStore';
import { useAuthStore } from '../src/stores/authStore';
import { useParentalStore } from '../src/stores/parentalStore';
import { useParentalGuard } from '../src/hooks/useParentalGuard';
import { PinModal } from '../src/components/PinModal';
import { ReaderCard } from '../src/components/reader/ReaderCard';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/constants/theme';
import type { Reader } from '../src/types';

// Cadeado aberto: arco (shackle) com borda superior+direita conectado
// apenas no lado direito ao corpo — abre para a esquerda.
function LockOpenIcon({ size = 26 }: { size?: number }) {
  const color = Colors.secondary;
  const thick = Math.max(2, Math.round(size * 0.11));
  const bodyW = Math.round(size * 0.74);
  const bodyH = Math.round(size * 0.48);
  const shackleW = Math.round(size * 0.44);
  const shackleH = Math.round(size * 0.52);
  const bodyOffset = Math.round((size - bodyW) / 2);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* Shackle: borda top + right com raio no canto → arco aberto à esquerda */}
      <View style={{
        position: 'absolute',
        top: 0,
        right: bodyOffset,
        width: shackleW,
        height: shackleH,
        borderTopWidth: thick,
        borderRightWidth: thick,
        borderTopRightRadius: shackleW / 2,
        borderColor: color,
      }} />
      {/* Corpo do cadeado */}
      <View style={{
        width: bodyW,
        height: bodyH,
        backgroundColor: color,
        borderRadius: Math.round(size * 0.09),
      }} />
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { readers, isLoading, refresh } = useReaders();
  const { setSelectedReader, bookPersistedCount } = useReaderStore();
  const { profile } = useAuthStore();
  const { canAccessReader, lockReaders } = useParentalStore();
  const { requireParentPin, requireReaderPin, toggleParentLock, isParentUnlocked, modalProps } = useParentalGuard();

  useFocusEffect(
    useCallback(() => {
      refresh();
      lockReaders();
    }, [])
  );

  // Refresh the readers list whenever a book is successfully persisted to the
  // DB so that the balance badge on each card stays up to date.
  useEffect(() => {
    if (bookPersistedCount > 0) refresh();
  }, [bookPersistedCount]);

  const handleSelectReader = (reader: Reader) => {
    requireReaderPin(reader, () => {
      setSelectedReader(reader);
      router.push(`/app/reader/${reader.id}`);
    });
  };

  const handleEditReader = (reader: Reader) => {
    requireParentPin(() => {
      setSelectedReader(reader);
      router.push(`/app/reader/add?editId=${reader.id}`);
    });
  };

  const handleAddReader = () => {
    requireParentPin(() => {
      router.push('/app/reader/add');
    });
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
      {modalProps && <PinModal {...modalProps} />}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>{t('common.appName')}</Text>
          {profile?.display_name && (
            <Text style={styles.greeting}>👋 {profile.display_name}</Text>
          )}
        </View>
        {!!profile?.parental_pin && (
          <TouchableOpacity
            onPress={toggleParentLock}
            style={styles.lockButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isParentUnlocked
              ? <LockOpenIcon size={26} />
              : <Text style={styles.lockIcon}>🔒</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Readers grid — show the full-screen spinner only on the very first
          load (no data yet). Background refreshes (focus, post-persist) use
          the FlatList's RefreshControl so the list doesn't flash away. */}
      {isLoading && readers.length === 0 ? (
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
            <ReaderCard
              reader={item}
              onPress={() => handleSelectReader(item)}
              onLongPress={() => handleEditReader(item)}
              locked={!!item.pin && !canAccessReader(item.id)}
            />
          )}
          // "Add reader" card appended after the real items.
          ListFooterComponent={
            <TouchableOpacity
              onPress={handleAddReader}
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
  lockButton: {
    padding: Spacing.xs,
  },
  lockIcon: { fontSize: 26 },
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
