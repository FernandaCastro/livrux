import { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { parse, format, isValid } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBooks } from '../../../src/hooks/useBooks';
import { useAuthStore } from '../../../src/stores/authStore';
import { useReaderStore } from '../../../src/stores/readerStore';
import { calculateLivrux, getDefaultFormula } from '../../../src/lib/formula';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
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
    dateCompleted: z
      .string()
      .min(1, t('book.errors.dateRequired'))
      .refine((v) => {
        const parsed = parse(v, 'dd/MM/yyyy', new Date());
        return isValid(parsed);
      }, t('book.errors.dateInvalid')),
  });
}

type FormData = {
  title: string;
  author?: string;
  totalPages: string;
  dateCompleted: string;
};

export default function EditBookScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();

  const { formula } = useAuthStore();
  const { selectedReader, updateBalance } = useReaderStore();
  const { books, updateBook } = useBooks(selectedReader?.id ?? null);

  const handleBack = () => {
    router.back();
  };

  const book = books.find((b) => b.id === bookId);

  const activeFormula = formula ?? getDefaultFormula();
  const hasForeignLanguageBonus = activeFormula.bonus_rules.some(r => r.type === 'foreign_language');
  const schema = useBookSchema();

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [isForeignLanguage, setIsForeignLanguage] = useState(false);
  const [rating, setRating] = useState<'disliked' | 'liked' | 'loved' | null>(null);
  const [review, setReview] = useState('');
  const [initialised, setInitialised] = useState(false);

  const { control, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', author: '', totalPages: '', dateCompleted: '' },
  });

  // Pre-fill the form once the book is available from the store.
  useEffect(() => {
    if (book && !initialised) {
      reset({
        title: book.title,
        author: book.author ?? '',
        totalPages: String(book.total_pages),
        // Convert stored YYYY-MM-DD to display format DD/MM/YYYY.
        dateCompleted: format(new Date(book.date_completed), 'dd/MM/yyyy'),
      });
      setCoverUri(book.cover_url);
      setIsForeignLanguage(book.is_foreign_language);
      setRating(book.rating ?? null);
      setReview(book.review ?? '');
      setInitialised(true);
    }
  }, [book, initialised, reset]);

  // Live Livrux preview based on the new values.
  const pagesValue = watch('totalPages');
  const previewPages = Number(pagesValue) || 0;
  const newLivrux = previewPages > 0
    ? calculateLivrux(previewPages, activeFormula, { isForeignLanguage })
    : 0;
  const oldLivrux = book?.livrux_earned ?? 0;
  const delta = newLivrux - oldLivrux;

  const onSubmit = async (data: FormData) => {
    if (!book) return;

    try {
      const pages = Number(data.totalPages);
      const livruxEarned = calculateLivrux(pages, activeFormula, { isForeignLanguage });
      // Combine user-entered date (DD/MM/YYYY) with the original time from
      // book.date_completed so the sort order among same-day books is preserved.
      const newDate = parse(data.dateCompleted, 'dd/MM/yyyy', new Date());
      const originalDateTime = new Date(book.date_completed);
      newDate.setHours(
        originalDateTime.getHours(),
        originalDateTime.getMinutes(),
        originalDateTime.getSeconds(),
        originalDateTime.getMilliseconds(),
      );
      const dateCompleted = newDate.toISOString();

      await updateBook({
        bookId: book.id,
        title: data.title,
        author: data.author || null,
        totalPages: pages,
        coverUrl: coverUri,
        dateCompleted,
        isForeignLanguage,
        livruxEarned,
        rating,
        review: review.trim() || null,
      });

      // Optimistically adjust the reader balance by the delta.
      if (selectedReader) {
        updateBalance(selectedReader.livrux_balance + (livruxEarned - book.livrux_earned));
      }

      handleBack();
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  if (!book) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.header}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('book.editBook')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Cover — shows the original cover if present */}
        {coverUri && (
          <View style={styles.coverContainer}>
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

        <Controller
          control={control}
          name="dateCompleted"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={t('book.dateCompleted')}
              placeholder="DD/MM/YYYY"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="number-pad"
              error={errors.dateCompleted?.message}
            />
          )}
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

        {/* Live Livrux preview — shows new value and delta vs original */}
        {previewPages > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>{t('book.willEarn')}</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewCoin}>🪙</Text>
              <Text style={styles.previewAmount}>{newLivrux.toFixed(2)}</Text>
              <Text style={styles.previewCurrency}>Livrux</Text>
            </View>
            {delta !== 0 && (
              <Text style={[styles.deltaText, delta > 0 ? styles.deltaPositive : styles.deltaNegative]}>
                {delta > 0 ? '+' : ''}{delta.toFixed(2)} vs original
              </Text>
            )}
          </View>
        )}

        {/* Rating picker */}
        <Text style={styles.ratingLabel}>{t('book.ratingLabel')}</Text>
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

        {/* Review */}
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

        <Button
          label={t('common.save')}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          fullWidth
          style={styles.saveButton}
        />
      </ScrollView>
      <BottomMenu />
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
  backText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xl,
    color: Colors.secondary,
  },
  screenTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
  },
  coverContainer: {
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
  deltaText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  deltaPositive: {
    color: 'rgba(255,255,255,0.9)',
  },
  deltaNegative: {
    color: 'rgba(255,200,200,0.95)',
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
});
