-- =============================================================================
-- Livrux — Storage DELETE (and UPDATE) policies for avatars and book-covers
-- =============================================================================
-- Without a DELETE policy, Supabase silently blocks avatar removal when a
-- reader is deleted. Without an UPDATE policy, upsert on re-upload also fails.
-- Users may only delete/update files inside their own folder ({user_id}/*).
-- =============================================================================

CREATE POLICY "Owner can delete avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owner can update avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owner can delete book cover"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'book-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owner can update book cover"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'book-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
