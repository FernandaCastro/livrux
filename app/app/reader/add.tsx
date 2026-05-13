import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useReaders } from '../../../src/hooks/useReaders';
import { useReaderStore } from '../../../src/stores/readerStore';
import { useToastStore } from '../../../src/stores/toastStore';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { MultiavatarView } from '../../../src/components/reader/MultiavatarView';
import { FloatingEmojis } from '../../../src/components/FloatingEmojis';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows, themes, type ThemeId } from '../../../src/constants/theme';

const AVATAR_DISPLAY_SIZE = 100;

const THEME_OPTIONS: { id: ThemeId; label: string; colors: [string, string] }[] = [
  { id: 'classic', label: 'Clássico', colors: ['#7C3AED', '#A855F7'] },
  { id: 'noite',   label: 'Noite',    colors: ['#0F172A', '#818CF8'] },
  { id: 'indigo',  label: 'Índigo',   colors: ['#4F46E5', '#06B6D4'] },
  { id: 'rubi',    label: 'Rubi',     colors: ['#0F172A', '#EF4444'] },
];

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

export default function AddReaderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!editId;

  const { createReader, updateReader } = useReaders();
  const { selectedReader, loadThemeForReader, saveThemeForReader, currentThemeId } = useReaderStore();
  const showToast = useToastStore((s) => s.show);

  const [avatarHistory, setAvatarHistory] = useState<string[]>(() => [generateAvatarSeed()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const avatarSeed = avatarHistory[historyIndex];

  const schema = useReaderSchema();
  const { control, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  useFocusEffect(
    useCallback(() => {
      if (!isEditing) {
        reset({ name: '' });
        const seed = generateAvatarSeed();
        setAvatarHistory([seed]);
        setHistoryIndex(0);
      } else if (editId) {
        loadThemeForReader(editId);
      }
    }, [isEditing, editId])
  );

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
      showToast({ type: 'error', title: t('common.error') });
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#f0e6ff', '#fff7ed', '#fafaf7']}
        locations={[0, 0.6, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <FloatingEmojis />

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

          {/* Avatar picker */}
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

              <View style={styles.avatarGlow}>
                <MultiavatarView
                  seed={avatarSeed}
                  size={AVATAR_DISPLAY_SIZE}
                  borderColor={Colors.secondary}
                  borderWidth={3}
                />
              </View>

              <TouchableOpacity onPress={goNext} style={styles.navButton} activeOpacity={0.7}>
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarHint}>{t('reader.avatarHint', { defaultValue: '‹ › para trocar avatar' })}</Text>
          </View>

          {/* Theme picker — only shown when editing an existing reader */}
          {isEditing && editId && (
            <View style={styles.themeSection}>
              <Text style={styles.themeLabel}>Tema</Text>
              <View style={styles.themeRow}>
                {THEME_OPTIONS.map((opt) => {
                  const selected = currentThemeId === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.themeOption}
                      onPress={() => saveThemeForReader(editId, opt.id)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={opt.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.themeSwatch,
                          selected && styles.themeSwatchSelected,
                        ]}
                      >
                        {selected && <Text style={styles.themeCheck}>✓</Text>}
                      </LinearGradient>
                      <Text style={[styles.themeOptionLabel, selected && styles.themeOptionLabelSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

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
            variant="secondary"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            fullWidth
            style={styles.saveButton}
          />
        </ScrollView>
        <BottomMenu />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },
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
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  avatarGlow: {
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 6,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
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
  avatarHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },

  /* Theme picker */
  themeSection: {
    marginBottom: Spacing.xl,
  },
  themeLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  themeRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    justifyContent: 'center',
  },
  themeOption: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  themeSwatch: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  themeSwatchSelected: {
    borderWidth: 3,
    borderColor: Colors.textPrimary,
  },
  themeCheck: {
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: Fonts.bodyBold,
  },
  themeOptionLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  themeOptionLabelSelected: {
    fontFamily: Fonts.bodyBold,
    color: Colors.textPrimary,
  },

  saveButton: { marginTop: Spacing.md },
});
