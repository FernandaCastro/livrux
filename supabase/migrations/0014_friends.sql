-- =============================================================================
-- Livrux — Friends feature
-- Adds friend codes, friendship requests, and cross-reader book visibility.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add friend_code and friends_autonomy to readers
--    friend_code: short child-friendly code used for discovery
--    friends_autonomy: when true, the child can accept/reject requests alone
-- ---------------------------------------------------------------------------
ALTER TABLE public.readers
  ADD COLUMN friend_code      TEXT    UNIQUE,
  ADD COLUMN friends_autonomy BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_readers_friend_code ON public.readers (friend_code);

-- ---------------------------------------------------------------------------
-- 2. Generate a unique 6-char alphanumeric code (no ambiguous chars)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT    := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code  TEXT;
  done  BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.readers WHERE friend_code = code) THEN
      done := TRUE;
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Auto-assign a friend_code on reader INSERT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_friend_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.friend_code IS NULL THEN
    NEW.friend_code := public.generate_friend_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_reader_friend_code
  BEFORE INSERT ON public.readers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_friend_code();

-- Backfill existing readers
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.readers WHERE friend_code IS NULL LOOP
    UPDATE public.readers
    SET friend_code = public.generate_friend_code()
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. reader_friendships — pending / accepted / rejected
-- ---------------------------------------------------------------------------
CREATE TABLE public.reader_friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX idx_rf_requester ON public.reader_friendships (requester_id);
CREATE INDEX idx_rf_addressee ON public.reader_friendships (addressee_id);

ALTER TABLE public.reader_friendships ENABLE ROW LEVEL SECURITY;

-- View any friendship where one of your readers is involved
CREATE POLICY "View own reader friendships"
  ON public.reader_friendships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.readers r
      WHERE r.user_id = auth.uid()
        AND (r.id = requester_id OR r.id = addressee_id)
    )
  );

-- Send a request only from a reader you own
CREATE POLICY "Send friend requests"
  ON public.reader_friendships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.readers r
      WHERE r.user_id = auth.uid() AND r.id = requester_id
    )
  );

-- Accept / reject only when your reader is the addressee
CREATE POLICY "Respond to friend requests"
  ON public.reader_friendships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.readers r
      WHERE r.user_id = auth.uid() AND r.id = addressee_id
    )
  );

-- Remove a friendship when one of your readers is involved
CREATE POLICY "Remove friendships"
  ON public.reader_friendships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.readers r
      WHERE r.user_id = auth.uid()
        AND (r.id = requester_id OR r.id = addressee_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Allow SELECT on readers that belong to accepted friends
--    The existing FOR ALL policy already covers own readers (auth.uid() = user_id).
--    This extra SELECT policy adds friend readers via OR logic.
-- ---------------------------------------------------------------------------
CREATE POLICY "View accepted friend readers"
  ON public.readers FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = readers.id OR rf.addressee_id = readers.id)
        AND EXISTS (
          SELECT 1 FROM public.readers my_r
          WHERE my_r.user_id = auth.uid()
            AND (my_r.id = rf.requester_id OR my_r.id = rf.addressee_id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Allow SELECT on books that belong to accepted friends
-- ---------------------------------------------------------------------------
CREATE POLICY "View accepted friend books"
  ON public.books FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = books.reader_id OR rf.addressee_id = books.reader_id)
        AND EXISTS (
          SELECT 1 FROM public.readers my_r
          WHERE my_r.user_id = auth.uid()
            AND (my_r.id = rf.requester_id OR my_r.id = rf.addressee_id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 7. RPC: search_reader_by_code
--    SECURITY DEFINER bypasses RLS so any authenticated user can find a reader
--    by their friend_code. Returns only safe, non-sensitive fields.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_reader_by_code(p_code TEXT)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  avatar_seed TEXT,
  book_count  BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.avatar_seed,
    COUNT(b.id)::BIGINT AS book_count
  FROM public.readers r
  LEFT JOIN public.books b ON b.reader_id = r.id
  WHERE UPPER(TRIM(r.friend_code)) = UPPER(TRIM(p_code))
  GROUP BY r.id, r.name, r.avatar_seed;
END;
$$;
