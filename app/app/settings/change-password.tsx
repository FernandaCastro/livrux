import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../../src/lib/supabase';
import { useToastStore } from '../../../src/stores/toastStore';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { FloatingEmojis } from '../../../src/components/FloatingEmojis';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing } from '../../../src/constants/theme';

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
  const showToast = useToastStore((s) => s.show);

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
      showToast({ type: 'error', title: t('common.error'), message: error.message });
    } else {
      showToast({ type: 'success', title: t('auth.passwordChanged'), message: t('auth.passwordChangedBody') });
      router.back();
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
