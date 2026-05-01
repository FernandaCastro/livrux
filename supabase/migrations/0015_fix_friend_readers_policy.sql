-- Fix infinite recursion introduced by 0014_friends.sql.
--
-- The cycle was:
--   readers policy → queries reader_friendships
--   reader_friendships policy → queries readers
--   → 42P17 infinite recursion
--
-- Fix: a SECURITY DEFINER helper returns the current user's reader IDs
-- without triggering RLS, breaking the cycle in both directions.

CREATE OR REPLACE FUNCTION public.my_reader_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.readers WHERE user_id = auth.uid();
$$;

-- readers policy ----------------------------------------------------------
DROP POLICY IF EXISTS "View accepted friend readers" ON public.readers;

CREATE POLICY "View accepted friend readers"
  ON public.readers FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = readers.id OR rf.addressee_id = readers.id)
        AND (
          rf.requester_id IN (SELECT public.my_reader_ids())
          OR rf.addressee_id IN (SELECT public.my_reader_ids())
        )
    )
  );

-- books policy ------------------------------------------------------------
DROP POLICY IF EXISTS "View accepted friend books" ON public.books;

CREATE POLICY "View accepted friend books"
  ON public.books FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = books.reader_id OR rf.addressee_id = books.reader_id)
        AND (
          rf.requester_id IN (SELECT public.my_reader_ids())
          OR rf.addressee_id IN (SELECT public.my_reader_ids())
        )
    )
  );

-- reader_friendships policies ---------------------------------------------
-- All four policies used to query public.readers directly, which triggered
-- the readers RLS → reader_friendships RLS cycle. Replaced with
-- my_reader_ids() so the inner readers query bypasses RLS.

DROP POLICY IF EXISTS "View own reader friendships"  ON public.reader_friendships;
DROP POLICY IF EXISTS "Send friend requests"         ON public.reader_friendships;
DROP POLICY IF EXISTS "Respond to friend requests"   ON public.reader_friendships;
DROP POLICY IF EXISTS "Remove friendships"           ON public.reader_friendships;

CREATE POLICY "View own reader friendships"
  ON public.reader_friendships FOR SELECT
  USING (
    requester_id IN (SELECT public.my_reader_ids())
    OR addressee_id IN (SELECT public.my_reader_ids())
  );

CREATE POLICY "Send friend requests"
  ON public.reader_friendships FOR INSERT
  WITH CHECK (
    requester_id IN (SELECT public.my_reader_ids())
  );

CREATE POLICY "Respond to friend requests"
  ON public.reader_friendships FOR UPDATE
  USING (
    addressee_id IN (SELECT public.my_reader_ids())
  );

CREATE POLICY "Remove friendships"
  ON public.reader_friendships FOR DELETE
  USING (
    requester_id IN (SELECT public.my_reader_ids())
    OR addressee_id IN (SELECT public.my_reader_ids())
  );
