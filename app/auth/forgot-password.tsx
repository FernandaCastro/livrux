import { useState, useEffect, useRef } from 'react';
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

const RESEND_COOLDOWN_S = 60;

function useStep1Schema() {
  const { t } = useTranslation();
  return z.object({
    email: z.string().email(t('auth.errors.invalidEmail')),
  });
}

function useStep2Schema() {
  const { t } = useTranslation();
  return z
    .object({
      code: z.string().length(6, t('auth.errors.invalidCode')),
      newPassword: z.string().min(8, t('auth.errors.weakPassword')),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: t('auth.errors.passwordMismatch'),
      path: ['confirmPassword'],
    });
}

type Step1Data = { email: string };
type Step2Data = { code: string; newPassword: string; confirmPassword: string };

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step1Schema = useStep1Schema();
  const step2Schema = useStep2Schema();

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: '' },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_S);
    timerRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const sendCode = async (emailAddress: string) => {
    await supabase.auth.signInWithOtp({
      email: emailAddress,
      options: { shouldCreateUser: false },
    });
    startCooldown();
  };

  const onStep1Submit = async (data: Step1Data) => {
    setServerError('');
    await sendCode(data.email);
    // Always advance to prevent email enumeration.
    setEmail(data.email);
    setStep(2);
  };

  const onResend = async () => {
    if (resendCooldown > 0) return;
    setServerError('');
    step2Form.reset();
    await sendCode(email);
  };

  const onStep2Submit = async (data: Step2Data) => {
    setServerError('');

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: data.code.trim(),
      type: 'email',
    });

    if (verifyError) {
      // Show raw Supabase error to help diagnose configuration issues.
      setServerError(verifyError.message);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: data.newPassword,
    });

    if (updateError) {
      await supabase.auth.signOut();
      setServerError(t('auth.errors.generic'));
      return;
    }

    // Sign out so the temporary session doesn't navigate the user into the app.
    await supabase.auth.signOut();
    setDone(true);
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
          <TouchableOpacity
            onPress={() => (step === 2 && !done ? setStep(1) : router.back())}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.icon}>🔑</Text>
            <Text style={styles.title}>{t('auth.resetPassword')}</Text>
          </View>

          {done ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✅ {t('auth.resetSuccess')}</Text>
              <Button
                label={t('auth.signIn')}
                onPress={() => router.replace('/auth/sign-in')}
                fullWidth
                style={styles.backToSignIn}
              />
            </View>
          ) : step === 1 ? (
            <>
              {serverError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{serverError}</Text>
                </View>
              ) : null}
              <Controller
                control={step1Form.control}
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
                    error={step1Form.formState.errors.email?.message}
                  />
                )}
              />
              <Button
                label={t('auth.sendCode')}
                onPress={step1Form.handleSubmit(onStep1Submit)}
                loading={step1Form.formState.isSubmitting}
                fullWidth
                style={styles.submitButton}
              />
            </>
          ) : (
            <>
              <View style={styles.infoBanner}>
                <Text style={styles.infoText}>{t('auth.codeSent')}</Text>
              </View>

              {serverError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{serverError}</Text>
                </View>
              ) : null}

              <Controller
                control={step2Form.control}
                name="code"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t('auth.verificationCode')}
                    placeholder={t('auth.verificationCodePlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    error={step2Form.formState.errors.code?.message}
                  />
                )}
              />
              <Controller
                control={step2Form.control}
                name="newPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t('auth.newPassword')}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    isPassword
                    error={step2Form.formState.errors.newPassword?.message}
                  />
                )}
              />
              <Controller
                control={step2Form.control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t('auth.confirmPassword')}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    isPassword
                    error={step2Form.formState.errors.confirmPassword?.message}
                  />
                )}
              />
              <Button
                label={t('auth.resetPassword')}
                onPress={step2Form.handleSubmit(onStep2Submit)}
                loading={step2Form.formState.isSubmitting}
                fullWidth
                style={styles.submitButton}
              />

              <TouchableOpacity
                onPress={onResend}
                disabled={resendCooldown > 0}
                style={styles.resendButton}
              >
                <Text style={[styles.resendText, resendCooldown > 0 && styles.resendDisabled]}>
                  {resendCooldown > 0
                    ? t('auth.resendCodeIn', { seconds: resendCooldown })
                    : t('auth.resendCode')}
                </Text>
              </TouchableOpacity>
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
  resendButton: { alignItems: 'center', marginTop: Spacing.lg },
  resendText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  resendDisabled: { color: Colors.textSecondary },
  infoBanner: {
    backgroundColor: '#E3F2FD',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  infoText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
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
