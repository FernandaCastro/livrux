import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes } from '../../src/constants/theme';
import { useReaderStore } from '../../src/stores/readerStore';
import { ConfettiOverlay } from '../../src/components/ConfettiOverlay';
import { useParentalStore } from '../../src/stores/parentalStore';
import { useParentalGuard } from '../../src/hooks/useParentalGuard';

// Bottom tab navigator for the main app sections.
export default function AppLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { confettiTrigger, clearConfetti } = useReaderStore();
  const { requireParentPin, requireReaderPin, modalProps } = useParentalGuard();

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textDisabled,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 54 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.bodySemiBold,
          fontSize: FontSizes.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.title'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: t('settings.title'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⚙️</Text>,
        }}
      />
      {/* Hidden routes — not shown in the tab bar */}
      <Tabs.Screen name="reader/[id]" options={{ href: null }} />
      <Tabs.Screen name="reader/add" options={{ href: null }} />
      <Tabs.Screen name="book/add" options={{ href: null }} />
      <Tabs.Screen name="book/[id]" options={{ href: null }} />
      <Tabs.Screen name="book/edit" options={{ href: null }} />
      <Tabs.Screen name="settings/formula" options={{ href: null }} />
      <Tabs.Screen name="spend" options={{ href: null }} />
      <Tabs.Screen name="settings/parental" options={{ href: null }} />
      <Tabs.Screen name="rewards/index" options={{ href: null }} />

    </Tabs>
    <ConfettiOverlay
      visible={!!confettiTrigger}
      prevCount={confettiTrigger?.prev ?? 0}
      newCount={confettiTrigger?.next ?? 0}
      onDone={clearConfetti}
    />
    </>
  );
}
