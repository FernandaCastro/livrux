import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToastStore, type Toast, type ToastType } from '../stores/toastStore';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '../constants/theme';

const AUTO_DISMISS_MS = 3500;
const ANIM_MS = 320;

const TOAST_STYLE: Record<ToastType, { bg: string; border: string; icon: string; titleColor: string }> = {
  success: { bg: '#F0FDF4', border: Colors.success,  icon: '✓', titleColor: '#15803D' },
  error:   { bg: '#FFF1F2', border: Colors.error,    icon: '✕', titleColor: '#BE123C' },
  info:    { bg: '#EFF6FF', border: Colors.info,     icon: 'ℹ', titleColor: '#1D4ED8' },
  warning: { bg: '#FFFBEB', border: Colors.warning,  icon: '⚠', titleColor: '#B45309' },
};

function ToastCard({ toast }: { toast: Toast }) {
  const { dismiss } = useToastStore();
  const translateY = useSharedValue(-120);

  const style = TOAST_STYLE[toast.type];

  useEffect(() => {
    translateY.value = withTiming(0, { duration: ANIM_MS, easing: Easing.out(Easing.back(1.4)) });

    const timer = setTimeout(() => {
      translateY.value = withTiming(-120, { duration: ANIM_MS }, () => {
        runOnJS(dismiss)(toast.id);
      });
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => dismiss(toast.id)}
        style={[styles.card, { backgroundColor: style.bg, borderLeftColor: style.border }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: style.border }]}>
          <Text style={styles.icon}>{style.icon}</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: style.titleColor }]}>{toast.title}</Text>
          {toast.message && <Text style={styles.message}>{toast.message}</Text>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastContainer() {
  const { toasts } = useToastStore();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + Spacing.sm }]} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.lg,
    paddingLeft: Spacing.sm,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: 13,
    color: '#fff',
    fontFamily: Fonts.bodyBold,
  },
  textWrap: { flex: 1 },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.sm,
    lineHeight: 18,
  },
  message: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
