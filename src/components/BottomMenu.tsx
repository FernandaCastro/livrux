import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../stores/authStore';
import { useParentalStore } from '../stores/parentalStore';
import { Colors, Fonts, FontSizes, Spacing } from '../constants/theme';

export const BOTTOM_MENU_HEIGHT = 54;

interface BottomMenuProps {
  showWallet?: boolean;
  readerId?: string;
}

export function BottomMenu({ showWallet = false, readerId }: BottomMenuProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const { isParentUnlocked } = useParentalStore();
  const showSettingsTab = !profile?.parental_pin || isParentUnlocked;

  const isSettings = pathname.startsWith('/app/settings');
  const isWallet = pathname.startsWith('/app/rewards');
  const isHome = !isSettings && !isWallet;

  return (
    <View style={styles.container}>
      {/* Left — always Home */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push('/app')}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>🏠</Text>
        <Text style={[styles.label, isHome && styles.activeLabel]}>{t('home.title')}</Text>
      </TouchableOpacity>

      {/* Centre — optional items (e.g. Wallet) */}
      <View style={styles.tab}>
        {showWallet && readerId && (
          <TouchableOpacity
            style={styles.centreItem}
            onPress={() => router.push(`/app/rewards?readerId=${readerId}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>🪙</Text>
            <Text style={[styles.label, isWallet && styles.activeLabel]}>{t('rewards.title')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Right — always Settings (placeholder keeps layout when hidden) */}
      <View style={styles.tab}>
        {showSettingsTab && (
          <TouchableOpacity
            style={styles.centreItem}
            onPress={() => router.push('/app/settings')}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>⚙️</Text>
            <Text style={[styles.label, isSettings && styles.activeLabel]}>{t('settings.title')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BOTTOM_MENU_HEIGHT,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xs,
    gap: 2,
  },
  centreItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  icon: { fontSize: 22 },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.textDisabled,
  },
  activeLabel: {
    color: Colors.primary,
  },
});
