import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { verifyPin } from '../lib/pinHash';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '../constants/theme';

export interface PinModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** SHA-256 hash to verify against. If null/undefined, any 4-digit PIN is accepted. */
  pinHash?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const PIN_LENGTH = 4;

export function PinModal({ visible, title, subtitle, pinHash, onSuccess, onCancel }: PinModalProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Reset state whenever modal opens
  useEffect(() => {
    if (visible) {
      setDigits([]);
      setError(false);
    }
  }, [visible]);

  // Auto-verify once 4 digits are entered
  useEffect(() => {
    if (digits.length !== PIN_LENGTH) return;

    const entered = digits.join('');

    const verify = async () => {
      // If no hash set, any 4-digit entry unlocks (unprotected readers / parent hasn't set PIN yet)
      if (!pinHash) {
        onSuccess();
        return;
      }

      const ok = await verifyPin(entered, pinHash);
      if (ok) {
        onSuccess();
      } else {
        triggerShake();
        setDigits([]);
      }
    };

    verify();
  }, [digits]);

  const triggerShake = () => {
    setError(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => setError(false));
  };

  const handlePress = (value: string) => {
    if (digits.length >= PIN_LENGTH) return;
    setDigits((prev) => [...prev, value]);
  };

  const handleBackspace = () => {
    setDigits((prev) => prev.slice(0, -1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Lock icon */}
          <Text style={styles.lockIcon}>🔒</Text>

          {/* Title + subtitle */}
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {/* PIN dots */}
          <Animated.View
            style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < digits.length && styles.dotFilled,
                  error && styles.dotError,
                ]}
              />
            ))}
          </Animated.View>

          {/* Numeric keypad */}
          <View style={styles.keypad}>
            {['1','2','3','4','5','6','7','8','9'].map((n) => (
              <TouchableOpacity
                key={n}
                style={styles.key}
                onPress={() => handlePress(n)}
                activeOpacity={0.7}
              >
                <Text style={styles.keyText}>{n}</Text>
              </TouchableOpacity>
            ))}

            {/* Bottom row: empty | 0 | backspace */}
            <View style={styles.key} />
            <TouchableOpacity
              style={styles.key}
              onPress={() => handlePress('0')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.key}
              onPress={handleBackspace}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>⌫</Text>
            </TouchableOpacity>
          </View>

          {/* Cancel link */}
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const DOT_SIZE = 16;
const KEY_SIZE = 68;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.secondary,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.secondary,
  },
  dotError: {
    borderColor: Colors.error,
    backgroundColor: Colors.error,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: KEY_SIZE * 3 + Spacing.sm * 2,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  keyText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
  },
  cancelText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
