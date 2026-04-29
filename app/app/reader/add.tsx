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

  const [avatarSeed, setAvatarSeed] = useState<string>(() => generateAvatarSeed());

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
        setAvatarSeed(generateAvatarSeed());
      }
    }, [isEditing])
  );

  // Pre-fill form and load existing seed when editing.
  useEffect(() => {
    if (isEditing && selectedReader) {
      setValue('name', selectedReader.name);
      setAvatarSeed(selectedReader.avatar_seed ?? generateAvatarSeed(selectedReader.id));
    }
  }, [isEditing, selectedReader]);

  const refreshAvatar = () => {
    const readerId = isEditing ? editId : undefined;
    setAvatarSeed(generateAvatarSeed(readerId));
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

        {/* Avatar with refresh button */}
        <View style={styles.avatarSection}>
          <MultiavatarView
            seed={avatarSeed}
            size={AVATAR_DISPLAY_SIZE}
            borderColor={Colors.primaryLight}
            borderWidth={3}
          />
          <TouchableOpacity onPress={refreshAvatar} style={styles.refreshButton} activeOpacity={0.75}>
            <Text style={styles.refreshIcon}>🔄</Text>
            <Text style={styles.refreshLabel}>{t('reader.refreshAvatar')}</Text>
          </TouchableOpacity>
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
    gap: Spacing.sm,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    ...Shadows.sm,
  },
  refreshIcon: { fontSize: 16 },
  refreshLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  saveButton: { marginTop: Spacing.md },
});
