import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/stores/authStore';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing } from '../../../src/constants/theme';

const MAX_NAME_LENGTH = 50;

function useSchema() {
  const { t } = useTranslation();
  return z.object({
    displayName: z
      .string()
      .min(1, t('settings.displayNameRequired'))
      .max(MAX_NAME_LENGTH, t('settings.displayNameTooLong')),
  });
}

type FormData = { displayName: string };

export default function EditNameScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, fetchProfile } = useAuthStore();
  const schema = useSchema();
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: profile?.display_name ?? '' },
  });

  const onSubmit = async (data: FormData) => {
    const trimmed = data.displayName.trim();
    if (trimmed === (profile?.display_name ?? '')) {
      router.back();
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({ display_name: trimmed })
      .eq('id', profile?.id ?? '');
    setSaving(false);

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      await fetchProfile();
      Alert.alert(t('settings.displayNameSaved'), t('settings.displayNameSavedBody'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>{t('settings.displayName')}</Text>
            <View style={{ width: 32 }} />
          </View>

          <Controller
            control={control}
            name="displayName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label={t('settings.displayName')}
                placeholder={t('settings.displayNamePlaceholder')}
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
                autoFocus
                error={errors.displayName?.message}
              />
            )}
          />

          <Button
            label={t('common.save')}
            onPress={handleSubmit(onSubmit)}
            loading={saving}
            style={styles.button}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  backText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xl,
    color: Colors.secondary,
  },
  screenTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
  },
  button: {
    marginTop: Spacing.md,
  },
});
