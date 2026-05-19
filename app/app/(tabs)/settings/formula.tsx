import { useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../../../src/lib/supabase';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useToastStore } from '../../../../src/stores/toastStore';
import { calculateLivrux, getDefaultFormula } from '../../../../src/lib/formula';
import { Button } from '../../../../src/components/ui/Button';
import { TextInput } from '../../../../src/components/ui/TextInput';
import { FloatingEmojis } from '../../../../src/components/FloatingEmojis';
import { FORMULA_PREVIEW_PAGES } from '../../../../src/constants/config';
import type { BonusRule } from '../../../../src/types';
import { BottomMenu, BOTTOM_MENU_HEIGHT } from '../../../../src/components/BottomMenu';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../../../src/constants/theme';
import { BackButton } from '../../../../src/components/BackButton';

export default function FormulaScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const swipeBack = Gesture.Pan()
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX > 80 && Math.abs(e.translationX) > Math.abs(e.translationY) * 2) {
        router.back();
      }
    });
  const { user, ownerId, formula, fetchFormula } = useAuthStore();

  const active = formula ?? getDefaultFormula();

  const existingMinPages = active.bonus_rules.find(r => r.type === 'min_pages');
  const existingForeignLang = active.bonus_rules.find(r => r.type === 'foreign_language');

  const [baseReward, setBaseReward] = useState(String(active.base_reward));
  const [perPageRate, setPerPageRate] = useState(String(active.per_page_rate));

  const [minPagesEnabled, setMinPagesEnabled] = useState(!!existingMinPages);
  const [minPagesThreshold, setMinPagesThreshold] = useState(String(existingMinPages?.threshold ?? 100));
  const [minPagesBonus, setMinPagesBonus] = useState(String(existingMinPages?.bonus_amount ?? 5));

  const [foreignLangEnabled, setForeignLangEnabled] = useState(!!existingForeignLang);
  const [foreignLangBonus, setForeignLangBonus] = useState(String(existingForeignLang?.bonus_amount ?? 5));

  const [isSaving, setIsSaving] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const previewBonusRules: BonusRule[] = minPagesEnabled
    ? [{ type: 'min_pages', threshold: Number(minPagesThreshold) || 0, bonus_amount: Number(minPagesBonus) || 0, label: '' }]
    : [];

  const previewCoins = calculateLivrux(FORMULA_PREVIEW_PAGES, {
    base_reward: Number(baseReward) || 0,
    per_page_rate: Number(perPageRate) || 0,
    bonus_rules: previewBonusRules,
  });

  const handleSave = async () => {
    if (!user) return;
    const base = Number(baseReward);
    const rate = Number(perPageRate);

    if (isNaN(base) || base < 0 || isNaN(rate) || rate < 0) {
      showToast({ type: 'error', title: t('common.error') });
      return;
    }

    const bonusRules: BonusRule[] = [];

    if (minPagesEnabled) {
      const threshold = Number(minPagesThreshold);
      const bonus = Number(minPagesBonus);
      if (isNaN(threshold) || threshold <= 0 || isNaN(bonus) || bonus < 0) {
        showToast({ type: 'error', title: t('common.error') });
        return;
      }
      bonusRules.push({
        type: 'min_pages',
        threshold,
        bonus_amount: bonus,
        label: t('settings.minPagesBonus'),
      });
    }

    if (foreignLangEnabled) {
      const bonus = Number(foreignLangBonus);
      if (isNaN(bonus) || bonus < 0) {
        showToast({ type: 'error', title: t('common.error') });
        return;
      }
      bonusRules.push({
        type: 'foreign_language',
        bonus_amount: bonus,
        label: t('settings.foreignLanguageBonus'),
      });
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('reward_formulas')
      .update({
        base_reward: base,
        per_page_rate: rate,
        bonus_rules: bonusRules,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', ownerId ?? user!.id);

    setIsSaving(false);

    if (error) {
      showToast({ type: 'error', title: t('common.error'), message: error.message });
    } else {
      await fetchFormula();
      router.back();
    }
  };

  return (
    <GestureDetector gesture={swipeBack}>
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <BackButton />
          <Text style={styles.screenTitle}>{t('settings.formulaTitle')}</Text>

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

          <Text style={styles.sectionTitle}>{t('settings.bonusRules')}</Text>

          <View style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <Text style={styles.ruleTitle}>{t('settings.minPagesBonus')}</Text>
              <Switch
                value={minPagesEnabled}
                onValueChange={setMinPagesEnabled}
                trackColor={{ true: Colors.secondary }}
                thumbColor={Colors.textOnPrimary}
              />
            </View>
            {minPagesEnabled && (
              <View style={styles.ruleInputs}>
                <View style={styles.ruleInputHalf}>
                  <TextInput
                    label={t('settings.pageThreshold')}
                    value={minPagesThreshold}
                    onChangeText={setMinPagesThreshold}
                    keyboardType="number-pad"
                    placeholder="100"
                  />
                </View>
                <View style={styles.ruleInputHalf}>
                  <TextInput
                    label={t('settings.bonusAmount')}
                    value={minPagesBonus}
                    onChangeText={setMinPagesBonus}
                    keyboardType="decimal-pad"
                    placeholder="5"
                  />
                </View>
              </View>
            )}
          </View>

          <View style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <Text style={styles.ruleTitle}>{t('settings.foreignLanguageBonus')}</Text>
              <Switch
                value={foreignLangEnabled}
                onValueChange={setForeignLangEnabled}
                trackColor={{ true: Colors.secondary }}
                thumbColor={Colors.textOnPrimary}
              />
            </View>
            {foreignLangEnabled && (
              <View style={styles.ruleInputs}>
                <View style={styles.ruleInputFull}>
                  <TextInput
                    label={t('settings.bonusAmount')}
                    value={foreignLangBonus}
                    onChangeText={setForeignLangBonus}
                    keyboardType="decimal-pad"
                    placeholder="5"
                  />
                </View>
              </View>
            )}
          </View>

          <LinearGradient
            colors={['#F5A623', '#FF7F3E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewCard}
          >
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
          </LinearGradient>

          <Button
            label={t('common.save')}
            onPress={handleSave}
            loading={isSaving}
            fullWidth
            style={styles.saveButton}
          />
        </ScrollView>
        <BottomMenu />
      </SafeAreaView>
    </View>
    </GestureDetector>
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
  screenTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  ruleCard: {
    backgroundColor: 'transparent',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ruleTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    flex: 1,
    paddingRight: Spacing.sm,
  },
  ruleInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  ruleInputHalf: { flex: 1 },
  ruleInputFull: { flex: 1 },
  previewCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
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
