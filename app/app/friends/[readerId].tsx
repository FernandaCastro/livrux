import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { useFriends } from '../../../src/hooks/useFriends';
import { useParentalStore } from '../../../src/stores/parentalStore';
import { FriendCard } from '../../../src/components/friends/FriendCard';
import { MultiavatarView } from '../../../src/components/reader/MultiavatarView';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';
import type { FriendSearchResult } from '../../../src/types';

export default function FriendsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { readerId } = useLocalSearchParams<{ readerId: string }>();


  const {
    friends,
    pendingRequests,
    friendCode,
    friendsAutonomy,
    isLoading,
    refresh,
    searchByCode,
    sendRequest,
    acceptRequest,
    rejectRequest,
    unfriend,
  } = useFriends(readerId ?? null);

  const { isParentUnlocked } = useParentalStore();
  const canManageFriends = isParentUnlocked || friendsAutonomy;

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<FriendSearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const closeAddModal = () => {
    setAddModalVisible(false);
    setSearchCode('');
    setSearchResult(null);
    setSearchError(null);
    setRequestSent(false);
  };

  const handleSearch = async () => {
    if (!searchCode.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);
    setRequestSent(false);

    const result = await searchByCode(searchCode);
    if (!result) {
      setSearchError(t('friends.codeNotFound'));
    } else if (result.id === readerId) {
      setSearchError(t('friends.cannotAddSelf'));
    } else {
      setSearchResult(result);
    }
    setSearchLoading(false);
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;
    try {
      await sendRequest(searchResult.id);
      setRequestSent(true);
    } catch {
      setSearchError(t('friends.requestAlreadySent'));
    }
  };

  const handleUnfriend = (friendshipId: string, name: string) => {
    Alert.alert(
      t('friends.unfriendTitle'),
      t('friends.unfriendConfirm', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('friends.unfriend'),
          style: 'destructive',
          onPress: () => unfriend(friendshipId),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('friends.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Own friend code card + add button */}
      <View style={styles.topSection}>
        {friendCode && (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>{t('friends.myCode')}</Text>
            <Text style={styles.codeValue}>{friendCode}</Text>
            <Text style={styles.codeHint}>{t('friends.shareCodeHint')}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ {t('friends.addFriend')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(item) => item.friendshipId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <>
            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t('friends.pendingRequests')}</Text>
                {pendingRequests.map((req) =>
                  canManageFriends ? (
                    <FriendCard
                      key={req.friendshipId}
                      name={req.reader.name}
                      avatarSeed={req.reader.avatar_seed}
                      bookCount={req.reader.book_count}
                      onAccept={() => acceptRequest(req.friendshipId)}
                      onReject={() => rejectRequest(req.friendshipId)}
                    />
                  ) : (
                    <FriendCard
                      key={req.friendshipId}
                      name={req.reader.name}
                      avatarSeed={req.reader.avatar_seed}
                      bookCount={req.reader.book_count}
                    />
                  )
                )}
                {!canManageFriends && (
                  <Text style={styles.autonomyHint}>{t('friends.parentApprovalNeeded')}</Text>
                )}
              </View>
            )}

            {/* Friends section header */}
            {friends.length > 0 && (
              <Text style={styles.sectionLabel}>{t('friends.myFriends')}</Text>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading && pendingRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>{t('friends.noFriends')}</Text>
              <Text style={styles.emptySubtext}>{t('friends.noFriendsHint')}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <FriendCard
            name={item.reader.name}
            avatarSeed={item.reader.avatar_seed}
            bookCount={item.reader.book_count}
            onPress={() => router.push(`/app/friend/${item.reader.id}?fromReaderId=${readerId}`)}
            onReject={
              canManageFriends
                ? () => handleUnfriend(item.friendshipId, item.reader.name)
                : undefined
            }
          />
        )}
      />

      {/* Add friend modal */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={closeAddModal}>
        <Pressable style={styles.overlay} onPress={closeAddModal}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('friends.addFriend')}</Text>
            <Text style={styles.sheetSubtitle}>{t('friends.enterCodeLabel')}</Text>

            <View style={styles.codeInputRow}>
              <TextInput
                style={styles.codeInput}
                value={searchCode}
                onChangeText={(v) => {
                  setSearchCode(v.toUpperCase());
                  setSearchError(null);
                  setSearchResult(null);
                  setRequestSent(false);
                }}
                placeholder={t('friends.codePlaceholder')}
                placeholderTextColor={Colors.textDisabled}
                autoCapitalize="characters"
                maxLength={6}
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.searchBtn, searchLoading && styles.searchBtnDisabled]}
                onPress={handleSearch}
                disabled={searchLoading || !searchCode.trim()}
                activeOpacity={0.8}
              >
                {searchLoading
                  ? <ActivityIndicator color={Colors.textOnPrimary} size="small" />
                  : <Text style={styles.searchBtnText}>{t('friends.search')}</Text>
                }
              </TouchableOpacity>
            </View>

            {searchError && (
              <Text style={styles.errorText}>{searchError}</Text>
            )}

            {searchResult && !requestSent && (
              <View style={styles.searchResultCard}>
                <MultiavatarView seed={searchResult.avatar_seed} size={56} borderColor={Colors.primaryLight} borderWidth={2} />
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{searchResult.name}</Text>
                  <Text style={styles.searchResultBooks}>📚 {searchResult.book_count} {t('friends.booksRead')}</Text>
                </View>
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendRequest} activeOpacity={0.8}>
                  <Text style={styles.sendBtnText}>{t('friends.sendRequest')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {requestSent && (
              <View style={styles.sentContainer}>
                <Text style={styles.sentIcon}>🎉</Text>
                <Text style={styles.sentText}>{t('friends.requestSentSuccess')}</Text>
              </View>
            )}

            <TouchableOpacity onPress={closeAddModal} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <BottomMenu showWallet showFriends readerId={readerId} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xl,
    color: Colors.secondary,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
  },
  codeCard: {
    backgroundColor: Colors.friendEmerald,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  codeLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.xs,
  },
  codeValue: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    color: Colors.textOnPrimary,
    letterSpacing: 6,
  },
  codeHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing['2xl'] + 72,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  autonomyHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textDisabled,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
  },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  topSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  addBtn: {
    backgroundColor: Colors.friendEmerald,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  addBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  sheetTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  sheetSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  codeInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  codeInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
  },
  searchBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  searchResultInfo: { flex: 1 },
  searchResultName: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  searchResultBooks: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sendBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.sm,
    color: Colors.textOnPrimary,
  },
  sentContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sentIcon: { fontSize: 36, marginBottom: Spacing.sm },
  sentText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.success,
    textAlign: 'center',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  closeBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});
