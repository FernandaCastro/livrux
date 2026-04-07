import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBooks } from '../../../src/hooks/useBooks';
import { useReaderStore } from '../../../src/stores/readerStore';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';

export default function BookDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedReader, updateBalance } = useReaderStore();
  const { books, isLoading, deleteBook } = useBooks(selectedReader?.id ?? null);

  const handleBack = () => {
    router.back();
  };

  const book = books.find((b) => b.id === id);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      t('book.deleteBook'),
      t('book.deleteConfirm', { title: book.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteBook(book.id);
            // Revert the balance optimistically.
            if (selectedReader) {
              updateBalance(selectedReader.livrux_balance - book.livrux_earned);
            }
            handleBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Text style={styles.deleteText}>{t('book.deleteBook')}</Text>
          </TouchableOpacity>
        </View>

        {/* Cover */}
        <View style={styles.coverContainer}>
          {book.cover_url ? (
            <Image source={{ uri: book.cover_url }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverIcon}>📕</Text>
            </View>
          )}
        </View>

        {/* Title & author */}
        <Text style={styles.title}>{book.title}</Text>
        {book.author && <Text style={styles.author}>{book.author}</Text>}

        {/* Details row: pages + date */}
        <View style={[styles.detailsRow, !book.is_foreign_language && styles.detailsRowLast]}>
          <View style={styles.detailChip}>
            <Text style={styles.detailIcon}>📄</Text>
            <Text style={styles.detailText}>{book.total_pages} p.</Text>
          </View>
          <View style={styles.detailChip}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>
              {format(new Date(book.date_completed), 'dd/MM/yyyy')}
            </Text>
          </View>
        </View>

        {/* Foreign language row — second line, only when applicable */}
        {book.is_foreign_language && (
          <View style={styles.detailsForeignRow}>
            <View style={styles.detailChip}>
              <Text style={styles.detailIcon}>🌍</Text>
              <Text style={styles.detailText}>{t('book.foreignLanguage')}</Text>
            </View>
          </View>
        )}

        {/* Livrux earned card */}
        <View style={styles.earnedCard}>
          <Text style={styles.earnedLabel}>{t('book.willEarn')}</Text>
          <View style={styles.earnedRow}>
            <Text style={styles.earnedCoin}>🪙</Text>
            <Text style={styles.earnedAmount}>{book.livrux_earned.toFixed(2)}</Text>
            <Text style={styles.earnedCurrency}>Livrux</Text>
          </View>
        </View>

        {/* Notes */}
        {book.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>📝</Text>
            <Text style={styles.notesText}>{book.notes}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: Spacing.lg,
  },
  backText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xl,
    color: Colors.secondary,
  },
  backButton: { paddingVertical: Spacing.lg },
  deleteText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  coverContainer: { marginBottom: Spacing.xl },
  cover: {
    width: 140,
    height: 210,
    borderRadius: Radius.md,
    ...Shadows.lg,
  },
  coverPlaceholder: {
    width: 140,
    height: 210,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  coverIcon: { fontSize: 56 },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  author: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  detailsRowLast: {
    marginBottom: Spacing.xl,
  },
  detailsForeignRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 6,
  },
  detailIcon: { fontSize: 14 },
  detailText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  earnedCard: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
    marginBottom: Spacing.lg,
  },
  earnedLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  earnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  earnedCoin: { fontSize: 28 },
  earnedAmount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    color: Colors.textOnPrimary,
  },
  earnedCurrency: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  notesCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  notesLabel: { fontSize: 18 },
  notesText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
});
