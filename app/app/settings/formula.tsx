import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/stores/authStore';
import { calculateLivrux, getDefaultFormula } from '../../../src/lib/formula';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { FORMULA_PREVIEW_PAGES } from '../../../src/constants/config';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../src/constants/theme';

export default function FormulaScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, formula, fetchFormula } = useAuthStore();

  const active = formula ?? getDefaultFormula();

  const [baseReward, setBaseReward] = useState(String(active.base_reward));
  const [perPageRate, setPerPageRate] = useState(String(active.per_page_rate));
  const [isSaving, setIsSaving] = useState(false);

  // Recompute live preview whenever the inputs change.
  const previewCoins = calculateLivrux(FORMULA_PREVIEW_PAGES, {
    base_reward: Number(baseReward) || 0,
    per_page_rate: Number(perPageRate) || 0,
    bonus_rules: [],
  });

  const handleSave = async () => {
    if (!user) return;
    const base = Number(baseReward);
    const rate = Number(perPageRate);

    if (isNaN(base) || base < 0 || isNaN(rate) || rate < 0) {
      Alert.alert(t('common.error'), t('common.error'));
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('reward_formulas')
      .update({
        base_reward: base,
        per_page_rate: rate,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    setIsSaving(false);

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      await fetchFormula();
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('settings.formulaTitle')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Inputs */}
        <TextInput
          label={t('settings.baseReward')}
          value={baseReward}
          onChangeText={setBaseReward}
          keyboardType="decimal-pad"
          placeholder="5"
        />
        <TextInput
          label={t('settings.perPageRate')}
          value={perPageRate}
          onChangeText={setPerPageRate}
          keyboardType="decimal-pad"
          placeholder="0.1"
        />

        {/* Live preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewText}>
            {t('settings.preview', {
              pages: FORMULA_PREVIEW_PAGES,
              coins: previewCoins,
            })}
          </Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewCoin}>🪙</Text>
            <Text style={styles.previewAmount}>{previewCoins}</Text>
            <Text style={styles.previewCurrency}>Livrux</Text>
          </View>
        </View>

        <Button
          label={t('common.save')}
          onPress={handleSave}
          loading={isSaving}
          fullWidth
          style={styles.saveButton}
        />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  backText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xl,
    color: Colors.secondary,
  },
  screenTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
  },
  previewCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  previewText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewCoin: { fontSize: 28 },
  previewAmount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['3xl'],
    color: Colors.textOnPrimary,
  },
  previewCurrency: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  saveButton: { marginTop: Spacing.sm },
});
