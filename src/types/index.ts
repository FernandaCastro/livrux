// Shared TypeScript interfaces mirroring the Supabase database schema.

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  parental_pin: string | null; // SHA-256 hash; null = no parental lock
  parental_unlock_duration: number; // minutes; 0 = session-long
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
  avatar_seed: string | null;
  old_avatar_seed: string | null;
  pin: string | null; // SHA-256 hash; null = no PIN required for this reader
  livrux_balance: number;
  xp: number;
  friend_code: string | null;
  friends_autonomy: boolean;
  created_at: string;
  updated_at: string;
  book_count?: number;
  badge_count?: number;
}

export interface ReaderFriendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface FriendData {
  friendshipId: string;
  reader: {
    id: string;
    name: string;
    avatar_seed: string | null;
    book_count: number;
    xp: number;
  };
}

export interface FriendRequest {
  friendshipId: string;
  reader: {
    id: string;
    name: string;
    avatar_seed: string | null;
    book_count: number;
    xp: number;
  };
}

export interface FriendSearchResult {
  id: string;
  name: string;
  avatar_seed: string | null;
  book_count: number;
  xp: number;
}

export type BookStatus = 'reading' | 'completed';

export interface Book {
  id: string;
  reader_id: string;
  user_id: string;
  title: string;
  author: string | null;
  total_pages: number;
  cover_url: string | null;
  livrux_earned: number;
  status: BookStatus;
  date_start: string;
  date_completed: string | null; // null while status = 'reading'
  notes: string | null;
  is_foreign_language: boolean;
  rating: 'disliked' | 'liked' | 'loved' | null;
  review: string | null;
  created_at: string;
}

export interface ReadingSession {
  id: string;
  reader_id: string;
  book_id: string;
  user_id: string;
  session_date: string;
  last_page: number;
  created_at: string;
}

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export type BadgeSlug =
  | 'first_book'
  | 'bookworm_5'
  | 'bookworm_25'
  | 'centurion'
  | 'page_hunter_500'
  | 'page_hunter_5000'
  | 'polyglot'
  | 'streak_7'
  | 'streak_30'
  | 'book_club';

export interface Badge {
  slug: BadgeSlug;
  name_key: string;
  description_key: string;
  icon: string;
  tier: BadgeTier;
}

export interface ReaderBadge {
  id: string;
  reader_id: string;
  user_id: string;
  badge_slug: BadgeSlug;
  earned_at: string;
  bonus_xp: number;
}

export interface XpTransaction {
  id: string;
  reader_id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

export interface StreakInfo {
  current_streak: number;
  best_streak: number;
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
