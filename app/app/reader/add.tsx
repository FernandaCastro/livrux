import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReaders } from '../../../src/hooks/useReaders';
import { useReaderStore } from '../../../src/stores/readerStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { uploadImage } from '../../../src/lib/storage';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';

const AVATAR_SIZE = 100;

function useReaderSchema() {
  const { t } = useTranslation();
  return z.object({
    name: z.string().min(1, t('reader.readerName')),
  });
}

type FormData = { name: string };

// This screen handles both "add new reader" and "edit existing reader".
// When an editId query param is present, it switches to edit mode.
export default function AddReaderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!editId;

  const { user } = useAuthStore();
  const { createReader, updateReader } = useReaders();
  const { selectedReader } = useReaderStore();

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const schema = useReaderSchema();
  const { control, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  // Reset form and avatar when the screen gains focus in add mode.
  // Needed because this is a Tab screen (cached) so it never unmounts.
  useFocusEffect(
    useCallback(() => {
      if (!isEditing) {
        reset({ name: '' });
        setAvatarUri(null);
      }
    }, [isEditing])
  );

  // Pre-fill the form when editing.
  useEffect(() => {
    if (isEditing && selectedReader) {
      setValue('name', selectedReader.name);
      setAvatarUri(selectedReader.avatar_url);
    }
  }, [isEditing, selectedReader]);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setIsUploading(true);

    try {
      if (isEditing && editId) {
        // Keep existing avatar unless the user picked a new one.
        let finalAvatarUrl = selectedReader?.avatar_url ?? null;
        if (avatarUri && avatarUri.startsWith('file')) {
          finalAvatarUrl = await uploadImage('avatars', user.id, editId, avatarUri);
        }
        await updateReader(editId, { name: data.name, avatar_url: finalAvatarUrl });
      } else {
        // Create the reader first to obtain its ID, then upload the avatar using
        // that ID so the storage path is always {userId}/{readerId}.jpg.
        const created = await createReader(data.name);
        if (avatarUri && avatarUri.startsWith('file')) {
          const avatarUrl = await uploadImage('avatars', user.id, created.id, avatarUri);
          await updateReader(created.id, { avatar_url: avatarUrl });
        }
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
        <TouchableOpacity onPress={pickAvatar} style={styles.avatarButton} activeOpacity={0.8}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarIcon}>📷</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>
              {avatarUri ? t('reader.changePhoto') : t('reader.addPhoto')}
            </Text>
          </View>
        </TouchableOpacity>

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
          loading={isSubmitting || isUploading}
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
  avatarButton: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    marginTop: Spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  avatarIcon: { fontSize: 36 },
  avatarBadge: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  avatarBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  saveButton: { marginTop: Spacing.md },
});
