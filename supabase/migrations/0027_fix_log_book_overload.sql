-- =============================================================================
-- Livrux — Remove ambiguous log_book overload
--
-- Migration 0026 changed the position of p_status in log_book.
-- PostgreSQL's CREATE OR REPLACE only replaces a function when the signature
-- matches exactly, so it created a second overload instead of replacing the
-- original. This migration drops the old signature explicitly.
-- =============================================================================

-- Old signature: p_status is the LAST parameter
DROP FUNCTION IF EXISTS public.log_book(
  uuid, text, text, integer, text, numeric,
  date, date, text, boolean, text, text, text
);
