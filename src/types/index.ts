// Shared TypeScript interfaces mirroring the Supabase database schema.

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface RewardFormula {
  id: string;
  user_id: string;
  base_reward: number;
  per_page_rate: number;
  bonus_rules: BonusRule[];
  created_at: string;
  updated_at: string;
}

export interface BonusRule {
  type: 'min_pages' | 'foreign_language';
  threshold?: number; // only used by min_pages
  bonus_amount: number;
  label: string;
}

export interface Reader {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  livrux_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  reader_id: string;
  user_id: string;
  title: string;
  author: string | null;
  total_pages: number;
  cover_url: string | null;
  livrux_earned: number;
  date_completed: string;
  notes: string | null;
  is_foreign_language: boolean;
  created_at: string;
}

export interface LivruxTransaction {
  id: string;
  reader_id: string;
  user_id: string;
  book_id: string | null;
  amount: number;
  reason: string | null;
  description: string | null;
  created_at: string;
}
