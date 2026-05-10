import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useDialogStore } from '../stores/dialogStore';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '../constants/theme';

export function ConfirmSheet() {
  const { t } = useTranslation();
  const { dialog, hide } = useDialogStore();
  const [loading, setLoading] = useState(false);

  if (!dialog) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await dialog.onConfirm();
    } finally {
      setLoading(false);
      hide();
    }
  };

  const handleCancel = () => {
    dialog.onCancel?.();
    hide();
  };

  const confirmColor = dialog.danger ? Colors.error : Colors.secondary;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.indicator, { backgroundColor: dialog.danger ? Colors.error : Colors.secondary }]} />

          <Text style={styles.title}>{dialog.title}</Text>
          <Text style={styles.message}>{dialog.message}</Text>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: confirmColor }]}
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmBtnText}>{dialog.confirmLabel ?? t('common.confirm')}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>{dialog.cancelLabel ?? t('common.cancel')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 40,
    alignItems: 'center',
  },
  indicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.lg,
    opacity: 0.4,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  confirmBtn: {
    width: '100%',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  confirmBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: '#fff',
  },
  cancelBtn: {
    paddingVertical: Spacing.sm,
  },
  cancelBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});
