import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { spendLivruxRpc } from '../../src/hooks/useLivrux';
import { useReaderStore } from '../../src/stores/readerStore';
import { useToastStore } from '../../src/stores/toastStore';
import { Button } from '../../src/components/ui/Button';
import { TextInput } from '../../src/components/ui/TextInput';
import { FloatingEmojis } from '../../src/components/FloatingEmojis';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/constants/theme';

function useSpendSchema(maxBalance: number) {
  const { t } = useTranslation();
  return z.object({
    amount: z
      .string()
      .min(1, t('spend.errors.amountRequired'))
      .refine((v) => Number(v) > 0, t('spend.errors.amountInvalid'))
      .refine((v) => Number(v) <= maxBalance, t('spend.errors.amountExceedsBalance')),
    description: z.string().min(1, t('spend.errors.descriptionRequired')),
  });
}

type FormData = { amount: string; description: string };

export default function SpendScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { readerId } = useLocalSearchParams<{ readerId: string }>();
  const { selectedReader, updateBalance } = useReaderStore();
  const showToast = useToastStore((s) => s.show);

  const balance = selectedReader?.livrux_balance ?? 0;
  const schema = useSpendSchema(balance);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', description: '' },
  });

  const onSubmit = async (data: FormData) => {
    const targetReaderId = readerId ?? selectedReader?.id;
    if (!targetReaderId) return;

    try {
      const amount = Number(data.amount);
      await spendLivruxRpc({
        readerId: targetReaderId,
        amount,
        description: data.description.trim(),
      });
      updateBalance(-amount);
      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.error');
      showToast({ type: 'error', title: t('common.error'), message });
    }
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{t('spend.title')}</Text>

          <LinearGradient
            colors={['#F5A623', '#FF7F3E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceLabel}>{t('spend.availableBalance')}</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceCoin}>🪙</Text>
              <Text style={styles.balanceAmount}>{balance.toFixed(2)}</Text>
              <Text style={styles.balanceCurrency}>Livrux</Text>
            </View>
          </LinearGradient>

          <View style={styles.form}>
            <Controller
              control={control}
              name="amount"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  label={t('spend.amount')}
                  placeholder={t('spend.amountPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  error={errors.amount?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  label={t('spend.description')}
                  placeholder={t('spend.descriptionPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.description?.message}
                />
              )}
            />
          </View>

          <Button
            label={t('spend.submit')}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
          <Button
            label={t('common.cancel')}
            onPress={() => router.back()}
            variant="ghost"
          />
        </ScrollView>
        <BottomMenu />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: BOTTOM_MENU_HEIGHT + Spacing['2xl'],
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  balanceCard: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  balanceLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  balanceCoin: { fontSize: 28 },
  balanceAmount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    color: Colors.textOnPrimary,
  },
  balanceCurrency: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  form: {
    marginBottom: Spacing.lg,
  },
});
