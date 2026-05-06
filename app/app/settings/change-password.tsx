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
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius } from '../../../src/constants/theme';

const MIN_PASSWORD_LENGTH = 8;

function useSchema() {
  const { t } = useTranslation();
  return z
    .object({
      password: z.string().min(MIN_PASSWORD_LENGTH, t('auth.errors.passwordTooShort')),
      confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, {
      message: t('auth.errors.passwordMismatch'),
      path: ['confirm'],
    });
}

type FormData = { password: string; confirm: string };

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const schema = useSchema();
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setSaving(false);

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('auth.passwordChanged'), t('auth.passwordChangedBody'), [
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
            <Text style={styles.screenTitle}>{t('settings.changePassword')}</Text>
            <View style={{ width: 32 }} />
          </View>

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label={t('auth.newPassword')}
                value={value}
                onChangeText={onChange}
                secureTextEntry
                autoCapitalize="none"
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirm"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label={t('auth.confirmPassword')}
                value={value}
                onChangeText={onChange}
                secureTextEntry
                autoCapitalize="none"
                error={errors.confirm?.message}
              />
            )}
          />

          <Button
            label={t('auth.savePassword')}
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
