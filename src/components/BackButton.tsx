import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Fonts, FontSizes, Spacing } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

interface BackButtonProps {
  onPress?: () => void;
  label?: string;
  style?: object;
}

export function BackButton({ onPress, label, style }: BackButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      style={[styles.row, style]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.chevron, { color: theme.secondary }]}>‹</Text>
      <Text style={[styles.label, { color: theme.secondary }]}>
        {label ?? t('common.back')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  chevron: {
    fontSize: 28,
    marginRight: 2,
    lineHeight: 28,
    includeFontPadding: false,
  } as any,
  label: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    marginTop: 3,
  },
});
