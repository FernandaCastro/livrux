import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logBookRpc } from '../../../src/hooks/useLivrux';
import { useAuthStore } from '../../../src/stores/authStore';
import { useReaderStore } from '../../../src/stores/readerStore';
import { uploadImage } from '../../../src/lib/storage';
import { calculateLivrux, getDefaultFormula } from '../../../src/lib/formula';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
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
  const { readerId } = useLocalSearchParams<{ readerId: string }>();

  const { user, formula } = useAuthStore();
  const { updateBalance } = useReaderStore();

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const activeFormula = formula ?? getDefaultFormula();
  const schema = useBookSchema();

  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', author: '', totalPages: '', notes: '' },
  });

  // Watch pages to show the live Livrux preview.
  const pagesValue = watch('totalPages');
  const previewPages = Number(pagesValue) || 0;
  const previewCoins = previewPages > 0
    ? calculateLivrux(previewPages, activeFormula)
    : 0;

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user || !readerId) return;
    setIsUploading(true);

    try {
      const pages = Number(data.totalPages);
      const livruxEarned = calculateLivrux(pages, activeFormula);

      let coverUrl: string | null = null;
      if (coverUri) {
        const tempId = `tmp-${Date.now()}`;
        coverUrl = await uploadImage('book-covers', user.id, tempId, coverUri);
      }

      await logBookRpc({
        readerId,
        title: data.title,
        author: data.author || null,
        totalPages: pages,
        coverUrl,
        livruxEarned,
        dateCompleted: format(new Date(), 'yyyy-MM-dd'),
        notes: data.notes || null,
      });

      // Optimistically update the balance in the store so the dashboard
      // reflects the new amount without a full refetch.
      const { selectedReader } = useReaderStore.getState();
      if (selectedReader) {
        updateBalance(selectedReader.livrux_balance + livruxEarned);
      }

      router.back();
    } catch (err) {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setIsUploading(false);
    }
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
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('book.logBook')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Cover picker */}
        <TouchableOpacity onPress={pickCover} activeOpacity={0.8} style={styles.coverButton}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverIcon}>📕</Text>
              <Text style={styles.coverHint}>{t('book.addCover')}</Text>
            </View>
          )}
        </TouchableOpacity>

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

        {/* Live Livrux preview */}
        {previewPages > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>{t('book.willEarn')}</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewCoin}>🪙</Text>
              <Text style={styles.previewAmount}>{previewCoins}</Text>
              <Text style={styles.previewCurrency}>Livrux</Text>
            </View>
          </View>
        )}

        <Button
          label={t('book.logBook')}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting || isUploading}
          fullWidth
          style={styles.saveButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
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
  coverPlaceholder: {
    width: 120,
    height: 180,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  coverIcon: { fontSize: 36, marginBottom: Spacing.xs },
  coverHint: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
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
  saveButton: { marginTop: Spacing.md },
});
