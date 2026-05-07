import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../stores/authStore';
import { useParentalStore } from '../stores/parentalStore';
import { useReaderStore } from '../stores/readerStore';
import { MultiavatarView } from './reader/MultiavatarView';
import { ReaderSelectorSheet } from './ReaderSelectorSheet';
import { Colors, Fonts, FontSizes, Spacing, Radius } from '../constants/theme';

export const BOTTOM_MENU_HEIGHT = 62;

const ACCENT_READER  = Colors.secondary;   // purple
const ACCENT_REWARDS = Colors.primary;     // gold
const ACCENT_FRIENDS = '#3ECA8C';          // jade
const ACCENT_SETTINGS = Colors.textSecondary;

function TabIndicator({ color }: { color: string }) {
  return <View style={[styles.indicator, { backgroundColor: color }]} />;
}

export function BottomMenu() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const { isParentUnlocked } = useParentalStore();
  const { selectedReader } = useReaderStore();
  const [sheetVisible, setSheetVisible] = useState(false);

  const showSettingsTab = !profile?.parental_pin || isParentUnlocked;

  const isSettings   = pathname.startsWith('/app/settings');
  const isWallet     = pathname.startsWith('/app/rewards');
  const isFriends    = pathname.startsWith('/app/friends') || pathname.startsWith('/app/friend/');
  const isReader     = !isSettings && !isWallet && !isFriends;

  if (!selectedReader) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.replace('/app')}
          activeOpacity={0.7}
        >
          {isReader && <TabIndicator color={ACCENT_READER} />}
          <Image source={require('../../assets/readers.png')} style={styles.readersIcon} resizeMode="contain" />
          <Text style={[styles.label, isReader && { color: ACCENT_READER }]}>{t('home.title')}</Text>
        </TouchableOpacity>

        {showSettingsTab && (
          <TouchableOpacity
            style={styles.tab}
            onPress={() => router.push('/app/settings')}
            activeOpacity={0.7}
          >
            {isSettings && <TabIndicator color={ACCENT_SETTINGS} />}
            <Text style={styles.icon}>⚙️</Text>
            <Text style={[styles.label, isSettings && { color: ACCENT_SETTINGS }]}>{t('settings.title')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <>
      <ReaderSelectorSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
      <View style={styles.container}>

        {/* Reader — purple */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setSheetVisible(true)}
          activeOpacity={0.7}
        >
          {isReader && <TabIndicator color={ACCENT_READER} />}
          <View style={[styles.iconWrap, isReader && { backgroundColor: Colors.secondaryLight }]}>
            <MultiavatarView seed={selectedReader.avatar_seed} size={24} />
          </View>
          <Text style={[styles.label, isReader && { color: ACCENT_READER }]} numberOfLines={1}>
            {selectedReader.name}
          </Text>
        </TouchableOpacity>

        {/* Rewards — gold */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push(`/app/rewards?readerId=${selectedReader.id}`)}
          activeOpacity={0.7}
        >
          {isWallet && <TabIndicator color={ACCENT_REWARDS} />}
          <View style={[styles.iconWrap, isWallet && { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.icon}>🪙</Text>
          </View>
          <Text style={[styles.label, isWallet && { color: ACCENT_REWARDS }]}>{t('rewards.title')}</Text>
        </TouchableOpacity>

        {/* Friends — jade */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push(`/app/friends/${selectedReader.id}`)}
          activeOpacity={0.7}
        >
          {isFriends && <TabIndicator color={ACCENT_FRIENDS} />}
          <View style={[styles.iconWrap, isFriends && { backgroundColor: '#D1FAE5' }]}>
            <Text style={styles.icon}>👦👧</Text>
          </View>
          <Text style={[styles.label, isFriends && { color: ACCENT_FRIENDS }]}>{t('friends.title')}</Text>
        </TouchableOpacity>

        {/* Settings — grey */}
        {showSettingsTab && (
          <TouchableOpacity
            style={styles.tab}
            onPress={() => router.push('/app/settings')}
            activeOpacity={0.7}
          >
            {isSettings && <TabIndicator color={ACCENT_SETTINGS} />}
            <View style={[styles.iconWrap, isSettings && { backgroundColor: Colors.border }]}>
              <Text style={styles.icon}>⚙️</Text>
            </View>
            <Text style={[styles.label, isSettings && { color: ACCENT_SETTINGS }]}>{t('settings.title')}</Text>
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
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderBottomLeftRadius: Radius.full,
    borderBottomRightRadius: Radius.full,
  },
  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readersIcon: { width: 50, height: 50, marginTop: -9, marginBottom: -7 },
  icon: { fontSize: 20 },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.textDisabled,
    maxWidth: 72,
  },
});
