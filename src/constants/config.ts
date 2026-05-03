// App-wide configuration constants.

export const DEFAULT_FORMULA = {
  base_reward: 5,
  per_page_rate: 0.1,
  bonus_rules: [],
} as const;

// Example page count used in the formula settings preview.
export const FORMULA_PREVIEW_PAGES = 200;

// Books with fewer pages than SHORT_BOOK_MAX count toward the daily streak
// via their completion date. Books at or above this threshold require
// reading sessions to generate streak days.
export const STREAK_THRESHOLDS = {
  SHORT_BOOK_MAX: 100,
} as const;

