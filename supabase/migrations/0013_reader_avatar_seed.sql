-- Replace avatar_url (Supabase Storage) with Multiavatar seed columns.
-- avatar_seed: the active seed used to render the avatar.
-- old_avatar_seed: the previous seed, kept for audit / undo reference.

ALTER TABLE public.readers
  DROP COLUMN IF EXISTS avatar_url,
  ADD COLUMN avatar_seed     TEXT,
  ADD COLUMN old_avatar_seed TEXT;

-- Drop RLS policies for the avatars Storage bucket.
DROP POLICY IF EXISTS "Owner can upload avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars"  ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Owner can update avatar"  ON storage.objects;

-- NOTE: Supabase blocks direct SQL deletion from storage tables (protect_delete trigger).
-- Delete the avatars bucket and its objects via the Supabase Dashboard:
--   Storage → avatars → Delete bucket
-- Or via the CLI:
--   supabase storage rm --recursive 'avatars/**'
--   (then delete the empty bucket through the Dashboard)
