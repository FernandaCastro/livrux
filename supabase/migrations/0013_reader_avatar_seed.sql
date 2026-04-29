-- Replace avatar_url (Supabase Storage) with Multiavatar seed columns.
-- avatar_seed: the active seed used to render the avatar.
-- old_avatar_seed: the previous seed, kept for audit / undo reference.

ALTER TABLE public.readers
  DROP COLUMN IF EXISTS avatar_url,
  ADD COLUMN avatar_seed     TEXT,
  ADD COLUMN old_avatar_seed TEXT;
