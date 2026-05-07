-- Fix: log_book was not awarding XP for long books (> 100 pages) added directly
-- as completed. The original rule only awarded XP = total_pages for short books
-- (≤ 100 pages), expecting long books to earn XP via reading sessions.
-- When a book is added retroactively as "already completed" via log_book, no
-- reading sessions are created, so the reader earned 0 XP. This migration
-- extends the completion XP rule to cover all books added directly as completed.

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

  IF p_status = 'completed' AND p_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason)
    VALUES (p_reader_id, v_user_id, v_book_id, p_livrux_earned, 'book_completed');

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
