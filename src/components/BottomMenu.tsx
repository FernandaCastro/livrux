import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../stores/authStore';
import { useParentalStore } from '../stores/parentalStore';
import { useReaderStore } from '../stores/readerStore';
import { MultiavatarView } from './reader/MultiavatarView';
import { Fonts, FontSizes, Spacing, Radius, type ColorPalette } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

export const BOTTOM_MENU_HEIGHT = 62;

const ACCENT_FRIENDS  = '#3ECA8C';
const ACCENT_RANKING  = '#FF6B35';

function TabIndicator({ color }: { color: string }) {
  return <View style={[staticStyles.indicator, { backgroundColor: color }]} />;
}

function createStyles(theme: ColorPalette) {
  return StyleSheet.create({
    container: {
      height: BOTTOM_MENU_HEIGHT,
      flexDirection: 'row',
      backgroundColor: theme.navBackground,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readerActiveWrap: { backgroundColor: theme.secondaryLight },
    label: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.xs,
      color: theme.textDisabled,
      maxWidth: 72,
    },
  });
}

const staticStyles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderBottomLeftRadius: Radius.full,
    borderBottomRightRadius: Radius.full,
  },
  readersIcon: { width: 50, height: 50, marginTop: -9, marginBottom: -7 },
  icon: { fontSize: 28 },
  iconIcon: { width: 33, height: 33 },
});

export function BottomMenu() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const { isParentUnlocked } = useParentalStore();
  const { selectedReader, openReaderSelector } = useReaderStore();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const showSettingsTab = !profile?.parental_pin || isParentUnlocked;

  const isSettings   = pathname.startsWith('/app/settings');
  const isWallet     = pathname.startsWith('/app/rewards');
  const isFriends    = pathname.startsWith('/app/friends') || pathname.startsWith('/app/friend/');
  const isRanking    = pathname.startsWith('/app/ranking');
  const isReader     = !isSettings && !isWallet && !isFriends && !isRanking;

  // Already on a tab → replace so the stack doesn't accumulate.
  // Coming from the reader screen → push to keep the reader in the back stack.
  const navigate = isReader
    ? (path: string) => router.push(path as any)
    : (path: string) => router.replace(path as any);

  if (!selectedReader) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.replace('/app')}
          activeOpacity={0.7}
        >
          {isReader && <TabIndicator color={theme.secondary} />}
          <Image source={require('../../assets/readers.png')} style={staticStyles.readersIcon} resizeMode="contain" />
        </TouchableOpacity>

        {showSettingsTab && (
          <TouchableOpacity
            style={styles.tab}
            onPress={() => router.push('/app/settings')}
            activeOpacity={0.7}
          >
            {isSettings && <TabIndicator color={theme.textSecondary} />}
            <Text style={staticStyles.icon}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>

        {/* Reader */}
        <TouchableOpacity
          style={styles.tab}
          onPress={openReaderSelector}
          activeOpacity={0.7}
        >
          {isReader && <TabIndicator color={theme.secondary} />}
          <View style={[styles.iconWrap, isReader && styles.readerActiveWrap]}>
            <MultiavatarView seed={selectedReader.avatar_seed} size={30} />
          </View>
        </TouchableOpacity>

        {/* Rewards — gold */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigate(`/app/rewards?readerId=${selectedReader.id}`)}
          activeOpacity={0.7}
        >
          {isWallet && <TabIndicator color={theme.primary} />}
          <View style={[styles.iconWrap, isWallet && { backgroundColor: '#FEF3C7' }]}>
            <Text style={staticStyles.icon}>🪙</Text>
          </View>
        </TouchableOpacity>

        {/* Friends — jade */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigate(`/app/friends/${selectedReader.id}`)}
          activeOpacity={0.7}
        >
          {isFriends && <TabIndicator color={ACCENT_FRIENDS} />}
          <View style={[styles.iconWrap, isFriends && { backgroundColor: '#D1FAE5' }]}>
            <Image source={require('../../assets/friends.png')} style={staticStyles.iconIcon} resizeMode="contain" />
          </View>
        </TouchableOpacity>

        {/* Ranking — orange */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigate('/app/ranking')}
          activeOpacity={0.7}
        >
          {isRanking && <TabIndicator color={ACCENT_RANKING} />}
          <View style={[styles.iconWrap, isRanking && { backgroundColor: '#FFE8DF' }]}>
            <Text style={staticStyles.icon}>🏆</Text>
          </View>
        </TouchableOpacity>

        {/* Settings — grey */}
        {showSettingsTab && (
          <TouchableOpacity
            style={styles.tab}
            onPress={() => router.push('/app/settings')}
            activeOpacity={0.7}
          >
            {isSettings && <TabIndicator color={theme.textSecondary} />}
            <View style={[styles.iconWrap, isSettings && { backgroundColor: theme.border }]}>
              <Text style={staticStyles.icon}>⚙️</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}
