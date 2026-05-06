-- Allow terms_accepted_at to be NULL in consent_logs.
--
-- Users who registered before the GDPR migration have terms_accepted_at = NULL
-- on user_profiles. The delete-account function should still record their
-- deletion in consent_logs for audit purposes, so the column must accept NULL.
ALTER TABLE public.consent_logs
  ALTER COLUMN terms_accepted_at DROP NOT NULL;
