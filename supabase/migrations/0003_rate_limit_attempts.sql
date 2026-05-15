-- ---------------------------------------------------------------------------
-- rate_limit_attempts — tracks recent RPC calls for rate limiting.
-- Used by Edge Functions to enforce per-user request limits without an
-- external Redis dependency. Old rows are cleaned up by a weekly pg_cron job.
--
-- No RLS: only accessible via service role (Edge Functions).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL,
  action       TEXT        NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_rate_limit_user_action
  ON public.rate_limit_attempts (user_id, action, attempted_at);

-- service_role bypasses RLS but still needs table-level grants.
GRANT SELECT, INSERT ON public.rate_limit_attempts TO service_role;

-- Weekly cleanup of attempts older than 24 hours (requires pg_cron extension).
-- Enable in Supabase dashboard: Database → Extensions → pg_cron
SELECT cron.schedule(
  'cleanup-rate-limit-attempts',
  '0 3 * * 0',
  $$DELETE FROM public.rate_limit_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours'$$
);

-- Revoke direct RPC access — search_reader_by_code must now go through
-- the search-reader Edge Function which enforces the rate limit.
REVOKE EXECUTE ON FUNCTION public.search_reader_by_code(TEXT) FROM authenticated;
