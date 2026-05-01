import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MultiavatarView } from '../reader/MultiavatarView';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../constants/theme';

interface FriendCardProps {
  name: string;
  avatarSeed: string | null;
  bookCount: number;
  onPress?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}

export function FriendCard({ name, avatarSeed, bookCount, onPress, onAccept, onReject }: FriendCardProps) {
  const { t } = useTranslation();
  const isPending = !!onAccept && !!onReject;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={styles.card}
    >
      <MultiavatarView seed={avatarSeed} size={AVATAR_SIZE} borderColor={Colors.primaryLight} borderWidth={2} />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.bookBadge}>
          <Text style={styles.bookIcon}>📚</Text>
          <Text style={styles.bookCount}>{bookCount} {t('friends.booksRead')}</Text>
        </View>
      </View>

      {isPending && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.75}>
            <Text style={styles.acceptText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.75}>
            <Text style={styles.rejectText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isPending && onPress && (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

const AVATAR_SIZE = 52;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  bookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookIcon: { fontSize: 13 },
  bookCount: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  acceptBtn: {
    backgroundColor: Colors.success,
    borderRadius: Radius.full,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary,
  },
  rejectBtn: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  chevron: {
    fontSize: FontSizes.xl,
    color: Colors.textDisabled,
  },
});
