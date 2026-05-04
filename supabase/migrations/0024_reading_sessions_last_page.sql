-- =============================================================================
-- Livrux — Rename pages_read → last_page in reading_sessions
--
-- Shifts the tracking model from "how many pages did you read today?"
-- to "which page are you on?" — a more natural question for children.
-- The streak calculation is unaffected: it only checks row existence, not
-- the column value.
-- =============================================================================

ALTER TABLE public.reading_sessions
  RENAME COLUMN pages_read TO last_page;

ALTER TABLE public.reading_sessions
  DROP CONSTRAINT IF EXISTS reading_sessions_pages_read_check;

ALTER TABLE public.reading_sessions
  ADD CONSTRAINT reading_sessions_last_page_check CHECK (last_page > 0);
