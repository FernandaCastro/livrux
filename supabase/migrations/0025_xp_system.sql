-- =============================================================================
-- Livrux — XP system (separate from Livrux currency)
--
-- XP is a gamification score earned through badges and streaks.
-- It appears in the reader profile and as a ranking metric among friends.
-- It is NOT tied to the Livrux formula and cannot be spent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add XP to readers
-- ---------------------------------------------------------------------------
ALTER TABLE public.readers ADD COLUMN xp INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 2. XP transaction log
-- ---------------------------------------------------------------------------
CREATE TABLE public.xp_transactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id   UUID        NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id),
  amount      INTEGER     NOT NULL,
  reason      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_tx_reader ON public.xp_transactions (reader_id, created_at DESC);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own XP transactions"
  ON public.xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP transactions"
  ON public.xp_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow friends to see each other's XP transactions
CREATE POLICY "View accepted friend XP transactions"
  ON public.xp_transactions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = xp_transactions.reader_id OR rf.addressee_id = xp_transactions.reader_id)
        AND EXISTS (
          SELECT 1 FROM public.readers my_r
          WHERE my_r.user_id = auth.uid()
            AND (my_r.id = rf.requester_id OR my_r.id = rf.addressee_id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Rename bonus_livrux → bonus_xp in reader_badges
-- ---------------------------------------------------------------------------
ALTER TABLE public.reader_badges RENAME COLUMN bonus_livrux TO bonus_xp;

-- Change type from NUMERIC to INTEGER (XP is whole points)
ALTER TABLE public.reader_badges
  ALTER COLUMN bonus_xp TYPE INTEGER USING bonus_xp::INTEGER;

-- ---------------------------------------------------------------------------
-- 4. search_reader_by_code — add xp to result
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_reader_by_code(p_code TEXT)
RETURNS TABLE (id UUID, name TEXT, avatar_seed TEXT, book_count BIGINT, xp INTEGER)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.avatar_seed,
    COUNT(b.id)::BIGINT AS book_count,
    r.xp
  FROM public.readers r
  LEFT JOIN public.books b ON b.reader_id = r.id
  WHERE r.friend_code = p_code
  GROUP BY r.id, r.name, r.avatar_seed, r.xp;
$$;

-- ---------------------------------------------------------------------------
-- 5. check_and_award_badges — award XP instead of Livrux bonus
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_reader_id UUID)
RETURNS TABLE (awarded_slug TEXT, bonus_xp INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID;
  v_book_count     BIGINT;
  v_total_pages    BIGINT;
  v_foreign_count  BIGINT;
  v_current_streak INTEGER;
  v_slug           TEXT;
  v_xp             INTEGER;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.readers WHERE id = p_reader_id;

  SELECT COUNT(*), COALESCE(SUM(total_pages), 0)
  INTO v_book_count, v_total_pages
  FROM public.books WHERE reader_id = p_reader_id;

  SELECT COUNT(*) INTO v_foreign_count
  FROM public.books WHERE reader_id = p_reader_id AND is_foreign_language = TRUE;

  v_current_streak := public.calculate_streak(p_reader_id);

  FOR v_slug, v_xp IN (VALUES
    ('first_book',         50),
    ('bookworm_5',        100),
    ('bookworm_25',       250),
    ('centurion',        1000),
    ('page_hunter_500',    50),
    ('page_hunter_5000',  500),
    ('polyglot',          150),
    ('streak_7',          100),
    ('streak_30',         500)
  ) LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.reader_badges
      WHERE reader_id = p_reader_id AND badge_slug = v_slug
    );

    IF  (v_slug = 'first_book'       AND v_book_count    >= 1)
     OR (v_slug = 'bookworm_5'       AND v_book_count    >= 5)
     OR (v_slug = 'bookworm_25'      AND v_book_count    >= 25)
     OR (v_slug = 'centurion'        AND v_book_count    >= 100)
     OR (v_slug = 'page_hunter_500'  AND v_total_pages   >= 500)
     OR (v_slug = 'page_hunter_5000' AND v_total_pages   >= 5000)
     OR (v_slug = 'polyglot'         AND v_foreign_count >= 3)
     OR (v_slug = 'streak_7'         AND v_current_streak >= 7)
     OR (v_slug = 'streak_30'        AND v_current_streak >= 30)
    THEN
      INSERT INTO public.reader_badges (reader_id, user_id, badge_slug, bonus_xp)
      VALUES (p_reader_id, v_user_id, v_slug, v_xp);

      INSERT INTO public.xp_transactions (reader_id, user_id, amount, reason)
      VALUES (p_reader_id, v_user_id, v_xp, 'badge_' || v_slug);

      UPDATE public.readers
      SET xp = xp + v_xp, updated_at = NOW()
      WHERE id = p_reader_id;

      awarded_slug := v_slug;
      bonus_xp     := v_xp;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. check_book_club_badge — award XP instead of Livrux bonus
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_book_club_badge(p_reader_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_already BOOLEAN;
  v_earned  BOOLEAN := FALSE;
BEGIN
  SELECT user_id INTO v_user_id FROM public.readers WHERE id = p_reader_id;

  SELECT EXISTS (
    SELECT 1 FROM public.reader_badges
    WHERE reader_id = p_reader_id AND badge_slug = 'book_club'
  ) INTO v_already;

  IF v_already THEN RETURN FALSE; END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.books b1
    JOIN public.reader_friendships rf
      ON rf.status = 'accepted'
      AND (rf.requester_id = p_reader_id OR rf.addressee_id = p_reader_id)
    JOIN public.books b2
      ON b2.reader_id = CASE
            WHEN rf.requester_id = p_reader_id THEN rf.addressee_id
            ELSE rf.requester_id
           END
    WHERE b1.reader_id = p_reader_id
      AND LOWER(TRIM(b1.title)) = LOWER(TRIM(b2.title))
  ) INTO v_earned;

  IF v_earned THEN
    INSERT INTO public.reader_badges (reader_id, user_id, badge_slug, bonus_xp)
    VALUES (p_reader_id, v_user_id, 'book_club', 100)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.xp_transactions (reader_id, user_id, amount, reason)
    VALUES (p_reader_id, v_user_id, 100, 'badge_book_club');

    UPDATE public.readers
    SET xp = xp + 100, updated_at = NOW()
    WHERE id = p_reader_id;
  END IF;

  RETURN v_earned;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. revoke_unqualified_badges — deduct XP instead of Livrux
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_unqualified_badges(p_reader_id UUID)
RETURNS TABLE (revoked_slug TEXT, penalty_xp INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID;
  v_book_count     BIGINT;
  v_total_pages    BIGINT;
  v_foreign_count  BIGINT;
  v_current_streak INTEGER;
  v_rb             RECORD;
  v_still_qualifies BOOLEAN;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.readers WHERE id = p_reader_id;

  SELECT COUNT(*), COALESCE(SUM(total_pages), 0)
  INTO v_book_count, v_total_pages
  FROM public.books WHERE reader_id = p_reader_id;

  SELECT COUNT(*) INTO v_foreign_count
  FROM public.books
  WHERE reader_id = p_reader_id AND is_foreign_language = TRUE;

  v_current_streak := public.calculate_streak(p_reader_id);

  FOR v_rb IN
    SELECT badge_slug, bonus_xp
    FROM public.reader_badges
    WHERE reader_id = p_reader_id
    ORDER BY badge_slug
  LOOP
    v_still_qualifies := CASE v_rb.badge_slug
      WHEN 'first_book'       THEN v_book_count      >= 1
      WHEN 'bookworm_5'       THEN v_book_count      >= 5
      WHEN 'bookworm_25'      THEN v_book_count      >= 25
      WHEN 'centurion'        THEN v_book_count      >= 100
      WHEN 'page_hunter_500'  THEN v_total_pages     >= 500
      WHEN 'page_hunter_5000' THEN v_total_pages     >= 5000
      WHEN 'polyglot'         THEN v_foreign_count   >= 3
      WHEN 'streak_7'         THEN v_current_streak  >= 7
      WHEN 'streak_30'        THEN v_current_streak  >= 30
      WHEN 'book_club'        THEN EXISTS (
        SELECT 1
        FROM public.books b1
        JOIN public.reader_friendships rf
          ON rf.status = 'accepted'
         AND (rf.requester_id = p_reader_id OR rf.addressee_id = p_reader_id)
        JOIN public.books b2
          ON b2.reader_id = CASE
               WHEN rf.requester_id = p_reader_id THEN rf.addressee_id
               ELSE rf.requester_id
             END
        WHERE b1.reader_id = p_reader_id
          AND LOWER(TRIM(b1.title)) = LOWER(TRIM(b2.title))
      )
      ELSE TRUE
    END;

    IF NOT v_still_qualifies THEN
      DELETE FROM public.reader_badges
      WHERE reader_id = p_reader_id AND badge_slug = v_rb.badge_slug;

      IF v_rb.bonus_xp > 0 THEN
        INSERT INTO public.xp_transactions (reader_id, user_id, amount, reason)
        VALUES (p_reader_id, v_user_id, -v_rb.bonus_xp, 'badge_revoked_' || v_rb.badge_slug);

        UPDATE public.readers
        SET xp = xp - v_rb.bonus_xp, updated_at = NOW()
        WHERE id = p_reader_id;
      END IF;

      revoked_slug := v_rb.badge_slug;
      penalty_xp   := v_rb.bonus_xp;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. delete_book — update to use penalty_xp instead of penalty_livrux
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_book(p_book_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_id     UUID;
  v_user_id       UUID;
  v_livrux_earned NUMERIC;
  v_revoked       JSONB := '[]'::JSONB;
  v_row           RECORD;
BEGIN
  SELECT reader_id, user_id, livrux_earned
  INTO v_reader_id, v_user_id, v_livrux_earned
  FROM public.books
  WHERE id = p_book_id AND user_id = auth.uid();

  IF v_reader_id IS NULL THEN
    RAISE EXCEPTION 'Book not found or access denied';
  END IF;

  DELETE FROM public.books WHERE id = p_book_id;

  IF v_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason)
    VALUES (v_reader_id, v_user_id, NULL, -v_livrux_earned, 'book_deleted');

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
