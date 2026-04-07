-- Parental controls: PIN protection for settings (parental PIN) and individual reader profiles (reader PIN).
-- PINs are stored as SHA-256 hashes computed client-side.

-- Parental PIN and unlock duration stored on the user's own profile.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS parental_pin TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parental_unlock_duration INTEGER NOT NULL DEFAULT 5;

-- Per-reader PIN so each child can protect their own profile.
ALTER TABLE readers
  ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT NULL;
