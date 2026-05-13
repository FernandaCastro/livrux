import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MultiavatarView } from '../reader/MultiavatarView';
import { Fonts, FontSizes, Spacing, Radius, Shadows, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

interface FriendCardProps {
  name: string;
  avatarSeed: string | null;
  bookCount: number;
  xp?: number;
  pendingSent?: boolean;
  onPress?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}

const AVATAR_SIZE = 60;

function createStyles(theme: ColorPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      marginBottom: Spacing.sm,
      overflow: 'hidden',
      ...Shadows.md,
    },
    accentStrip: {
      width: 5,
      alignSelf: 'stretch',
      backgroundColor: theme.chipFriend,
    },
    accentStripPending: {
      backgroundColor: theme.friendEmeraldLight,
    },
    avatarWrapper: {
      marginVertical: Spacing.md,
      marginHorizontal: Spacing.md,
    },
    info: {
      flex: 1,
      paddingVertical: Spacing.md,
    },
    newBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.accentLight,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      marginBottom: Spacing.xs,
    },
    newBadgeText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.xs,
      color: theme.accent,
    },
    sentBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#FEF3C7',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      marginBottom: Spacing.xs,
    },
    sentBadgeText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.xs,
      color: '#92400E',
    },
    name: {
      fontFamily: Fonts.heading,
      fontSize: FontSizes.lg,
      color: theme.textPrimary,
      marginBottom: Spacing.xs,
    },
    statsRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      flexWrap: 'wrap',
    },
    bookBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: '#38BDF8',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 0,
    },
    bookIcon: { width: 25, height: 25, resizeMode: 'contain' },
    bookCount: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.xs,
      color: theme.textOnPrimary,
    },
    xpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: '#FCD34D',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
    },
    xpIcon: { fontSize: 13 },
    xpCount: {
      marginTop: 1,
      fontFamily: Fonts.bodySemiBold,
      fontSize: FontSizes.xs,
      color: '#78350F',
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.xs,
      paddingRight: Spacing.md,
    },
    acceptBtn: {
      backgroundColor: theme.success,
      borderRadius: Radius.full,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.sm,
    },
    acceptText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.lg,
      color: theme.textOnPrimary,
    },
    rejectBtn: {
      backgroundColor: theme.surfaceVariant,
      borderRadius: Radius.full,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rejectText: {
      fontFamily: Fonts.bodyBold,
      fontSize: FontSizes.md,
      color: theme.textSecondary,
    },
    chevronWrapper: {
      paddingRight: Spacing.md,
    },
    chevron: {
      fontSize: FontSizes['2xl'],
      color: theme.secondary,
    },
  });
}

export function FriendCard({ name, avatarSeed, bookCount, xp, pendingSent, onPress, onAccept, onReject }: FriendCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isPending = !!onAccept && !!onReject;
  const canUnfriend = !isPending && !!onReject;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={styles.card}
    >
      <View style={[styles.accentStrip, isPending && styles.accentStripPending]} />

      <View style={styles.avatarWrapper}>
        <MultiavatarView
          seed={avatarSeed}
          size={AVATAR_SIZE}
          borderColor={theme.friendEmeraldLight}
          borderWidth={3}
        />
      </View>

      <View style={styles.info}>
        {isPending && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>✨ {t('friends.newRequest')}</Text>
          </View>
        )}
        {pendingSent && (
          <View style={styles.sentBadge}>
            <Text style={styles.sentBadgeText}>⏳ {t('friends.awaitingResponse')}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.statsRow}>
          {xp !== undefined && xp > 0 && (
            <View style={styles.xpBadge}>
              <Text style={styles.xpIcon}>⭐</Text>
              <Text style={styles.xpCount}>{xp} XP</Text>
            </View>
          )}
          <View style={styles.bookBadge}>
            <Image source={require('../../../assets/livrux-clean.png')} style={styles.bookIcon} />
            <Text style={styles.bookCount}>{bookCount} {t('friends.booksRead')}</Text>
          </View>
        </View>
      </View>

      {isPending ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.75}>
            <Text style={styles.acceptText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.75}>
            <Text style={styles.rejectText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actions}>
          {onPress && (
            <View style={styles.chevronWrapper}>
              <Text style={styles.chevron}>›</Text>
            </View>
          )}
          {canUnfriend && (
            <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.75}>
              <Text style={styles.rejectText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
