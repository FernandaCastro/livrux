import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
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
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../src/components/BottomMenu';
import { ConfirmationBanner } from '../src/components/ConfirmationBanner';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/constants/theme';
import type { Reader } from '../src/types';

type AddItem = { __isAdd: true };
type GridItem = Reader | AddItem;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { readers, isLoading, error: readersError, refresh } = useReaders();
  const { setSelectedReader, bookPersistedCount } = useReaderStore();
  const { profile } = useAuthStore();
  const { canAccessReader, lockReaders } = useParentalStore();
  const { pendingEmailConfirmation } = useAuthStore();
  const { requireParentPin, requireReaderPin, toggleParentLock, isParentUnlocked, modalProps } = useParentalGuard();

  useFocusEffect(
    useCallback(() => {
      refresh();
      lockReaders();
      setSelectedReader(null);
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

  // Add card is part of the grid so it occupies a proper column slot.
  // A phantom item is appended when the add card would otherwise be alone
  // in its row (even number of readers), keeping the grid symmetric.
  const gridData: GridItem[] = [
    ...readers,
    { __isAdd: true },
  ];

  const renderItem = ({ item }: { item: GridItem }) => {
    if ('__isAdd' in item) {
      return (
        <TouchableOpacity
          onPress={handleAddReader}
          style={styles.addCard}
          activeOpacity={0.75}
        >
          <Text style={styles.addIcon}>＋</Text>
          <Text style={styles.addLabel}>{t('home.addReader')}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <ReaderCard
        reader={item}
        onPress={() => handleSelectReader(item)}
        onLongPress={() => handleEditReader(item)}
        locked={!!item.pin && !canAccessReader(item.id)}
      />
    );
  };

  const renderEmptyHeader = () =>
    readers.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📖</Text>
        <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
        <Text style={styles.emptySubtitle}>{t('home.emptySubtitle')}</Text>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safe}>
      {modalProps && <PinModal {...modalProps} />}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.logoHeader}>
            <Image source={require('../assets/icon.png')} style={{ width: 50, height: 50, marginBottom: 0 , marginLeft: -10 }} />
            <Text style={styles.appName}>{t('common.appName')}</Text>
          </View>
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
            <Text style={styles.lockIcon}>{isParentUnlocked ? '🔓' : '🔒'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {pendingEmailConfirmation && (
        <ConfirmationBanner style={styles.confirmationBanner} />
      )}

      {readersError && (
        <Text style={{ color: 'red', padding: 12 }}>{readersError}</Text>
      )}


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
          data={gridData}
          keyExtractor={(item) =>
            '__isAdd' in item ? '__add__' : '__isPhantom' in item ? '__phantom__' : item.id
          }
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderEmptyHeader}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={renderItem}
        />
      )}
      <BottomMenu />
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
  logoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  confirmationBanner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing.xl,
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
    height: CARD_SIZE,
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
