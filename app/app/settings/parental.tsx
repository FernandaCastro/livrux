import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../../src/lib/supabase';
import { hashPin, verifyPin } from '../../../src/lib/pinHash';
import { useAuthStore } from '../../../src/stores/authStore';
import { useParentalStore } from '../../../src/stores/parentalStore';
import { useReaders } from '../../../src/hooks/useReaders';
import { PinModal } from '../../../src/components/PinModal';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';
import type { Reader } from '../../../src/types';

// ─── PinCaptureModal ──────────────────────────────────────────────────────────
// Collects a new PIN (no verification) and returns the SHA-256 hash via onCapture.

interface PinCaptureModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onCapture: (hash: string) => void;
  onCancel: () => void;
}

function PinCaptureModal({ visible, title, subtitle, onCapture, onCancel }: PinCaptureModalProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setDigits([]);
  }, [visible]);

  useEffect(() => {
    if (digits.length !== 4) return;
    hashPin(digits.join('')).then((h) => onCapture(h));
  }, [digits]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={cs.overlay} onPress={onCancel}>
        <Pressable style={cs.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={cs.lockIcon}>🔒</Text>
          <Text style={cs.title}>{title}</Text>
          {subtitle && <Text style={cs.subtitle}>{subtitle}</Text>}

          <View style={cs.dotsRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[cs.dot, i < digits.length && cs.dotFilled]} />
            ))}
          </View>

          <View style={cs.keypad}>
            {['1','2','3','4','5','6','7','8','9'].map((n) => (
              <TouchableOpacity key={n} style={cs.key} onPress={() => setDigits((p) => p.length < 4 ? [...p, n] : p)} activeOpacity={0.7}>
                <Text style={cs.keyText}>{n}</Text>
              </TouchableOpacity>
            ))}
            <View style={cs.key} />
            <TouchableOpacity style={cs.key} onPress={() => setDigits((p) => p.length < 4 ? [...p, '0'] : p)} activeOpacity={0.7}>
              <Text style={cs.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cs.key} onPress={() => setDigits((p) => p.slice(0, -1))} activeOpacity={0.7}>
              <Text style={cs.keyText}>⌫</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
            <Text style={cs.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Flow state ───────────────────────────────────────────────────────────────

type FlowContext = 'parental' | Reader;
type FlowStep =
  | 'idle'
  | 'verify_current'   // verify existing PIN before changing/removing
  | 'enter_new'        // enter new PIN
  | 'confirm_new';     // re-enter new PIN to confirm

interface FlowState {
  step: FlowStep;
  action: 'set' | 'change' | 'remove';
  context: FlowContext;
  pendingHash: string | null; // hash of first entry, used in confirm step
}

const IDLE: FlowState = { step: 'idle', action: 'set', context: 'parental', pendingHash: null };

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ParentalControlsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, fetchProfile } = useAuthStore();
  const { unlockParent } = useParentalStore();
  const { readers, refresh: refreshReaders } = useReaders();

  const [saving, setSaving] = useState(false);
  const [flow, setFlow] = useState<FlowState>(IDLE);

  const hasParentalPin = !!profile?.parental_pin;

  const resetFlow = () => setFlow(IDLE);

  // ─── Parental PIN actions ─────────────────────────────────────────────────

  const startSetParentalPin = () =>
    setFlow({ step: 'enter_new', action: 'set', context: 'parental', pendingHash: null });

  const startChangeParentalPin = () =>
    setFlow({ step: 'verify_current', action: 'change', context: 'parental', pendingHash: null });

  const startRemoveParentalPin = () =>
    setFlow({ step: 'verify_current', action: 'remove', context: 'parental', pendingHash: null });

  // ─── Reader PIN actions ───────────────────────────────────────────────────

  const startSetReaderPin = (reader: Reader) =>
    setFlow({ step: 'enter_new', action: 'set', context: reader, pendingHash: null });

  const startChangeReaderPin = (reader: Reader) =>
    setFlow({ step: 'verify_current', action: 'change', context: reader, pendingHash: null });

  const confirmRemoveReaderPin = (reader: Reader) => {
    Alert.alert(
      t('parental.removeReaderPinTitle'),
      t('parental.removeReaderPinConfirm', { name: reader.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () =>
            setFlow({ step: 'verify_current', action: 'remove', context: reader, pendingHash: null }),
        },
      ]
    );
  };

  // ─── Persist helpers ──────────────────────────────────────────────────────

  const saveParentalPin = async (hash: string | null) => {
    if (!profile) return;
    setSaving(true);
    await supabase
      .from('user_profiles')
      .update({ parental_pin: hash })
      .eq('id', profile.id);
    await fetchProfile();
    if (hash) unlockParent();
    setSaving(false);
  };

  const saveReaderPin = async (reader: Reader, hash: string | null) => {
    setSaving(true);
    await supabase.from('readers').update({ pin: hash }).eq('id', reader.id);
    await refreshReaders();
    setSaving(false);
  };

  // ─── Flow callbacks ───────────────────────────────────────────────────────

  const isParentalContext = flow.context === 'parental';
  const currentHash = isParentalContext
    ? (profile?.parental_pin ?? null)
    : ((flow.context as Reader).pin ?? null);
  const contextName = isParentalContext
    ? t('parental.parentalPinSection')
    : (flow.context as Reader).name;

  const onCurrentVerified = () => {
    if (flow.action === 'remove') {
      // Confirmed — proceed with removal
      resetFlow();
      if (isParentalContext) {
        saveParentalPin(null);
      } else {
        saveReaderPin(flow.context as Reader, null);
      }
    } else {
      // change → go to enter_new
      setFlow((prev) => ({ ...prev, step: 'enter_new' }));
    }
  };

  const onNewPinCaptured = (hash: string) => {
    setFlow((prev) => ({ ...prev, step: 'confirm_new', pendingHash: hash }));
  };

  const onConfirmed = () => {
    // PinModal verified pendingHash === re-entry; save it
    const hash = flow.pendingHash!;
    resetFlow();
    if (isParentalContext) {
      saveParentalPin(hash);
    } else {
      saveReaderPin(flow.context as Reader, hash);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Modals ── */}

      {/* Verify current PIN */}
      <PinModal
        visible={flow.step === 'verify_current'}
        title={contextName}
        subtitle={
          flow.action === 'remove'
            ? t('parental.confirmCurrentToRemove')
            : t('parental.confirmCurrentToChange')
        }
        pinHash={currentHash ?? undefined}
        onSuccess={onCurrentVerified}
        onCancel={resetFlow}
      />

      {/* Enter new PIN (capture) */}
      <PinCaptureModal
        visible={flow.step === 'enter_new'}
        title={contextName}
        subtitle={t('parental.enterNewPin')}
        onCapture={onNewPinCaptured}
        onCancel={resetFlow}
      />

      {/* Confirm new PIN (verify against first entry) */}
      <PinModal
        visible={flow.step === 'confirm_new'}
        title={contextName}
        subtitle={t('parental.confirmNewPin')}
        pinHash={flow.pendingHash ?? undefined}
        onSuccess={onConfirmed}
        onCancel={resetFlow}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('parental.title')}</Text>
          <View style={{ width: 32 }} />
        </View>

        {saving && <ActivityIndicator color={Colors.primary} style={styles.saving} />}

        {/* ── Parental PIN ── */}
        <Text style={styles.sectionLabel}>{t('parental.parentalPinSection')}</Text>
        <View style={styles.card}>
          {!hasParentalPin ? (
            <SettingsRow icon="🔐" label={t('parental.setParentalPin')} onPress={startSetParentalPin} />
          ) : (
            <>
              <SettingsRow icon="🔄" label={t('parental.changeParentalPin')} onPress={startChangeParentalPin} />
              <View style={styles.divider} />
              <SettingsRow icon="🗑️" label={t('parental.removeParentalPin')} onPress={startRemoveParentalPin} danger />
            </>
          )}
        </View>

        {/* ── Reader PINs ── */}
        <Text style={styles.sectionLabel}>{t('parental.readerPinsSection')}</Text>
        {readers.length === 0 ? (
          <Text style={styles.emptyText}>{t('parental.noReaders')}</Text>
        ) : (
          <View style={styles.card}>
            {readers.map((reader, i) => (
              <View key={reader.id}>
                <View style={styles.readerRow}>
                  <Text style={styles.readerName}>{reader.name}</Text>
                  <View style={styles.readerActions}>
                    {!reader.pin ? (
                      <TouchableOpacity onPress={() => startSetReaderPin(reader)} style={styles.pill} activeOpacity={0.75}>
                        <Text style={styles.pillText}>{t('parental.setPinBtn')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity onPress={() => startChangeReaderPin(reader)} style={styles.pill} activeOpacity={0.75}>
                          <Text style={styles.pillText}>{t('parental.changePinBtn')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmRemoveReaderPin(reader)} style={[styles.pill, styles.pillDanger]} activeOpacity={0.75}>
                          <Text style={[styles.pillText, styles.pillDangerText]}>✕</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
                {i < readers.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  );
}

// Shared styles for PinCaptureModal
const cs = StyleSheet.create({
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
  lockIcon: { fontSize: 36, marginBottom: Spacing.sm },
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
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.secondary,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: Colors.secondary },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 68 * 3 + Spacing.sm * 2,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  key: {
    width: 68,
    height: 68,
    borderRadius: 34,
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  backText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xl,
    color: Colors.secondary,
  },
  screenTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
  },
  saving: { marginBottom: Spacing.md },
  sectionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowIcon: { fontSize: 20, marginRight: Spacing.md },
  rowLabel: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  rowChevron: {
    fontSize: FontSizes.xl,
    color: Colors.textDisabled,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.lg,
  },
  dangerText: { color: Colors.error },
  readerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  readerName: {
    flex: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  readerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  pill: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  pillText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  pillDanger: { backgroundColor: '#FFEBEE' },
  pillDangerText: { color: Colors.error },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
