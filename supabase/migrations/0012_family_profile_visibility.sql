-- Allow family members (co-guardians and their owner) to view each other's
-- user_profiles so the co-guardians list can show display names .
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own or family members profile" ON public.user_profiles;

CREATE POLICY "Users can view their own or family members profile"
  ON public.user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.co_guardians
      WHERE (owner_id = auth.uid() AND guardian_id = user_profiles.id)
         OR (guardian_id = auth.uid() AND owner_id = user_profiles.id)
    )
  );
