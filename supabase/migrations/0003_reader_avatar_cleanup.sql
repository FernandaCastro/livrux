-- =============================================================================
-- Livrux — Auto-delete reader avatar from Storage on reader deletion
-- =============================================================================
-- When a reader row is deleted, this trigger removes the corresponding avatar
-- file from the "avatars" storage bucket.  The path convention used by the app
-- is:  avatars/{user_id}/{reader_id}.jpg
-- Doing this at the database level guarantees cleanup even if the client-side
-- deleteImage() call fails or is skipped.
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_reader_avatar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND name = OLD.user_id || '/' || OLD.id || '.jpg';
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_reader_deleted
  AFTER DELETE ON public.readers
  FOR EACH ROW
  EXECUTE FUNCTION delete_reader_avatar();
