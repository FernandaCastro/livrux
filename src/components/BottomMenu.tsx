import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../stores/authStore';
import { useParentalStore } from '../stores/parentalStore';
import { useReaderStore } from '../stores/readerStore';
import { MultiavatarView } from './reader/MultiavatarView';
import { ReaderSelectorSheet } from './ReaderSelectorSheet';
import { Colors, Fonts, FontSizes, Spacing } from '../constants/theme';

export const BOTTOM_MENU_HEIGHT = 54;

export function BottomMenu() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const { isParentUnlocked } = useParentalStore();
  const { selectedReader } = useReaderStore();
  const [sheetVisible, setSheetVisible] = useState(false);

  const showSettingsTab = !profile?.parental_pin || isParentUnlocked;

  const isSettings = pathname.startsWith('/app/settings');
  const isWallet = pathname.startsWith('/app/rewards');
  const isFriends = pathname.startsWith('/app/friends') || pathname.startsWith('/app/friend/');
  const isReaderContext = !isSettings && !isWallet && !isFriends;

  if (!selectedReader) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.replace('/app')}
          activeOpacity={0.7}
        >
          <Image source={require('../../assets/readers.png')} style={styles.readersIcon} resizeMode="contain" />
          <Text style={[styles.label, !isSettings && styles.activeLabel]}>{t('home.title')}</Text>
        </TouchableOpacity>

        {showSettingsTab && (
          <TouchableOpacity
            style={styles.tab}
            onPress={() => router.push('/app/settings')}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>⚙️</Text>
            <Text style={[styles.label, isSettings && styles.activeLabel]}>{t('settings.title')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <>
      <ReaderSelectorSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
      <View style={styles.container}>
        {/* Reader avatar — opens selector sheet */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setSheetVisible(true)}
          activeOpacity={0.7}
        >
          <MultiavatarView seed={selectedReader.avatar_seed} size={26} />
          <Text
            style={[styles.label, isReaderContext && styles.activeReaderLabel]}
            numberOfLines={1}
          >
            {selectedReader.name}
          </Text>
        </TouchableOpacity>

        {/* Rewards */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push(`/app/rewards?readerId=${selectedReader.id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>🪙</Text>
          <Text style={[styles.label, isWallet && styles.activeLabel]}>{t('rewards.title')}</Text>
        </TouchableOpacity>

        {/* Friends */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push(`/app/friends/${selectedReader.id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>👦👧</Text>
          <Text style={[styles.label, isFriends && styles.activeFriendsLabel]}>{t('friends.title')}</Text>
        </TouchableOpacity>

        {/* Settings */}
        {showSettingsTab && (
          <TouchableOpacity
            style={styles.tab}
            onPress={() => router.push('/app/settings')}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>⚙️</Text>
            <Text style={[styles.label, isSettings && styles.activeLabel]}>{t('settings.title')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
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
  readersIcon: { width: 50, height: 50, marginTop: -9, marginBottom: -7 },
  icon: { fontSize: 22 },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.textDisabled,
  },
  activeLabel: {
    color: Colors.primary,
  },
  activeReaderLabel: {
    color: Colors.readerBlue,
  },
  activeFriendsLabel: {
    color: Colors.chipFriend,
  },
});
