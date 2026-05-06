import { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { Button } from '../../src/components/ui/Button';
import { TextInput } from '../../src/components/ui/TextInput';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../../src/constants/legal';
import { Colors, Fonts, FontSizes, Spacing, Radius } from '../../src/constants/theme';

function useSignUpSchema() {
  const { t } = useTranslation();
  return z
    .object({
      name: z.string().min(1),
      email: z.string().email(t('auth.errors.invalidEmail')),
      password: z.string().min(8, t('auth.errors.weakPassword')),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: t('auth.errors.passwordMismatch'),
      path: ['confirmPassword'],
    });
}

type FormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignUpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const schema = useSignUpSchema();
  const setPendingEmailConfirmation = useAuthStore((s) => s.setPendingEmailConfirmation);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: FormData) => {
    if (!termsAccepted) {
      setTermsError(true);
      return;
    }

    setServerError('');
    setTermsError(false);

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          display_name: data.name,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setServerError(
        error.message.toLowerCase().includes('already')
          ? t('auth.errors.emailInUse')
          : t('auth.errors.generic')
      );
    } else {
      setPendingEmailConfirmation(true);
      router.replace('/');
    }
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={require('../../assets/adaptive-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>{t('auth.signUp')}</Text>
          </View>

          <View style={styles.form}>
            {serverError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            ) : null}

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label={t('auth.name')}
                  placeholder="Ana Silva"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoComplete="name"
                  error={errors.name?.message}
                />
              )}
            />

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

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label={t('auth.password')}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  isPassword
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label={t('auth.confirmPassword')}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  isPassword
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            {/* Terms & Privacy consent */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => {
                setTermsAccepted((v) => !v);
                setTermsError(false);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                {t('auth.termsAgree')}{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => Linking.openURL(TERMS_URL)}
                >
                  {t('auth.termsLink')}
                </Text>
                {' '}{t('auth.termsAnd')}{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
                >
                  {t('auth.privacyLink')}
                </Text>
                .
              </Text>
            </TouchableOpacity>
            {termsError && (
              <Text style={styles.termsErrorText}>{t('auth.errors.termsRequired')}</Text>
            )}

            <Button
              label={t('auth.signUp')}
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              fullWidth
              style={styles.submitButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.hasAccount')} </Text>
            <Link href="/auth/sign-in" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>{t('auth.signIn')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
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
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: { flex: 1 },
  errorBanner: {
    backgroundColor: '#FDECEA',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  errorBannerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textDisabled,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.bodyBold,
    lineHeight: 16,
  },
  termsText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    fontFamily: Fonts.bodyBold,
    color: Colors.secondary,
    textDecorationLine: 'underline',
  },
  termsErrorText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: 22 + Spacing.sm,
  },
  submitButton: { marginTop: Spacing.md },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
});
