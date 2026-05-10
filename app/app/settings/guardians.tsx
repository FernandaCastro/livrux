import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useToastStore } from '../../../src/stores/toastStore';
import { useDialogStore } from '../../../src/stores/dialogStore';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '../../../src/stores/authStore';
import { useGuardians } from '../../../src/hooks/useGuardians';
import { FloatingEmojis } from '../../../src/components/FloatingEmojis';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';
import type { CoGuardian, GuardianInvitation } from '../../../src/types';

// ── Invite modal ──────────────────────────────────────────────────────────────

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (email: string) => Promise<void>;
  isSending: boolean;
}

function InviteModal({ visible, onClose, onSend, isSending }: InviteModalProps) {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.show);
  const [email, setEmail] = useState('');

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast({ type: 'warning', title: t('guardians.invalidEmail') });
      return;
    }
    try {
      await onSend(trimmed);
      setEmail('');
      onClose();
      showToast({ type: 'success', title: t('guardians.inviteSentTitle'), message: t('guardians.inviteSentBody', { email: trimmed }) });
    } catch (err) {
      showToast({ type: 'error', title: t('common.error'), message: (err as Error).message });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetIcon}>✉️</Text>
            <Text style={styles.sheetTitle}>{t('guardians.inviteTitle')}</Text>
            <Text style={styles.sheetSubtitle}>{t('guardians.inviteSubtitle')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={Colors.textDisabled}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryBtn, isSending && styles.btnDisabled]}
              onPress={handleSend}
              disabled={isSending}
              activeOpacity={0.8}
            >
              {isSending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>{t('guardians.sendInvite')}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── Accept invitation modal ───────────────────────────────────────────────────

interface AcceptModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: (token: string) => Promise<void>;
  isAccepting: boolean;
}

function AcceptModal({ visible, onClose, onAccept, isAccepting }: AcceptModalProps) {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.show);
  const [token, setToken] = useState('');

  const handleAccept = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      showToast({ type: 'warning', title: t('guardians.tokenRequired') });
      return;
    }
    try {
      await onAccept(trimmed);
      setToken('');
      onClose();
      showToast({ type: 'success', title: t('guardians.acceptedTitle'), message: t('guardians.acceptedBody') });
    } catch (err) {
      showToast({ type: 'error', title: t('common.error'), message: (err as Error).message });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetIcon}>🔗</Text>
            <Text style={styles.sheetTitle}>{t('guardians.acceptTitle')}</Text>
            <Text style={styles.sheetSubtitle}>{t('guardians.acceptSubtitle')}</Text>
            <TextInput
              style={[styles.input, styles.tokenInput]}
              value={token}
              onChangeText={(v) => setToken(v.toUpperCase())}
              placeholder={t('guardians.tokenPlaceholder')}
              placeholderTextColor={Colors.textDisabled}
              autoCapitalize="characters"
              autoFocus
              maxLength={36}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, isAccepting && styles.btnDisabled]}
              onPress={handleAccept}
              disabled={isAccepting}
              activeOpacity={0.8}
            >
              {isAccepting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>{t('guardians.acceptBtn')}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function GuardiansScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const showToast = useToastStore((s) => s.show);
  const showDialog = useDialogStore((s) => s.show);
  const {
    coGuardians,
    invitations,
    isLoading,
    isCoGuardian,
    sendInvitation,
    cancelInvitation,
    acceptInvitation,
    removeCoGuardian,
    leaveFamily,
    refresh,
    isSending,
    isAccepting,
    isLeaving,
  } = useGuardians();

  const [inviteVisible, setInviteVisible] = useState(false);
  const [acceptVisible, setAcceptVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleRemove = (g: CoGuardian) => {
    const name = g.display_name ?? g.email ?? t('guardians.thisGuardian');
    showDialog({
      title: t('guardians.removeTitle'),
      message: t('guardians.removeConfirm', { name }),
      confirmLabel: t('common.delete'),
      danger: true,
      onConfirm: () => removeCoGuardian(g.guardian_id),
    });
  };

  const handleLeave = () => {
    showDialog({
      title: t('guardians.leaveTitle'),
      message: t('guardians.leaveConfirm'),
      confirmLabel: t('guardians.leaveBtn'),
      danger: true,
      onConfirm: async () => {
        try {
          await leaveFamily();
          router.replace('/app/settings');
        } catch (err) {
          showToast({ type: 'error', title: t('common.error'), message: (err as Error).message });
        }
      },
    });
  };

  const handleCancelInvitation = (inv: GuardianInvitation) => {
    showDialog({
      title: t('guardians.cancelInviteTitle'),
      message: t('guardians.cancelInviteConfirm', { email: inv.email }),
      confirmLabel: t('common.delete'),
      danger: true,
      onConfirm: () => cancelInvitation(inv.id),
    });
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#f0e6ff', '#fff7ed', '#fafaf7']}
        locations={[0, 0.6, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <FloatingEmojis />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backLabel}>{t('settings.title')}</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('guardians.title')}</Text>
          <Text style={styles.screenSubtitle}>{t('guardians.subtitle')}</Text>

          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Co-guardians list */}
              {coGuardians.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>{t('guardians.members')}</Text>
                  <View style={styles.card}>
                    {coGuardians.map((g, i) => (
                      <View key={g.guardian_id}>
                        <View style={styles.row}>
                          <Text style={styles.rowIcon}>👤</Text>
                          <View style={styles.rowContent}>
                            <Text style={styles.rowName}>
                              {g.display_name ?? t('guardians.unnamed')}
                            </Text>
                            {g.email && (
                              <Text style={styles.rowEmail}>{g.email}</Text>
                            )}
                          </View>
                          {/* Don't show remove for self if co-guardian */}
                          {!isCoGuardian && g.guardian_id !== user?.id && (
                            <TouchableOpacity onPress={() => handleRemove(g)} hitSlop={8}>
                              <Text style={styles.removeText}>{t('common.delete')}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {i < coGuardians.length - 1 && <View style={styles.divider} />}
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Pending invitations */}
              {invitations.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>{t('guardians.pendingInvitations')}</Text>
                  <View style={styles.card}>
                    {invitations.map((inv, i) => (
                      <View key={inv.id}>
                        <View style={styles.row}>
                          <Text style={styles.rowIcon}>📨</Text>
                          <View style={styles.rowContent}>
                            <Text style={styles.rowName}>{inv.email}</Text>
                            <Text style={styles.rowEmail}>{t('guardians.pendingStatus')}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleCancelInvitation(inv)} hitSlop={8}>
                            <Text style={styles.removeText}>{t('common.cancel')}</Text>
                          </TouchableOpacity>
                        </View>
                        {i < invitations.length - 1 && <View style={styles.divider} />}
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Invite button (everyone can invite) */}
              <TouchableOpacity
                style={styles.inviteBtn}
                onPress={() => setInviteVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.inviteBtnIcon}>✉️</Text>
                <Text style={styles.inviteBtnText}>{t('guardians.inviteBtn')}</Text>
              </TouchableOpacity>

              {/* Accept invitation (for users not yet linked) */}
              {!isCoGuardian && (
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => setAcceptVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.acceptBtnIcon}>🔗</Text>
                  <Text style={styles.acceptBtnText}>{t('guardians.haveInvite')}</Text>
                </TouchableOpacity>
              )}

              {/* Leave family (for co-guardians) */}
              {isCoGuardian && (
                <>
                  <View style={{ height: Spacing.lg }} />
                  <View style={styles.card}>
                    <TouchableOpacity
                      style={styles.row}
                      onPress={handleLeave}
                      disabled={isLeaving}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.rowIcon}>🚪</Text>
                      <Text style={[styles.rowLabel, styles.dangerText]}>{t('guardians.leaveBtn')}</Text>
                      {isLeaving
                        ? <ActivityIndicator size="small" color={Colors.error} />
                        : <Text style={styles.rowChevron}>›</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
        <BottomMenu />
      </SafeAreaView>

      <InviteModal
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        onSend={sendInvitation}
        isSending={isSending}
      />
      <AcceptModal
        visible={acceptVisible}
        onClose={() => setAcceptVisible(false)}
        onAccept={acceptInvitation}
        isAccepting={isAccepting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing['2xl'],
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  backChevron: {
    fontSize: 28,
    color: Colors.secondary,
    marginRight: 4,
    lineHeight: 32,
  },
  backLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.secondary,
  },
  screenTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.secondary,
    marginBottom: Spacing.xs,
  },
  screenSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  sectionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.75)',
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
  rowContent: { flex: 1 },
  rowName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  rowEmail: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
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
  removeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.lg + 20 + Spacing.md,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inviteBtnIcon: { fontSize: 20 },
  inviteBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: '#fff',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    ...Shadows.sm,
  },
  acceptBtnIcon: { fontSize: 18 },
  acceptBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.secondary,
  },
  dangerText: { color: Colors.error },
  // Modal styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 40,
  },
  sheetIcon: { fontSize: 40, marginBottom: Spacing.sm },
  sheetTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sheetSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  tokenInput: {
    letterSpacing: 4,
    textAlign: 'center',
    fontFamily: Fonts.bodyBold,
  },
  primaryBtn: {
    // width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: '#fff',
  },
  cancelBtn: { paddingVertical: Spacing.sm },
  cancelBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});
