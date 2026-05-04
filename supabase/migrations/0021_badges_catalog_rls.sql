-- =============================================================================
-- Livrux — Badges catalog read policy
-- The badges table is a static catalog (no user data). Enable RLS and add an
-- explicit SELECT policy so every authenticated user can read it regardless
-- of the Supabase project's default grant configuration.
-- =============================================================================

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read badges catalog"
  ON public.badges FOR SELECT
  TO authenticated
  USING (true);
