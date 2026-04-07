import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../src/i18n';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../../../src/stores/authStore';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';

interface SettingsRowProps {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  value?: string;
}

function SettingsRow({ icon, label, onPress, danger, value }: SettingsRowProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, signOut } = useAuthStore();

  const currentLang = i18n.language as SupportedLanguage;

  const handleSignOut = () => {
    Alert.alert(t('auth.signOut'), t('auth.signOut') + '?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.signOut'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/sign-in');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.screenTitle}>{t('settings.title')}</Text>

        {/* Account section */}
        <Text style={styles.sectionLabel}>{t('settings.account')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="👤"
            label={t('settings.displayName')}
            value={profile?.display_name ?? '—'}
            onPress={() => {/* TODO: edit name screen */}}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="🔐"
            label={t('settings.changePassword')}
            onPress={() => router.push('/auth/forgot-password')}
          />
        </View>

        {/* Parental controls section */}
        <Text style={styles.sectionLabel}>{t('settings.parentalControls')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="🛡️"
            label={t('settings.parentalControlsTitle')}
            onPress={() => router.push('/app/settings/parental')}
          />
        </View>

        {/* Reward formula section */}
        <Text style={styles.sectionLabel}>{t('settings.formula')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="🧮"
            label={t('settings.formulaTitle')}
            onPress={() => router.push('/app/settings/formula')}
          />
        </View>

        {/* Language section */}
        <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
        <View style={styles.card}>
          {SUPPORTED_LANGUAGES.map((lang, index) => (
            <View key={lang}>
              <TouchableOpacity
                onPress={() => i18n.changeLanguage(lang)}
                activeOpacity={0.75}
                style={styles.langRow}
              >
                <Text style={styles.rowIcon}>
                  {lang === 'en' ? '🇬🇧' : lang === 'de' ? '🇩🇪' : '🇧🇷'}
                </Text>
                <Text style={styles.rowLabel}>{t(`languages.${lang}`)}</Text>
                {currentLang === lang && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
              {index < SUPPORTED_LANGUAGES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Danger zone */}
        <View style={styles.card}>
          <SettingsRow
            icon="🚪"
            label={t('settings.signOut')}
            onPress={handleSignOut}
            danger
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  screenTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowIcon: { fontSize: 20, marginRight: Spacing.md },
  rowLabel: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  rowValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  rowChevron: {
    fontSize: FontSizes.xl,
    color: Colors.textDisabled,
  },
  checkmark: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontFamily: Fonts.bodyBold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.lg + 20 + Spacing.md,
  },
  dangerText: { color: Colors.error },
});
