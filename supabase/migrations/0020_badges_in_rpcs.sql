-- =============================================================================
-- Livrux — Embed badge checks inside log_book and complete_book
--
-- Both RPCs now return JSONB:
--   { "book_id": "<uuid>", "awarded_badges": [{"slug": "...", "bonus_livrux": 5.0}] }
--
-- This lets the frontend know which badges were just earned in a single
-- round-trip, enabling instant unlock animations without a second API call.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_book(
  p_reader_id          UUID,
  p_title              TEXT,
  p_author             TEXT,
  p_total_pages        INTEGER,
  p_cover_url          TEXT,
  p_livrux_earned      NUMERIC,
  p_status             TEXT DEFAULT 'completed',
  p_date_start         DATE DEFAULT CURRENT_DATE,
  p_date_completed     DATE DEFAULT NULL,
  p_notes              TEXT DEFAULT NULL,
  p_is_foreign_language BOOLEAN DEFAULT FALSE,
  p_rating             TEXT DEFAULT NULL,
  p_review             TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id      UUID;
  v_book_id      UUID;
  v_badges       JSONB := '[]'::JSONB;
  v_badge_row    RECORD;
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

  -- Check and award badges when a book is completed
  IF p_status = 'completed' THEN
    FOR v_badge_row IN
      SELECT awarded_slug, bonus_livrux
      FROM public.check_and_award_badges(p_reader_id)
    LOOP
      v_badges := v_badges || jsonb_build_object(
        'slug', v_badge_row.awarded_slug,
        'bonus_livrux', v_badge_row.bonus_livrux
      );
    END LOOP;

    -- Check book_club badge (cross-reader, handled separately)
    PERFORM public.check_book_club_badge(p_reader_id);
  END IF;

  RETURN jsonb_build_object(
    'book_id', v_book_id,
    'awarded_badges', v_badges
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- complete_book — now returns JSONB with awarded badges
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
AS $$
DECLARE
  v_reader_id UUID;
  v_user_id   UUID;
  v_status    TEXT;
  v_badges    JSONB := '[]'::JSONB;
  v_badge_row RECORD;
BEGIN
  SELECT reader_id, user_id, status
  INTO v_reader_id, v_user_id, v_status
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

  FOR v_badge_row IN
    SELECT awarded_slug, bonus_livrux
    FROM public.check_and_award_badges(v_reader_id)
  LOOP
    v_badges := v_badges || jsonb_build_object(
      'slug', v_badge_row.awarded_slug,
      'bonus_livrux', v_badge_row.bonus_livrux
    );
  END LOOP;

  PERFORM public.check_book_club_badge(v_reader_id);

  RETURN jsonb_build_object(
    'awarded_badges', v_badges
  );
END;
$$;
