import type { BonusRule, RewardFormula } from '../types';
import { DEFAULT_FORMULA } from '../constants/config';

// Pure function: calculates how many Livrux coins a reader earns for finishing a book.
// Formula: coins = base_reward + (pages * per_page_rate) + applicable bonuses
export function calculateLivrux(
  pages: number,
  formula: Pick<RewardFormula, 'base_reward' | 'per_page_rate' | 'bonus_rules'>
): number {
  let coins = formula.base_reward + pages * formula.per_page_rate;

  for (const rule of formula.bonus_rules) {
    if (rule.type === 'min_pages' && pages >= rule.threshold) {
      coins += rule.bonus_amount;
    }
  }

  // Round to 2 decimal places to avoid floating-point noise.
  return Math.round(coins * 100) / 100;
}

// Returns a default formula object when the user has none stored yet.
export function getDefaultFormula(): Pick<
  RewardFormula,
  'base_reward' | 'per_page_rate' | 'bonus_rules'
> {
  return { ...DEFAULT_FORMULA, bonus_rules: [] as BonusRule[] };
}
