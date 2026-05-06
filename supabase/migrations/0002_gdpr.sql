-- =============================================================================
-- Livrux — GDPR / DSGVO compliance (consolidated from migrations 0030–0031)
--
-- 1. Adds terms_accepted_at to user_profiles and updates the sign-up trigger
--    to capture the consent timestamp passed by the client at registration.
--
-- 2. Creates consent_logs for 3-year post-deletion retention (Art. 6 GDPR).
--    The Edge Function delete-account copies the row here before deleting the
--    user, so the record survives the ON DELETE CASCADE chain.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Consent timestamp on user_profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Update the sign-up trigger to also capture terms_accepted_at.
-- The client passes it via:
--   supabase.auth.signUp({ options: { data: { terms_accepted_at: '...' } } })
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, terms_accepted_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    (NEW.raw_user_meta_data->>'terms_accepted_at')::TIMESTAMPTZ
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.reward_formulas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Consent audit log
--
-- Intentionally has NO foreign key to auth.users so the record survives
-- account deletion — required for GDPR / DSGVO compliance (3-year retention).
--
-- The Edge Function supabase/functions/delete-account copies the row here
-- before calling adminClient.auth.admin.deleteUser().
-- ---------------------------------------------------------------------------
CREATE TABLE public.consent_logs (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- user_id stored as plain UUID (not FK) — becomes an orphan after deletion
  user_id            UUID        NOT NULL,
  email              TEXT        NOT NULL,
  terms_accepted_at  TIMESTAMPTZ NOT NULL,
  account_deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retain_until       TIMESTAMPTZ NOT NULL   -- set to account_deleted_at + 3 years
);

-- Only the service role (Edge Function) can read/write this table.
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
-- No policies = no access via anon or authenticated role.
-- The Edge Function uses the service role key, which bypasses RLS.
