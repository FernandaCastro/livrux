-- ---------------------------------------------------------------------------
-- 0008_denormalized_book_count
-- Adds book_count to readers (completed books only) to avoid books(count)
-- joins on every reader/friends fetch.
-- RPCs log_book, complete_book, and delete_book are updated to maintain it.
-- All three functions carry forward the fixes from 0006 (XP for long books)
-- and 0007 (description field with book title in transactions).
-- ---------------------------------------------------------------------------

ALTER TABLE public.readers
  ADD COLUMN IF NOT EXISTS book_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.readers r
SET book_count = (
  SELECT count(*)
  FROM public.books b
  WHERE b.reader_id = r.id AND b.status = 'completed'
);


-- ---------------------------------------------------------------------------
-- log_book — base: 0007 (XP for all completed + description); adds book_count
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

  INSERT INTO public.books (
    reader_id, user_id, title, author, total_pages,
    cover_url, livrux_earned, status, date_start, date_completed,
    notes, is_foreign_language, rating, review
  ) VALUES (
    p_reader_id, v_user_id, p_title, p_author, p_total_pages,
    p_cover_url,
    CASE WHEN p_status = 'completed' THEN p_livrux_earned ELSE 0 END,
    p_status, p_date_start, p_date_completed,
    p_notes, p_is_foreign_language,
    CASE WHEN p_status = 'completed' THEN p_rating ELSE NULL END,
    CASE WHEN p_status = 'completed' THEN p_review ELSE NULL END
  ) RETURNING id INTO v_book_id;

  IF p_status = 'completed' THEN
    UPDATE public.readers
    SET book_count = book_count + 1,
        updated_at = NOW()
    WHERE id = p_reader_id;
  END IF;

  IF p_status = 'completed' AND p_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason, description)
    VALUES (p_reader_id, v_user_id, v_book_id, p_livrux_earned, 'book_completed', p_title);

    UPDATE public.readers
    SET livrux_balance = livrux_balance + p_livrux_earned,
        updated_at = NOW()
    WHERE id = p_reader_id;
  END IF;

  -- XP = total pages for any book added directly as completed (no reading sessions).
  -- Short books (≤ 100p) and long books alike get XP here because log_book is used
  -- for retroactive entries that bypass the reading-session flow entirely.
  IF p_status = 'completed' THEN
    v_xp_earned := p_total_pages;

    INSERT INTO public.xp_transactions (reader_id, user_id, amount, reason)
    VALUES (p_reader_id, v_user_id, v_xp_earned, 'book_completed');

    UPDATE public.readers
    SET xp = xp + v_xp_earned, updated_at = NOW()
    WHERE id = p_reader_id;
  END IF;

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

  RETURN jsonb_build_object(
    'book_id',        v_book_id,
    'awarded_badges', v_badges,
    'xp_earned',      v_xp_earned
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- complete_book — base: 0007 (v_title + description); adds book_count
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
  v_reader_id   UUID;
  v_user_id     UUID;
  v_title       TEXT;
  v_status      TEXT;
  v_total_pages INTEGER;
  v_badges      JSONB   := '[]'::JSONB;
  v_badge_row   RECORD;
  v_xp_earned   INTEGER := 0;
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

  UPDATE public.books
  SET status         = 'completed',
      date_completed = p_date_completed,
      livrux_earned  = p_livrux_earned,
      rating         = p_rating,
      review         = p_review
  WHERE id = p_book_id;

  UPDATE public.readers
  SET book_count = book_count + 1,
      updated_at = NOW()
  WHERE id = v_reader_id;

  IF p_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason, description)
    VALUES (v_reader_id, v_user_id, p_book_id, p_livrux_earned, 'book_completed', v_title);

    UPDATE public.readers
    SET livrux_balance = livrux_balance + p_livrux_earned,
        updated_at = NOW()
    WHERE id = v_reader_id;
  END IF;

  -- XP for short book (≤ 100 pages) = total page count
  IF v_total_pages <= 100 THEN
    v_xp_earned := v_total_pages;

    INSERT INTO public.xp_transactions (reader_id, user_id, amount, reason)
    VALUES (v_reader_id, v_user_id, v_xp_earned, 'book_completed_short');

    UPDATE public.readers
    SET xp = xp + v_xp_earned, updated_at = NOW()
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
-- delete_book — base: 0007 (v_title + description); adds v_status + book_count
--              + XP deduction based on last reading session or total_pages
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_book(p_book_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_id         UUID;
  v_user_id           UUID;
  v_title             TEXT;
  v_status            TEXT;
  v_total_pages       INTEGER;
  v_livrux_earned     NUMERIC;
  v_session_xp INTEGER := 0;
  v_xp_to_deduct      INTEGER := 0;
  v_revoked           JSONB := '[]'::JSONB;
  v_row               RECORD;
BEGIN
  SELECT reader_id, user_id, title, status, total_pages, livrux_earned
  INTO v_reader_id, v_user_id, v_title, v_status, v_total_pages, v_livrux_earned
  FROM public.books
  WHERE id = p_book_id AND user_id = auth.uid();

  IF v_reader_id IS NULL THEN
    RAISE EXCEPTION 'Book not found or access denied';
  END IF;

  -- Compute XP earned from reading sessions before CASCADE removes them.
  -- Mirrors log_reading_session: XP = GREATEST(last_page - prev_last_page, 0) per session.
  -- Summing all deltas is necessary because GREATEST(0) means last_page alone
  -- under-counts when the reader ever reported going backwards.
  SELECT COALESCE(SUM(GREATEST(last_page - LAG(last_page, 1, 0) OVER (ORDER BY session_date, id), 0)), 0)
  INTO v_session_xp
  FROM public.reading_sessions
  WHERE book_id = p_book_id AND reader_id = v_reader_id;

  -- Calculate XP to deduct:
  --   Completed book via log_book (no sessions): XP = total_pages (0006 rule).
  --   Completed via reading flow, short book (≤ 100p): XP = total_pages (completion bonus).
  --   Completed via reading flow, long book (> 100p): XP = sum of session page-deltas.
  --   Reading book, long (> 100p): XP = sum of session page-deltas.
  --   Reading book, short: no XP was ever awarded.
  IF v_status = 'completed' THEN
    IF v_session_xp > 0 THEN
      v_xp_to_deduct := CASE
        WHEN v_total_pages <= 100 THEN v_total_pages
        ELSE v_session_xp
      END;
    ELSE
      v_xp_to_deduct := v_total_pages;
    END IF;
  ELSIF v_total_pages > 100 THEN
    v_xp_to_deduct := v_session_xp;
  END IF;

  -- Delete the book; reading_sessions cascade automatically.
  DELETE FROM public.books WHERE id = p_book_id;

  IF v_status = 'completed' THEN
    UPDATE public.readers
    SET book_count = book_count - 1,
        updated_at = NOW()
    WHERE id = v_reader_id;
  END IF;

  IF v_xp_to_deduct > 0 THEN
    INSERT INTO public.xp_transactions (reader_id, user_id, amount, reason)
    VALUES (v_reader_id, v_user_id, -v_xp_to_deduct, 'book_deleted');

    UPDATE public.readers
    SET xp        = GREATEST(0, xp - v_xp_to_deduct),
        updated_at = NOW()
    WHERE id = v_reader_id;
  END IF;

  -- Deduct Livrux earned (0 for 'reading' books, so always safe).
  IF v_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason, description)
    VALUES (v_reader_id, v_user_id, NULL, -v_livrux_earned, 'book_deleted', v_title);

    UPDATE public.readers
    SET livrux_balance = livrux_balance - v_livrux_earned,
        updated_at     = NOW()
    WHERE id = v_reader_id;
  END IF;

  -- Revoke any badges the reader no longer qualifies for.
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
