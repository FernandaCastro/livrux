import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { useBooks } from '../../../src/hooks/useBooks';
import { useReaderStore } from '../../../src/stores/readerStore';
import { useReadingSession } from '../../../src/hooks/useReadingSession';
import { completeBookRpc } from '../../../src/hooks/useLivrux';
import { useAuthStore } from '../../../src/stores/authStore';
import { calculateLivrux, getDefaultFormula } from '../../../src/lib/formula';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';
import { STREAK_THRESHOLDS } from '../../../src/constants/config';

const RATING_BG: Record<string, string> = {
  disliked: '#FFE0DE',
  liked: '#FFF3DC',
  loved: '#E8F5E9',
};
const RATING_FG: Record<string, string> = {
  disliked: '#C62828',
  liked: '#E65100',
  loved: '#2E7D32',
};

export default function BookDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedReader, updateBalance } = useReaderStore();
  const { books, isLoading, deleteBook } = useBooks(selectedReader?.id ?? null);
  const { formula } = useAuthStore();
  const { loggedToday, logSession } = useReadingSession(selectedReader?.id ?? null, id ?? null);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [pagesInput, setPagesInput] = useState('');
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completeRating, setCompleteRating] = useState<'disliked' | 'liked' | 'loved' | null>(null);
  const [completeReview, setCompleteReview] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const book = books.find((b) => b.id === id);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      t('book.deleteBook'),
      t('book.deleteConfirm', { title: book.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteBook(book.id);
            // Revert the balance optimistically.
            if (selectedReader) {
              updateBalance(selectedReader.livrux_balance - book.livrux_earned);
            }
            handleBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push(`/app/book/edit?bookId=${book.id}`)}>
              <Text style={styles.editText}>{t('book.editBook')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <Text style={styles.deleteText}>{t('book.deleteBook')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cover */}
        <View style={styles.coverContainer}>
          {book.cover_url ? (
            <Image source={{ uri: book.cover_url }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverIcon}>📕</Text>
            </View>
          )}
        </View>

        {/* Title & author */}
        <Text style={styles.title}>{book.title}</Text>
        {book.author && <Text style={styles.author}>{book.author}</Text>}

        {/* Details row: pages + dates */}
        <View style={[styles.detailsRow, !book.is_foreign_language && styles.detailsRowLast]}>
          <View style={styles.detailChip}>
            <Text style={styles.detailIcon}>📄</Text>
            <Text style={styles.detailText}>{book.total_pages} p.</Text>
          </View>
          <View style={styles.detailChip}>
            <Text style={styles.detailIcon}>🟢</Text>
            <Text style={styles.detailText}>
              {format(new Date(book.date_start), 'dd/MM/yyyy')}
            </Text>
          </View>
          {book.date_completed && (
            <View style={styles.detailChip}>
              <Text style={styles.detailIcon}>✅</Text>
              <Text style={styles.detailText}>
                {format(new Date(book.date_completed), 'dd/MM/yyyy')}
              </Text>
            </View>
          )}
        </View>

        {/* Foreign language row — second line, only when applicable */}
        {book.is_foreign_language && (
          <View style={styles.detailsForeignRow}>
            <View style={styles.detailChip}>
              <Text style={styles.detailIcon}>🌍</Text>
              <Text style={styles.detailText}>{t('book.foreignLanguage')}</Text>
            </View>
          </View>
        )}

        {/* Complete book button — only for reading books */}
        {book.status === 'reading' && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => setCompleteModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.completeBtnText}>🏁 {t('book.completeBook')}</Text>
          </TouchableOpacity>
        )}

        {/* Livrux earned card — only for completed books */}
        {book.status === 'completed' && (
          <View style={styles.earnedCard}>
            <Text style={styles.earnedLabel}>{t('book.willEarn')}</Text>
            <View style={styles.earnedRow}>
              <Text style={styles.earnedCoin}>🪙</Text>
              <Text style={styles.earnedAmount}>{book.livrux_earned.toFixed(2)}</Text>
              <Text style={styles.earnedCurrency}>Livrux</Text>
            </View>
          </View>
        )}

        {/* Reading session button — only for medium/long books */}
        {book.total_pages >= STREAK_THRESHOLDS.SHORT_BOOK_MAX && (
          <TouchableOpacity
            style={[styles.sessionBtn, loggedToday && styles.sessionBtnDone]}
            onPress={() => !loggedToday && setSessionModalVisible(true)}
            activeOpacity={loggedToday ? 1 : 0.7}
          >
            <Text style={styles.sessionBtnText}>
              {loggedToday ? t('streak.alreadyLoggedToday') : t('streak.logSession')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Rating */}
        {/* Rating standalone (only when no review) */}
        {book.rating && !book.review && (
          <View style={[styles.ratingPill, { backgroundColor: RATING_BG[book.rating] }]}>
            <Text style={styles.ratingEmoji}>
              {book.rating === 'disliked' ? '😕' : book.rating === 'liked' ? '😊' : '😍'}
            </Text>
            <Text style={[styles.ratingText, { color: RATING_FG[book.rating] }]}>
              {book.rating === 'disliked'
                ? t('book.ratingDisliked')
                : book.rating === 'liked'
                ? t('book.ratingLiked')
                : t('book.ratingLoved')}
            </Text>
          </View>
        )}

        {/* Review card — rating pill overlaps top-left when present */}
        {book.review && (
          <View style={styles.reviewWrapper}>
            {book.rating && (
              <View style={[styles.ratingPillOverlay, { backgroundColor: RATING_BG[book.rating] }]}>
                <Text style={styles.ratingEmoji}>
                  {book.rating === 'disliked' ? '😕' : book.rating === 'liked' ? '😊' : '😍'}
                </Text>
                <Text style={[styles.ratingText, { color: RATING_FG[book.rating] }]}>
                  {book.rating === 'disliked'
                    ? t('book.ratingDisliked')
                    : book.rating === 'liked'
                    ? t('book.ratingLiked')
                    : t('book.ratingLoved')}
                </Text>
              </View>
            )}
            <View style={[styles.reviewCard, !!book.rating && styles.reviewCardWithPill]}>
              <Text style={styles.reviewIcon}>💬</Text>
              <Text style={styles.reviewText}>{book.review}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {book.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>📝</Text>
            <Text style={styles.notesText}>{book.notes}</Text>
          </View>
        )}
      </ScrollView>
      {/* Complete book modal */}
      <Modal visible={completeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🏁 {t('book.completeBook')}</Text>

            <Text style={styles.ratingModalLabel}>{t('book.ratingLabel')}</Text>
            <View style={styles.ratingModalRow}>
              {([
                { value: 'disliked', emoji: '😕' },
                { value: 'liked',    emoji: '😊' },
                { value: 'loved',    emoji: '😍' },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.ratingModalOption, completeRating === opt.value && styles.ratingModalOptionSelected]}
                  onPress={() => setCompleteRating(completeRating === opt.value ? null : opt.value)}
                >
                  <Text style={{ fontSize: 28 }}>{opt.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder={t('book.reviewPlaceholder')}
              value={completeReview}
              onChangeText={setCompleteReview}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setCompleteModalVisible(false); setCompleteRating(null); setCompleteReview(''); }}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, isCompleting && { opacity: 0.6 }]}
                disabled={isCompleting}
                onPress={async () => {
                  if (!book || !selectedReader) return;
                  setIsCompleting(true);
                  const activeFormula = formula ?? getDefaultFormula();
                  const livruxEarned = calculateLivrux(book.total_pages, activeFormula, { isForeignLanguage: book.is_foreign_language });
                  try {
                    await completeBookRpc({
                      bookId: book.id,
                      dateCompleted: new Date().toISOString().split('T')[0],
                      livruxEarned,
                      rating: completeRating,
                      review: completeReview.trim() || null,
                    });
                    updateBalance(selectedReader.livrux_balance + livruxEarned);
                    setCompleteModalVisible(false);
                    router.back();
                  } catch {
                    Alert.alert(t('common.error'), t('common.error'));
                  } finally {
                    setIsCompleting(false);
                  }
                }}
              >
                <Text style={styles.modalConfirmText}>{t('book.completeBook')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pages modal */}
      <Modal visible={sessionModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('streak.pagesReadLabel')}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              placeholder={t('streak.pagesReadPlaceholder')}
              value={pagesInput}
              onChangeText={setPagesInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setSessionModalVisible(false); setPagesInput(''); }}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={async () => {
                  const pages = parseInt(pagesInput, 10);
                  if (!isNaN(pages) && pages > 0) {
                    await logSession(pages);
                    setSessionModalVisible(false);
                    setPagesInput('');
                  }
                }}
              >
                <Text style={styles.modalConfirmText}>{t('streak.logSessionConfirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomMenu showReader showWallet showFriends readerId={selectedReader?.id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing['2xl'],
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: Spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  editText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  deleteText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  coverContainer: { marginBottom: Spacing.xl },
  cover: {
    width: 140,
    height: 210,
    borderRadius: Radius.md,
    ...Shadows.lg,
  },
  coverPlaceholder: {
    width: 140,
    height: 210,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  coverIcon: { fontSize: 56 },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  author: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  detailsRowLast: {
    marginBottom: Spacing.xl,
  },
  detailsForeignRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 6,
  },
  detailIcon: { fontSize: 14 },
  detailText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  earnedCard: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
    marginBottom: Spacing.lg,
  },
  earnedLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  earnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  earnedCoin: { fontSize: 28 },
  earnedAmount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    color: Colors.textOnPrimary,
  },
  earnedCurrency: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  ratingEmoji: { fontSize: 28 },
  ratingText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.lg,
  },
  reviewWrapper: {
    width: '100%',
    marginTop: 16,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  ratingPillOverlay: {
    position: 'absolute',
    top: -16,
    left: Spacing.sm,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 5,
    ...Shadows.sm,
  },
  reviewCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  reviewCardWithPill: {
    paddingTop: Spacing['3xl'],
  },
  reviewIcon: { fontSize: 20 },
  reviewText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  notesCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    ...Shadows.sm,
    marginBottom: Spacing.md,
  },
  completeBtn: {
    width: '100%',
    backgroundColor: Colors.success,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  completeBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
  },
  ratingModalLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  ratingModalRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  ratingModalOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingModalOptionSelected: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.surface,
  },
  sessionBtn: {
    width: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  sessionBtnDone: {
    backgroundColor: Colors.surfaceVariant,
  },
  sessionBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  modalTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.surfaceVariant,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalCancel: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceVariant,
  },
  modalCancelText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  modalConfirm: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  modalConfirmText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
  },
  notesLabel: { fontSize: 18 },
  notesText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
});
