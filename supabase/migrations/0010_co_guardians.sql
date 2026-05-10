-- Co-guardian feature: allows multiple auth users to share one family's data.
-- A "co-guardian" is any user who has been invited to manage the same readers,
-- books, and rewards as the original account owner.

-- ── 1. Tables ─────────────────────────────────────────────────────────────────

CREATE TABLE public.co_guardians (
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, guardian_id),
  CHECK (owner_id <> guardian_id)
);
-- Each user can only belong to one family (one row per guardian_id).
CREATE UNIQUE INDEX co_guardians_unique_guardian ON public.co_guardians(guardian_id);
ALTER TABLE public.co_guardians ENABLE ROW LEVEL SECURITY;

-- Family members can view the list of co-guardians.
CREATE POLICY "family can view co-guardians" ON public.co_guardians
  FOR SELECT
  USING (owner_id = auth.uid() OR guardian_id = auth.uid());

-- Owner can remove any co-guardian; co-guardians can remove themselves.
CREATE POLICY "family can remove co-guardians" ON public.co_guardians
  FOR DELETE
  USING (owner_id = auth.uid() OR guardian_id = auth.uid());

-- INSERT is handled exclusively by the accept-invitation edge function (service role).

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.guardian_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  token       UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status      TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);
ALTER TABLE public.guardian_invitations ENABLE ROW LEVEL SECURITY;

-- ── 2. family_owner_id() — must be created BEFORE the policies that use it ───

-- Returns the root owner's user_id:
--   • For a co-guardian  → the owner they belong to
--   • For everyone else  → their own auth.uid()
CREATE OR REPLACE FUNCTION public.family_owner_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.co_guardians WHERE guardian_id = auth.uid() LIMIT 1),
    auth.uid()
  )
$$;

-- ── 3. guardian_invitations policies (use family_owner_id) ───────────────────

-- Family members can view all invitations for their family.
CREATE POLICY "family can view invitations" ON public.guardian_invitations
  FOR SELECT
  USING (public.family_owner_id() = owner_id);

-- Family members can insert invitations on behalf of the owner.
CREATE POLICY "family can create invitations" ON public.guardian_invitations
  FOR INSERT
  WITH CHECK (public.family_owner_id() = owner_id);

-- Family members can cancel pending invitations.
CREATE POLICY "family can cancel invitations" ON public.guardian_invitations
  FOR UPDATE
  USING (public.family_owner_id() = owner_id)
  WITH CHECK (public.family_owner_id() = owner_id);

-- ── 4. Update my_reader_ids() to respect co-guardian relationships ────────────

CREATE OR REPLACE FUNCTION public.my_reader_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.readers WHERE user_id = public.family_owner_id();
$$;

-- ── 5. Update RLS policies for all shared-data tables ────────────────────────

-- reward_formulas
DROP POLICY IF EXISTS "Users can read their own formula"  ON public.reward_formulas;
DROP POLICY IF EXISTS "Users can update their own formula" ON public.reward_formulas;

CREATE POLICY "family can read formula" ON public.reward_formulas
  FOR SELECT USING (public.family_owner_id() = user_id);

CREATE POLICY "family can update formula" ON public.reward_formulas
  FOR UPDATE USING (public.family_owner_id() = user_id);

-- readers
DROP POLICY IF EXISTS "Users can manage their own readers" ON public.readers;
DROP POLICY IF EXISTS "View accepted friend readers"       ON public.readers;

CREATE POLICY "family can manage readers" ON public.readers
  FOR ALL
  USING    (public.family_owner_id() = user_id)
  WITH CHECK (public.family_owner_id() = user_id);

CREATE POLICY "View accepted friend readers" ON public.readers
  FOR SELECT
  USING (
    public.family_owner_id() = user_id
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

-- books
DROP POLICY IF EXISTS "Users can manage their own books" ON public.books;
DROP POLICY IF EXISTS "View accepted friend books"       ON public.books;

CREATE POLICY "family can manage books" ON public.books
  FOR ALL
  USING    (public.family_owner_id() = user_id)
  WITH CHECK (public.family_owner_id() = user_id);

CREATE POLICY "View accepted friend books" ON public.books
  FOR SELECT
  USING (
    public.family_owner_id() = user_id
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

-- livrux_transactions
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.livrux_transactions;

CREATE POLICY "family can manage transactions" ON public.livrux_transactions
  FOR ALL
  USING    (public.family_owner_id() = user_id)
  WITH CHECK (public.family_owner_id() = user_id);

-- reading_sessions
DROP POLICY IF EXISTS "Users can manage their own reading sessions"  ON public.reading_sessions;
DROP POLICY IF EXISTS "View accepted friend reading sessions"         ON public.reading_sessions;

CREATE POLICY "family can manage reading sessions" ON public.reading_sessions
  FOR ALL
  USING    (public.family_owner_id() = user_id)
  WITH CHECK (public.family_owner_id() = user_id);

CREATE POLICY "View accepted friend reading sessions" ON public.reading_sessions
  FOR SELECT
  USING (
    public.family_owner_id() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = reading_sessions.reader_id OR rf.addressee_id = reading_sessions.reader_id)
        AND (
          rf.requester_id IN (SELECT public.my_reader_ids())
          OR rf.addressee_id IN (SELECT public.my_reader_ids())
        )
    )
  );

-- reader_badges
DROP POLICY IF EXISTS "Users can read their own reader badges"   ON public.reader_badges;
DROP POLICY IF EXISTS "Users can insert their own reader badges" ON public.reader_badges;
DROP POLICY IF EXISTS "View accepted friend badges"              ON public.reader_badges;

CREATE POLICY "family can read reader badges" ON public.reader_badges
  FOR SELECT USING (public.family_owner_id() = user_id);

CREATE POLICY "family can insert reader badges" ON public.reader_badges
  FOR INSERT WITH CHECK (public.family_owner_id() = user_id);

CREATE POLICY "View accepted friend badges" ON public.reader_badges
  FOR SELECT
  USING (
    public.family_owner_id() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = reader_badges.reader_id OR rf.addressee_id = reader_badges.reader_id)
        AND (
          rf.requester_id IN (SELECT public.my_reader_ids())
          OR rf.addressee_id IN (SELECT public.my_reader_ids())
        )
    )
  );

-- ── 6. Update RPCs that check auth.uid() against user_id directly ─────────────
-- Each function below is based on the 0009 version (current baseline) with
-- auth.uid() replaced by family_owner_id() to allow co-guardian access.

-- spend_livrux — base: 0001
CREATE OR REPLACE FUNCTION public.spend_livrux(
  p_reader_id   UUID,
  p_amount      NUMERIC,
  p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
BEGIN
  SELECT user_id, livrux_balance
  INTO v_user_id, v_balance
  FROM public.readers
  WHERE id = p_reader_id AND user_id = public.family_owner_id();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reader not found or access denied';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  INSERT INTO public.livrux_transactions
    (reader_id, user_id, book_id, amount, reason, description)
  VALUES
    (p_reader_id, v_user_id, NULL, -p_amount, 'manual_spend', p_description);

  UPDATE public.readers
  SET livrux_balance = livrux_balance - p_amount,
      updated_at     = NOW()
  WHERE id = p_reader_id;
END;
$$;

-- log_book — base: 0009; auth.uid() → family_owner_id()
CREATE OR REPLACE FUNCTION public.log_book(
  p_reader_id           UUID,
  p_title               TEXT,
  p_author              TEXT,
  p_total_pages         INTEGER,
  p_cover_url           TEXT,
  p_livrux_earned       NUMERIC,
  p_status              TEXT    DEFAULT 'completed',
  p_date_start          DATE    DEFAULT CURRENT_DATE,
  p_date_completed      DATE    DEFAULT NULL,
  p_notes               TEXT    DEFAULT NULL,
  p_is_foreign_language BOOLEAN DEFAULT FALSE,
  p_rating              TEXT    DEFAULT NULL,
  p_review              TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_book_id   UUID;
  v_badges    JSONB   := '[]'::JSONB;
  v_badge_row RECORD;
  v_xp_earned INTEGER := 0;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.readers
  WHERE id = p_reader_id AND user_id = public.family_owner_id();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reader not found or access denied';
  END IF;

  IF p_status = 'completed' THEN
    v_xp_earned := p_total_pages;
  END IF;

  INSERT INTO public.books (
    reader_id, user_id, title, author, total_pages,
    cover_url, livrux_earned, status, date_start, date_completed,
    notes, is_foreign_language, rating, review, xp_earned
  ) VALUES (
    p_reader_id, v_user_id, p_title, p_author, p_total_pages,
    p_cover_url,
    CASE WHEN p_status = 'completed' THEN p_livrux_earned ELSE 0 END,
    p_status, p_date_start, p_date_completed,
    p_notes, p_is_foreign_language,
    CASE WHEN p_status = 'completed' THEN p_rating ELSE NULL END,
    CASE WHEN p_status = 'completed' THEN p_review ELSE NULL END,
    v_xp_earned
  ) RETURNING id INTO v_book_id;

  IF p_status = 'completed' THEN
    UPDATE public.readers
    SET book_count = book_count + 1,
        xp         = xp + v_xp_earned,
        updated_at = NOW()
    WHERE id = p_reader_id;
  END IF;

  IF p_status = 'completed' AND p_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason, description)
    VALUES (p_reader_id, v_user_id, v_book_id, p_livrux_earned, 'book_completed', p_title);

    UPDATE public.readers
    SET livrux_balance = livrux_balance + p_livrux_earned,
        updated_at     = NOW()
    WHERE id = p_reader_id;
  END IF;

  IF p_status = 'completed' THEN
    FOR v_badge_row IN
      SELECT awarded_slug, bonus_xp
      FROM public.check_and_award_badges(p_reader_id)
    LOOP
      v_badges := v_badges || jsonb_build_object(
        'slug',     v_badge_row.awarded_slug,
        'bonus_xp', v_badge_row.bonus_xp
      );
    END LOOP;

    IF public.check_book_club_badge(p_reader_id) THEN
      v_badges := v_badges || jsonb_build_object(
        'slug',     'book_club',
        'bonus_xp', 100
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'book_id',        v_book_id,
    'awarded_badges', v_badges,
    'xp_earned',      v_xp_earned
  );
END;
$$;

-- complete_book — base: 0009; auth.uid() → family_owner_id()
CREATE OR REPLACE FUNCTION public.complete_book(
  p_book_id        UUID,
  p_date_completed DATE,
  p_livrux_earned  NUMERIC,
  p_rating         TEXT,
  p_review         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_id    UUID;
  v_user_id      UUID;
  v_title        TEXT;
  v_status       TEXT;
  v_total_pages  INTEGER;
  v_last_page    INTEGER := 0;
  v_badges       JSONB   := '[]'::JSONB;
  v_badge_row    RECORD;
  v_xp_earned    INTEGER := 0;
BEGIN
  SELECT reader_id, user_id, title, status, total_pages
  INTO v_reader_id, v_user_id, v_title, v_status, v_total_pages
  FROM public.books
  WHERE id = p_book_id AND user_id = public.family_owner_id();

  IF v_reader_id IS NULL THEN
    RAISE EXCEPTION 'Book not found or access denied';
  END IF;

  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'Book is already completed';
  END IF;

  IF v_total_pages <= 100 THEN
    v_xp_earned := v_total_pages;
  ELSE
    SELECT COALESCE(last_page, 0) INTO v_last_page
    FROM public.reading_sessions
    WHERE book_id = p_book_id AND reader_id = v_reader_id
    ORDER BY session_date DESC
    LIMIT 1;

    v_xp_earned := GREATEST(v_total_pages - v_last_page, 0);
  END IF;

  UPDATE public.books
  SET status         = 'completed',
      date_completed = p_date_completed,
      livrux_earned  = p_livrux_earned,
      rating         = p_rating,
      review         = p_review,
      xp_earned      = xp_earned + v_xp_earned
  WHERE id = p_book_id;

  UPDATE public.readers
  SET book_count = book_count + 1,
      xp         = xp + v_xp_earned,
      updated_at = NOW()
  WHERE id = v_reader_id;

  IF p_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason, description)
    VALUES (v_reader_id, v_user_id, p_book_id, p_livrux_earned, 'book_completed', v_title);

    UPDATE public.readers
    SET livrux_balance = livrux_balance + p_livrux_earned,
        updated_at     = NOW()
    WHERE id = v_reader_id;
  END IF;

  FOR v_badge_row IN
    SELECT awarded_slug, bonus_xp
    FROM public.check_and_award_badges(v_reader_id)
  LOOP
    v_badges := v_badges || jsonb_build_object(
      'slug',     v_badge_row.awarded_slug,
      'bonus_xp', v_badge_row.bonus_xp
    );
  END LOOP;

  IF public.check_book_club_badge(v_reader_id) THEN
    v_badges := v_badges || jsonb_build_object(
      'slug',     'book_club',
      'bonus_xp', 100
    );
  END IF;

  RETURN jsonb_build_object(
    'awarded_badges', v_badges,
    'xp_earned',      v_xp_earned
  );
END;
$$;

-- log_reading_session — base: 0009; auth.uid() → family_owner_id()
CREATE OR REPLACE FUNCTION public.log_reading_session(
  p_reader_id UUID,
  p_book_id   UUID,
  p_last_page INTEGER,
  p_date      DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id             UUID;
  v_total_pages         INTEGER;
  v_previous_last_page  INTEGER;
  v_pages_delta         INTEGER;
  v_xp_earned           INTEGER := 0;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.readers
  WHERE id = p_reader_id AND user_id = public.family_owner_id();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reader not found or access denied';
  END IF;

  SELECT total_pages INTO v_total_pages
  FROM public.books
  WHERE id = p_book_id AND reader_id = p_reader_id;

  SELECT COALESCE(
    (SELECT last_page FROM public.reading_sessions
      WHERE reader_id = p_reader_id AND book_id = p_book_id
        AND session_date = p_date),
    (SELECT last_page FROM public.reading_sessions
      WHERE reader_id = p_reader_id AND book_id = p_book_id
        AND session_date < p_date
      ORDER BY session_date DESC LIMIT 1),
    0
  ) INTO v_previous_last_page;

  INSERT INTO public.reading_sessions (reader_id, book_id, user_id, session_date, last_page)
  VALUES (p_reader_id, p_book_id, v_user_id, p_date, p_last_page)
  ON CONFLICT (reader_id, book_id, session_date)
  DO UPDATE SET last_page = EXCLUDED.last_page;

  IF v_total_pages > 100 THEN
    v_pages_delta := GREATEST(p_last_page - v_previous_last_page, 0);
    v_xp_earned   := v_pages_delta;

    IF v_xp_earned > 0 THEN
      UPDATE public.books
      SET xp_earned = xp_earned + v_xp_earned
      WHERE id = p_book_id;

      UPDATE public.readers
      SET xp = xp + v_xp_earned, updated_at = NOW()
      WHERE id = p_reader_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('xp_earned', v_xp_earned);
END;
$$;

-- update_book — base: 0007; auth.uid() → family_owner_id()
CREATE OR REPLACE FUNCTION public.update_book(
  p_book_id             UUID,
  p_title               TEXT,
  p_author              TEXT,
  p_total_pages         INTEGER,
  p_cover_url           TEXT,
  p_date_completed      DATE,
  p_is_foreign_language BOOLEAN,
  p_livrux_earned       NUMERIC,
  p_rating              TEXT DEFAULT NULL,
  p_review              TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_id  UUID;
  v_user_id    UUID;
  v_old_livrux NUMERIC;
  v_delta      NUMERIC;
BEGIN
  SELECT reader_id, user_id, livrux_earned
  INTO v_reader_id, v_user_id, v_old_livrux
  FROM public.books
  WHERE id = p_book_id AND user_id = public.family_owner_id();

  IF v_reader_id IS NULL THEN
    RAISE EXCEPTION 'Book not found or access denied';
  END IF;

  v_delta := p_livrux_earned - v_old_livrux;

  UPDATE public.books
  SET
    title               = p_title,
    author              = p_author,
    total_pages         = p_total_pages,
    cover_url           = p_cover_url,
    date_completed      = p_date_completed,
    is_foreign_language = p_is_foreign_language,
    livrux_earned       = p_livrux_earned,
    rating              = p_rating,
    review              = p_review
  WHERE id = p_book_id;

  IF v_delta <> 0 THEN
    INSERT INTO public.livrux_transactions
      (reader_id, user_id, book_id, amount, reason, description)
    VALUES
      (v_reader_id, v_user_id, p_book_id, v_delta, 'book_updated', p_title);

    UPDATE public.readers
    SET livrux_balance = livrux_balance + v_delta,
        updated_at     = NOW()
    WHERE id = v_reader_id;
  END IF;
END;
$$;

-- delete_book — base: 0009; auth.uid() → family_owner_id()
CREATE OR REPLACE FUNCTION public.delete_book(p_book_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_id     UUID;
  v_user_id       UUID;
  v_title         TEXT;
  v_status        TEXT;
  v_livrux_earned NUMERIC;
  v_xp_earned     INTEGER;
  v_revoked       JSONB := '[]'::JSONB;
  v_row           RECORD;
BEGIN
  SELECT reader_id, user_id, title, status, livrux_earned, xp_earned
  INTO v_reader_id, v_user_id, v_title, v_status, v_livrux_earned, v_xp_earned
  FROM public.books
  WHERE id = p_book_id AND user_id = public.family_owner_id();

  IF v_reader_id IS NULL THEN
    RAISE EXCEPTION 'Book not found or access denied';
  END IF;

  DELETE FROM public.books WHERE id = p_book_id;

  IF v_status = 'completed' THEN
    UPDATE public.readers
    SET book_count = book_count - 1,
        updated_at = NOW()
    WHERE id = v_reader_id;
  END IF;

  IF v_xp_earned > 0 THEN
    UPDATE public.readers
    SET xp         = GREATEST(0, xp - v_xp_earned),
        updated_at = NOW()
    WHERE id = v_reader_id;
  END IF;

  IF v_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason, description)
    VALUES (v_reader_id, v_user_id, NULL, -v_livrux_earned, 'book_deleted', v_title);

    UPDATE public.readers
    SET livrux_balance = livrux_balance - v_livrux_earned,
        updated_at     = NOW()
    WHERE id = v_reader_id;
  END IF;

  FOR v_row IN
    SELECT revoked_slug, penalty_xp
    FROM public.revoke_unqualified_badges(v_reader_id)
  LOOP
    v_revoked := v_revoked || jsonb_build_object(
      'slug',       v_row.revoked_slug,
      'penalty_xp', v_row.penalty_xp
    );
  END LOOP;

  RETURN jsonb_build_object('revoked_badges', v_revoked);
END;
$$;
