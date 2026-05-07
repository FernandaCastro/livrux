import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Colors, Fonts, FontSizes, Spacing, Radius } from '../constants/theme';

const RESEND_COOLDOWN_S = 60;

interface Props {
  style?: object;
}

export function ConfirmationBanner({ style }: Props) {
  const { t } = useTranslation();
  const { setPendingEmailConfirmation, confirmationEmail } = useAuthStore();
  const [cooldown, setCooldown] = useState(0);
  const [justSent, setJustSent] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_S);
    intervalRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (!confirmationEmail || cooldown > 0) return;
    await supabase.auth.resend({ type: 'signup', email: confirmationEmail });
    setJustSent(true);
    setTimeout(() => setJustSent(false), 3000);
    startCooldown();
  };

  return (
    <View style={[styles.banner, style]}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.confirmationEmailTitle')}</Text>
        <Text style={styles.body}>{t('auth.confirmationEmailBody')}</Text>
        {confirmationEmail && (
          <Pressable
            onPress={handleResend}
            disabled={cooldown > 0}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.resendLink, cooldown > 0 && styles.resendLinkDisabled]}>
              {justSent
                ? t('auth.resendConfirmationEmailSent')
                : cooldown > 0
                ? t('auth.resendConfirmationEmailIn', { seconds: cooldown })
                : t('auth.resendConfirmationEmail')}
            </Text>
          </Pressable>
        )}
      </View>
      <Pressable
        onPress={() => setPendingEmailConfirmation(false)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.close}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  content: { flex: 1 },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.sm,
    color: Colors.info,
    marginBottom: 2,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: '#1565C0',
  },
  resendLink: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.info,
    marginTop: Spacing.xs,
    textDecorationLine: 'underline',
  },
  resendLinkDisabled: {
    textDecorationLine: 'none',
    opacity: 0.5,
  },
  close: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.sm,
    color: Colors.info,
    marginLeft: Spacing.sm,
  },
});
