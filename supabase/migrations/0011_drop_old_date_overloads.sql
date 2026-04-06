-- =============================================================================
-- Livrux — Drop old DATE overloads of log_book and update_book
-- After migration 0010 changed date_completed to TIMESTAMPTZ, the previous
-- DATE-typed signatures still exist, causing PGRST203 ambiguity errors.
-- Explicitly drop them so only the TIMESTAMPTZ variants remain.
-- =============================================================================

DROP FUNCTION IF EXISTS public.log_book(
  uuid, text, text, integer, text, numeric, date, text, boolean
);

DROP FUNCTION IF EXISTS public.update_book(
  uuid, text, text, integer, text, date, boolean, numeric
);
