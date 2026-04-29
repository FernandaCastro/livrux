-- Replace avatar_url (Supabase Storage) with Multiavatar seed columns.
-- avatar_seed: the active seed used to render the avatar.
-- old_avatar_seed: the previous seed, kept for audit / undo reference.

ALTER TABLE public.readers
  DROP COLUMN IF EXISTS avatar_url,
  ADD COLUMN avatar_seed     TEXT,
  ADD COLUMN old_avatar_seed TEXT;

-- Remove Supabase Storage avatars bucket and all associated RLS policies.
DROP POLICY IF EXISTS "Owner can upload avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars"  ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Owner can update avatar"  ON storage.objects;

DELETE FROM storage.objects WHERE bucket_id = 'avatars';
DELETE FROM storage.buckets WHERE id = 'avatars';
