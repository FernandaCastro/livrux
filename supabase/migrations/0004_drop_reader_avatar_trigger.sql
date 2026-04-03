-- =============================================================================
-- Livrux — Drop reader avatar cleanup trigger
-- =============================================================================
-- The trigger created in 0003 attempted to delete directly from storage.objects
-- which Supabase blocks (error 42501). Dropping it here.
-- Avatar cleanup is handled client-side in deleteReader(); the path is now
-- guaranteed to be consistent ({user_id}/{reader_id}.jpg) because the reader
-- is created first and the upload uses the real reader ID.
-- =============================================================================

DROP TRIGGER IF EXISTS on_reader_deleted ON public.readers;
DROP FUNCTION IF EXISTS delete_reader_avatar();
