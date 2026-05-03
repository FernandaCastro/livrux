import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logBookRpc } from '../../../src/hooks/useLivrux';
import { BadgeUnlockToast } from '../../../src/components/BadgeUnlockToast';
import type { AwardedBadge } from '../../../src/hooks/useLivrux';
import { useAuthStore } from '../../../src/stores/authStore';
import { useReaderStore } from '../../../src/stores/readerStore';
import { calculateLivrux, getDefaultFormula } from '../../../src/lib/formula';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { BookSearchBar } from '../../../src/components/book/BookSearchBar';
import type { GoogleBookResult } from '../../../src/lib/googleBooks';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';

function useBookSchema() {
  const { t } = useTranslation();
  return z.object({
    title: z.string().min(1, t('book.errors.titleRequired')),
    author: z.string().optional(),
    totalPages: z
      .string()
      .min(1, t('book.errors.pagesRequired'))
      .refine((v) => Number(v) > 0, t('book.errors.pagesInvalid')),
    notes: z.string().optional(),
  });
}

type FormData = { title: string; author?: string; totalPages: string; notes?: string };

export default function AddBookScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { readerId, bookCount } = useLocalSearchParams<{ readerId: string; bookCount: string }>();
  const prevBookCount = Number(bookCount) || 0;

  const { user, formula } = useAuthStore();
  const { updateBalance } = useReaderStore();

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState(0);
  const [isForeignLanguage, setIsForeignLanguage] = useState(false);
  const [rating, setRating] = useState<'disliked' | 'liked' | 'loved' | null>(null);
  const [review, setReview] = useState('');
  const [bookStatus, setBookStatus] = useState<'completed' | 'reading'>('completed');
  const [dateStart, setDateStart] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [awardedBadges, setAwardedBadges] = useState<AwardedBadge[]>([]);

  const activeFormula = formula ?? getDefaultFormula();
  const hasForeignLanguageBonus = activeFormula.bonus_rules.some(r => r.type === 'foreign_language');
  const schema = useBookSchema();

  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', author: '', totalPages: '', notes: '' },
  });

  // Reset all form state every time the screen comes into focus so that
  // a second (or third) book entry starts with a clean slate.
  useFocusEffect(
    useCallback(() => {
      reset({ title: '', author: '', totalPages: '', notes: '' });
      setCoverUri(null);
      setSearchKey(k => k + 1);
      setIsForeignLanguage(false);
      setRating(null);
      setReview('');
      setBookStatus('completed');
      setDateStart(format(new Date(), 'dd/MM/yyyy'));
    }, [reset])
  );

  // Watch pages to show the live Livrux preview.
  const pagesValue = watch('totalPages');
  const previewPages = Number(pagesValue) || 0;
  const previewCoins = previewPages > 0
    ? calculateLivrux(previewPages, activeFormula, { isForeignLanguage })
    : 0;

  const handleBookSelected = (book: GoogleBookResult) => {
    setValue('title', book.title, { shouldValidate: true });
    if (book.author) setValue('author', book.author);
    if (book.totalPages) setValue('totalPages', String(book.totalPages), { shouldValidate: true });
    if (book.coverUrl) setCoverUri(book.coverUrl);
  };

  const onSubmit = (data: FormData) => {
    if (!user || !readerId) return;

    const pages = Number(data.totalPages);
    const livruxEarned = calculateLivrux(pages, activeFormula, { isForeignLanguage });

    // Snapshot current balance for rollback on failure.
    const { selectedReader, triggerConfetti } = useReaderStore.getState();
    const originalBalance = selectedReader?.livrux_balance ?? 0;

    // Optimistic mutations fire immediately — no waiting for the network.
    // Only award balance/confetti when the book is completed immediately.
    if (bookStatus === 'completed') {
      updateBalance(originalBalance + livruxEarned);
      triggerConfetti(prevBookCount, prevBookCount + 1);
    }
    router.back();
    // onSubmit returns here synchronously so react-hook-form sets
    // isSubmitting=false immediately — the button re-enables right away.

    // Persist to the DB in the background. On failure, roll back all state.
    // Access the store directly (not via hook) since the component may have
    // already unmounted after router.back().
    const isCompleted = bookStatus === 'completed';
    const todayIso = new Date().toISOString().split('T')[0];
    const parseDateInput = (val: string) => {
      const [d, m, y] = val.split('/');
      return y && m && d ? `${y}-${m}-${d}` : todayIso;
    };

    logBookRpc({
      readerId,
      title: data.title,
      author: data.author || null,
      totalPages: pages,
      coverUrl: coverUri,
      livruxEarned: isCompleted ? livruxEarned : 0,
      status: bookStatus,
      dateStart: parseDateInput(dateStart),
      dateCompleted: isCompleted ? todayIso : null,
      notes: data.notes || null,
      isForeignLanguage,
      rating: isCompleted ? rating : null,
      review: isCompleted ? (review.trim() || null) : null,
    }).then(({ awardedBadges: badges }) => {
      useReaderStore.getState().notifyBookPersisted();
      if (badges.length > 0) {
        setAwardedBadges(badges);
      }
    }).catch(() => {
      if (bookStatus === 'completed') {
        useReaderStore.getState().updateBalance(originalBalance);
        useReaderStore.getState().clearConfetti();
      }
      Alert.alert(t('common.error'), t('common.error'));
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>{t('book.logBook')}</Text>
        </View>

        {/* Status toggle */}
        <View style={styles.statusToggle}>
          {(['completed', 'reading'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusOption, bookStatus === s && styles.statusOptionActive]}
              onPress={() => setBookStatus(s)}
              activeOpacity={0.75}
            >
              <Text style={[styles.statusOptionText, bookStatus === s && styles.statusOptionTextActive]}>
                {s === 'completed' ? `✅ ${t('book.statusCompleted')}` : `📖 ${t('book.statusReading')}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search bar — type or scan to auto-fill */}
        <BookSearchBar key={searchKey} onSelect={handleBookSelected} />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('common.or')} {t('book.fillManually')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Cover — displayed only when auto-filled by Google Books */}
        {coverUri && (
          <View style={styles.coverButton}>
            <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          </View>
        )}

        {/* Form fields */}
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={t('book.title')}
              placeholder={t('book.titlePlaceholder')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.title?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="author"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={t('book.author')}
              placeholder={t('book.authorPlaceholder')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />

        <Controller
          control={control}
          name="totalPages"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={t('book.totalPages')}
              placeholder={t('book.totalPagesPlaceholder')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="number-pad"
              error={errors.totalPages?.message}
            />
          )}
        />

        {/* Date start */}
        <TextInput
          label={t('book.dateStart')}
          placeholder="DD/MM/AAAA"
          value={dateStart}
          onChangeText={setDateStart}
          keyboardType="number-pad"
        />

        {/* Foreign language checkbox — only shown when the bonus rule is configured */}
        {hasForeignLanguageBonus && (
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIsForeignLanguage(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isForeignLanguage && styles.checkboxChecked]}>
              {isForeignLanguage && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>{t('book.foreignLanguage')}</Text>
          </TouchableOpacity>
        )}

        {/* Live Livrux preview — only when completing */}
        {bookStatus === 'completed' && previewPages > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>{t('book.willEarn')}</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewCoin}>🪙</Text>
              <Text style={styles.previewAmount}>{previewCoins.toFixed(2)}</Text>
              <Text style={styles.previewCurrency}>Livrux</Text>
            </View>
          </View>
        )}

        {/* Rating and review — only when completing */}
        {bookStatus === 'completed' && <Text style={styles.ratingLabel}>{t('book.ratingLabel')}</Text>}
        {bookStatus === 'completed' && (
          <View style={styles.ratingRow}>
            {([
              { value: 'disliked', emoji: '😕', label: t('book.ratingDisliked') },
              { value: 'liked',    emoji: '😊', label: t('book.ratingLiked') },
              { value: 'loved',    emoji: '😍', label: t('book.ratingLoved') },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.ratingOption, rating === opt.value && styles.ratingOptionSelected]}
                onPress={() => setRating(rating === opt.value ? null : opt.value)}
                activeOpacity={0.75}
              >
                <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
                <Text style={[styles.ratingOptionLabel, rating === opt.value && styles.ratingOptionLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {bookStatus === 'completed' && (
          <View style={styles.reviewContainer}>
            <Text style={styles.reviewFieldLabel}>{t('book.reviewLabel')}</Text>
            <RNTextInput
              style={styles.reviewInput}
              value={review}
              onChangeText={setReview}
              placeholder={t('book.reviewPlaceholder')}
              placeholderTextColor={Colors.textDisabled}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        <Button
          label={bookStatus === 'completed' ? t('book.logBook') : t('book.logReading')}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          fullWidth
          style={styles.saveButton}
        />
      </ScrollView>
      <BottomMenu showReader showWallet showFriends readerId={readerId} />
      <BadgeUnlockToast badges={awardedBadges} onDone={() => setAwardedBadges([])} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  screenTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  dividerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  coverButton: {
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  coverImage: {
    width: 120,
    height: 180,
    borderRadius: Radius.md,
    ...Shadows.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: Colors.textOnPrimary,
    fontSize: 13,
    fontFamily: Fonts.bodyBold,
  },
  checkboxLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  previewCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  previewLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewCoin: { fontSize: 28 },
  previewAmount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    color: Colors.textOnPrimary,
  },
  previewCurrency: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  ratingLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  ratingOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  ratingOptionSelected: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.surface,
  },
  ratingEmoji: { fontSize: 28 },
  ratingOptionLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  ratingOptionLabelSelected: {
    fontFamily: Fonts.bodyBold,
    color: Colors.secondary,
  },
  reviewContainer: {
    marginBottom: Spacing.lg,
  },
  reviewFieldLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  reviewInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    minHeight: 80,
  },
  saveButton: { marginTop: Spacing.md },
  statusToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
    gap: 4,
  },
  statusOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  statusOptionActive: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  statusOptionText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  statusOptionTextActive: {
    color: Colors.secondary,
    fontFamily: Fonts.bodyBold,
  },
});
