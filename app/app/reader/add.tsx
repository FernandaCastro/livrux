import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReaders } from '../../../src/hooks/useReaders';
import { useReaderStore } from '../../../src/stores/readerStore';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { MultiavatarView } from '../../../src/components/reader/MultiavatarView';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';

const AVATAR_DISPLAY_SIZE = 100;

function useReaderSchema() {
  const { t } = useTranslation();
  return z.object({
    name: z.string().min(1, t('reader.readerName')),
  });
}

type FormData = { name: string };

function generateAvatarSeed(readerId?: string): string {
  const base = readerId ?? Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${base}_${timestamp}_${random}`;
}

// This screen handles both "add new reader" and "edit existing reader".
// When an editId query param is present, it switches to edit mode.
export default function AddReaderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!editId;

  const { createReader, updateReader } = useReaders();
  const { selectedReader } = useReaderStore();

  const [avatarHistory, setAvatarHistory] = useState<string[]>(() => [generateAvatarSeed()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const avatarSeed = avatarHistory[historyIndex];

  const schema = useReaderSchema();
  const { control, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  // Reset form and generate fresh seed when entering add mode.
  useFocusEffect(
    useCallback(() => {
      if (!isEditing) {
        reset({ name: '' });
        const seed = generateAvatarSeed();
        setAvatarHistory([seed]);
        setHistoryIndex(0);
      }
    }, [isEditing])
  );

  // Pre-fill form and load existing seed when editing.
  useEffect(() => {
    if (isEditing && selectedReader) {
      setValue('name', selectedReader.name);
      const seed = selectedReader.avatar_seed ?? generateAvatarSeed(selectedReader.id);
      setAvatarHistory([seed]);
      setHistoryIndex(0);
    }
  }, [isEditing, selectedReader]);

  const goPrev = () => {
    if (historyIndex > 0) setHistoryIndex(i => i - 1);
  };

  const goNext = () => {
    if (historyIndex < avatarHistory.length - 1) {
      setHistoryIndex(i => i + 1);
    } else {
      const newSeed = generateAvatarSeed(isEditing ? editId : undefined);
      setAvatarHistory(h => [...h, newSeed]);
      setHistoryIndex(i => i + 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && editId) {
        await updateReader(editId, {
          name: data.name,
          old_avatar_seed: selectedReader?.avatar_seed ?? null,
          avatar_seed: avatarSeed,
        });
      } else {
        await createReader(data.name, avatarSeed);
      }
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEditing ? t('reader.editReader') : t('reader.newReader')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Avatar with navigation buttons */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRow}>
            <TouchableOpacity
              onPress={goPrev}
              disabled={historyIndex === 0}
              style={[styles.navButton, historyIndex === 0 && styles.navButtonDisabled]}
              activeOpacity={0.7}
            >
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>

            <MultiavatarView
              seed={avatarSeed}
              size={AVATAR_DISPLAY_SIZE}
              borderColor={Colors.primaryLight}
              borderWidth={3}
            />

            <TouchableOpacity onPress={goNext} style={styles.navButton} activeOpacity={0.7}>
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Name input */}
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={t('reader.readerName')}
              placeholder={t('reader.readerNamePlaceholder')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              error={errors.name?.message}
            />
          )}
        />

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
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    marginTop: Spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 28,
    color: Colors.secondary,
    lineHeight: 32,
  },
  saveButton: { marginTop: Spacing.md },
});
