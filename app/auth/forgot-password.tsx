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

import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/ui/Button';
import { TextInput } from '../../src/components/ui/TextInput';
import { Colors, Fonts, FontSizes, Spacing, Radius } from '../../src/constants/theme';

function useForgotSchema() {
  const { t } = useTranslation();
  return z.object({
    email: z.string().email(t('auth.errors.invalidEmail')),
  });
}

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const schema = useForgotSchema();

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: { email: string }) => {
    await supabase.auth.resetPasswordForEmail(data.email);
    // Always show success to avoid email enumeration.
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.icon}>🔑</Text>
            <Text style={styles.title}>{t('auth.resetPassword')}</Text>
          </View>

          {sent ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✅ {t('auth.resetEmailSent')}</Text>
              <Button
                label={t('auth.signIn')}
                onPress={() => router.replace('/auth/sign-in')}
                fullWidth
                style={styles.backToSignIn}
              />
            </View>
          ) : (
            <>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t('auth.email')}
                    placeholder={t('auth.emailPlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    error={errors.email?.message}
                  />
                )}
              />
              <Button
                label={t('auth.resetPassword')}
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                fullWidth
                style={styles.submitButton}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  backButton: { marginBottom: Spacing.xl },
  backText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.secondary,
  },
  header: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  icon: { fontSize: 56, marginBottom: Spacing.md },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    color: Colors.textPrimary,
  },
  submitButton: { marginTop: Spacing.md },
  successBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  successText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.success,
    marginBottom: Spacing.lg,
  },
  backToSignIn: { marginTop: Spacing.md },
});
