-- ---------------------------------------------------------------------------
-- 0009_drop_xp_transactions
--
-- Replaces xp_transactions with a denormalized books.xp_earned column.
-- readers.xp is always derivable from first principles:
--   readers.xp = SUM(books.xp_earned) + SUM(reader_badges.bonus_xp)
--
-- All RPCs that previously wrote to xp_transactions are updated to maintain
-- books.xp_earned instead. delete_book is simplified: it deducts
-- books.xp_earned directly instead of branching on status/pages/sessions.
--
-- Also updates search_reader_by_code to use the denormalized book_count
-- (added in 0008) instead of a COUNT join.
-- ---------------------------------------------------------------------------


-- ─── 1. New column ──────────────────────────────────────────────────────────

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS xp_earned INTEGER NOT NULL DEFAULT 0;


-- ─── 2. Backfill ────────────────────────────────────────────────────────────
-- Rules:
--   Short books (≤ 100p), completed   → total_pages  (awarded on completion)
--   Short books (≤ 100p), reading     → 0            (XP not yet earned)
--   Long books  (> 100p), any status  → sum of forward page-deltas across
--                                        reading_sessions; if no sessions exist
--                                        and status = completed, the book was
--                                        added directly via log_book → total_pages.

WITH deltas AS (
  SELECT
    book_id,
    GREATEST(
      last_page
        - LAG(last_page, 1, 0) OVER (PARTITION BY book_id ORDER BY session_date),
      0
    ) AS xp_delta
  FROM public.reading_sessions
),
session_xp AS (
  SELECT book_id, SUM(xp_delta) AS total_xp
  FROM deltas
  GROUP BY book_id
)
UPDATE public.books b
SET xp_earned = CASE
  WHEN b.total_pages <= 100 AND b.status = 'completed' THEN b.total_pages
  WHEN b.total_pages <= 100 AND b.status = 'reading'   THEN 0
  WHEN b.total_pages > 100 THEN
    COALESCE(
      (SELECT total_xp FROM session_xp WHERE book_id = b.id),
      CASE WHEN b.status = 'completed' THEN b.total_pages ELSE 0 END
    )
  ELSE 0
END;


-- ─── 3. RPCs ────────────────────────────────────────────────────────────────

-- ---------------------------------------------------------------------------
-- log_book — base: 0008; removes xp_transactions INSERT, sets books.xp_earned.
-- ---------------------------------------------------------------------------
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
  WHERE id = p_reader_id AND user_id = auth.uid();

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


-- ---------------------------------------------------------------------------
-- complete_book — base: 0008; removes xp_transactions INSERT, sets xp_earned.
-- Short books: XP = total_pages (earned entirely at completion).
-- Long books:  XP = remaining pages not yet covered by reading sessions,
--              i.e. total_pages − last_page_read. This tops up books.xp_earned
--              (which already holds session XP) to equal total_pages.
-- ---------------------------------------------------------------------------
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
  WHERE id = p_book_id AND user_id = auth.uid();

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


-- ---------------------------------------------------------------------------
-- log_reading_session — base: 0001; removes xp_transactions INSERT,
-- updates books.xp_earned instead.
-- ---------------------------------------------------------------------------
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
  WHERE id = p_reader_id AND user_id = auth.uid();

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


-- ---------------------------------------------------------------------------
-- check_and_award_badges — base: 0001; removes xp_transactions INSERT.
-- Badge XP is already stored in reader_badges.bonus_xp.
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
    ('first_book',          50),
    ('bookworm_5',         100),
    ('bookworm_25',        250),
    ('centurion',         1000),
    ('page_hunter_500',     50),
    ('page_hunter_5000',   500),
    ('polyglot',           150),
    ('streak_7',           100),
    ('streak_30',          500)
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
-- check_book_club_badge — base: 0001; removes xp_transactions INSERT.
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

    UPDATE public.readers
    SET xp = xp + 100, updated_at = NOW()
    WHERE id = p_reader_id;
  END IF;

  RETURN v_earned;
END;
$$;


-- ---------------------------------------------------------------------------
-- revoke_unqualified_badges — base: 0001; removes xp_transactions INSERT.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_unqualified_badges(p_reader_id UUID)
RETURNS TABLE (revoked_slug TEXT, penalty_xp INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id         UUID;
  v_book_count      BIGINT;
  v_total_pages     BIGINT;
  v_foreign_count   BIGINT;
  v_current_streak  INTEGER;
  v_rb              RECORD;
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
        UPDATE public.readers
        SET xp = GREATEST(0, xp - v_rb.bonus_xp), updated_at = NOW()
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
-- delete_book — base: 0008; removes xp_transactions INSERT.
-- XP to deduct comes directly from books.xp_earned — no branching needed.
-- ---------------------------------------------------------------------------
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
  WHERE id = p_book_id AND user_id = auth.uid();

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


-- ---------------------------------------------------------------------------
-- search_reader_by_code — uses denormalized book_count (added in 0008).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_reader_by_code(p_code TEXT)
RETURNS TABLE (id UUID, name TEXT, avatar_seed TEXT, book_count BIGINT, xp INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.avatar_seed,
    r.book_count::BIGINT,
    r.xp
  FROM public.readers r
  WHERE r.friend_code = p_code;
$$;


-- ─── 4. Drop xp_transactions ────────────────────────────────────────────────

DROP TABLE public.xp_transactions;
