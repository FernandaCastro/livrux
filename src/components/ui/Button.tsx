import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: {
      backgroundColor: Colors.primary,
      shadowColor: Colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 12,
      elevation: 5,
    },
    text: { color: Colors.textOnPrimary },
  },
  secondary: {
    container: {
      backgroundColor: Colors.secondary,
      shadowColor: Colors.secondary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    },
    text: { color: Colors.textOnPrimary },
  },
  outline: {
    container: {
      backgroundColor: Colors.surface,
      borderWidth: 2.5,
      borderColor: Colors.secondary2,
    },
    text: { color: Colors.secondary },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: Colors.secondary },
  },
  danger: {
    container: {
      backgroundColor: Colors.error,
      shadowColor: Colors.error,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    text: { color: Colors.textOnPrimary },
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const vs = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.80}
      style={[
        styles.base,
        vs.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vs.text.color as string} />
      ) : (
        <Text style={[styles.label, vs.text]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: FontSizes.md,
    letterSpacing: 0.4,
  },
});
