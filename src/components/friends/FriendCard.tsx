import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MultiavatarView } from '../reader/MultiavatarView';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../constants/theme';

interface FriendCardProps {
  name: string;
  avatarSeed: string | null;
  bookCount: number;
  xp?: number;
  onPress?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}

export function FriendCard({ name, avatarSeed, bookCount, xp, onPress, onAccept, onReject }: FriendCardProps) {
  const { t } = useTranslation();
  const isPending = !!onAccept && !!onReject;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={styles.card}
    >
      {/* Accent strip — gold for friends, coral for pending */}
      <View style={[styles.accentStrip, isPending && styles.accentStripPending]} />

      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <MultiavatarView
          seed={avatarSeed}
          size={AVATAR_SIZE}
          borderColor={Colors.friendEmeraldLight}
          borderWidth={3}
        />
      </View>

      {/* Info */}
      <View style={styles.info}>
        {isPending && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>✨ {t('friends.newRequest')}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.statsRow}>
          <View style={styles.bookBadge}>
            <Text style={styles.bookIcon}>📚</Text>
            <Text style={styles.bookCount}>{bookCount} {t('friends.booksRead')}</Text>
          </View>
          {xp !== undefined && xp > 0 && (
            <View style={styles.xpBadge}>
              <Text style={styles.xpIcon}>⭐</Text>
              <Text style={styles.xpCount}>{xp} XP</Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions or chevron */}
      {isPending ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.75}>
            <Text style={styles.acceptText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.75}>
            <Text style={styles.rejectText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : onPress ? (
        <View style={styles.chevronWrapper}>
          <Text style={styles.chevron}>›</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const AVATAR_SIZE = 60;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.md,
  },
  accentStrip: {
    width: 5,
    alignSelf: 'stretch',
    backgroundColor: Colors.friendEmerald,
  },
  accentStripPending: {
    backgroundColor: Colors.friendEmeraldLight,
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
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: Spacing.xs,
  },
  newBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xs,
    color: Colors.accent,
  },
  name: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
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
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  bookIcon: { fontSize: 13 },
  bookCount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  xpIcon: { fontSize: 11 },
  xpCount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: '#F59E0B',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.md,
  },
  acceptBtn: {
    backgroundColor: Colors.success,
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
    color: Colors.textOnPrimary,
  },
  rejectBtn: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  chevronWrapper: {
    paddingRight: Spacing.md,
  },
  chevron: {
    fontSize: FontSizes['2xl'],
    color: Colors.secondary,
  },
});
