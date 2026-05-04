-- =============================================================================
-- Livrux — XP por leitura
--
-- Regra:
--   • Livros ≤ 100 páginas  → 20 XP ao concluir
--   • Livros >  100 páginas → 10 XP por sessão diária (primeira do dia)
--
-- Esta migration também corrige log_book e complete_book que ainda
-- referenciavam bonus_livrux em vez de bonus_xp após a migration 0025.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. log_reading_session — upsert atômico + XP na primeira sessão do dia
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_reading_session(
  p_reader_id  UUID,
  p_book_id    UUID,
  p_last_page  INTEGER,
  p_date       DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id           UUID;
  v_total_pages       INTEGER;
  v_previous_last_page INTEGER;
  v_pages_delta       INTEGER;
  v_xp_earned         INTEGER := 0;
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

  -- Baseline: today's existing last_page (if updating same day) or most recent
  -- prior session, or 0 for the very first session ever.
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

  -- XP = 1 per page advanced (long books only; short books earn XP on completion)
  IF v_total_pages > 100 THEN
    v_pages_delta := GREATEST(p_last_page - v_previous_last_page, 0);
    v_xp_earned   := v_pages_delta;

    IF v_xp_earned > 0 THEN
      INSERT INTO public.xp_transactions (reader_id, user_id, amount, reason)
      VALUES (p_reader_id, v_user_id, v_xp_earned, 'reading_session');

      UPDATE public.readers
      SET xp = xp + v_xp_earned, updated_at = NOW()
      WHERE id = p_reader_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('xp_earned', v_xp_earned);
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. log_book — corrige bonus_livrux → bonus_xp + XP para livro curto
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

  IF p_status = 'completed' AND p_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason)
    VALUES (p_reader_id, v_user_id, v_book_id, p_livrux_earned, 'book_completed');

    UPDATE public.readers
    SET livrux_balance = livrux_balance + p_livrux_earned,
        updated_at = NOW()
    WHERE id = p_reader_id;
  END IF;

  -- XP por completar livro curto (≤ 100 páginas) = nº de páginas do livro
  IF p_status = 'completed' AND p_total_pages <= 100 THEN
    v_xp_earned := p_total_pages;

    INSERT INTO public.xp_transactions (reader_id, user_id, amount, reason)
    VALUES (p_reader_id, v_user_id, v_xp_earned, 'book_completed_short');

    UPDATE public.readers
    SET xp = xp + v_xp_earned, updated_at = NOW()
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

    PERFORM public.check_book_club_badge(p_reader_id);
  END IF;

  RETURN jsonb_build_object(
    'book_id',        v_book_id,
    'awarded_badges', v_badges,
    'xp_earned',      v_xp_earned
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. complete_book — corrige bonus_livrux → bonus_xp + XP para livro curto
-- ---------------------------------------------------------------------------
DROP FUNCTION complete_book
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
  v_reader_id  UUID;
  v_user_id    UUID;
  v_status     TEXT;
  v_total_pages INTEGER;
  v_badges     JSONB   := '[]'::JSONB;
  v_badge_row  RECORD;
  v_xp_earned  INTEGER := 0;
BEGIN
  SELECT reader_id, user_id, status, total_pages
  INTO v_reader_id, v_user_id, v_status, v_total_pages
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

  IF p_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason)
    VALUES (v_reader_id, v_user_id, p_book_id, p_livrux_earned, 'book_completed');

    UPDATE public.readers
    SET livrux_balance = livrux_balance + p_livrux_earned,
        updated_at = NOW()
    WHERE id = v_reader_id;
  END IF;

  -- XP por completar livro curto (≤ 100 páginas) = nº de páginas do livro
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

  PERFORM public.check_book_club_badge(v_reader_id);

  RETURN jsonb_build_object(
    'awarded_badges', v_badges,
    'xp_earned',      v_xp_earned
  );
END;
$$;
