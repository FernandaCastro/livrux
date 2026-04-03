// App-wide configuration constants.

export const DEFAULT_FORMULA = {
  base_reward: 5,
  per_page_rate: 0.1,
  bonus_rules: [],
} as const;

// Example page count used in the formula settings preview.
export const FORMULA_PREVIEW_PAGES = 200;

// Maximum image dimensions before upload (keeps storage costs low).
export const IMAGE_MAX_WIDTH = 800;
export const IMAGE_MAX_HEIGHT = 800;
export const IMAGE_QUALITY = 0.8;

// Avatar image is always square.
export const AVATAR_SIZE = 400;
