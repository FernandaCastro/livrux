-- =============================================================================
-- Livrux — Change date_completed from DATE to TIMESTAMPTZ
-- Allows sorting books by the exact date+time they were read, while still
-- only displaying and editing the date portion in the UI.
-- Existing DATE values are cast to TIMESTAMPTZ at midnight UTC.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Change column type
-- ---------------------------------------------------------------------------
ALTER TABLE public.books
  ALTER COLUMN date_completed TYPE TIMESTAMPTZ
  USING date_completed::TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2. Update log_book RPC — accept TIMESTAMPTZ instead of DATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_book(
  p_reader_id           UUID,
  p_title               TEXT,
  p_author              TEXT,
  p_total_pages         INTEGER,
  p_cover_url           TEXT,
  p_livrux_earned       NUMERIC,
  p_date_completed      TIMESTAMPTZ,
  p_notes               TEXT,
  p_is_foreign_language BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_book_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.readers
  WHERE id = p_reader_id AND user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reader not found or access denied';
  END IF;

  INSERT INTO public.books (
    reader_id, user_id, title, author, total_pages,
    cover_url, livrux_earned, date_completed, notes, is_foreign_language
  ) VALUES (
    p_reader_id, v_user_id, p_title, p_author, p_total_pages,
    p_cover_url, p_livrux_earned, p_date_completed, p_notes, p_is_foreign_language
  ) RETURNING id INTO v_book_id;

  INSERT INTO public.livrux_transactions
    (reader_id, user_id, book_id, amount, reason, description)
  VALUES
    (p_reader_id, v_user_id, v_book_id, p_livrux_earned, 'book_completed', p_title);

  UPDATE public.readers
  SET livrux_balance = livrux_balance + p_livrux_earned,
      updated_at = NOW()
  WHERE id = p_reader_id;

  RETURN v_book_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Update update_book RPC — accept TIMESTAMPTZ instead of DATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_book(
  p_book_id             UUID,
  p_title               TEXT,
  p_author              TEXT,
  p_total_pages         INTEGER,
  p_cover_url           TEXT,
  p_date_completed      TIMESTAMPTZ,
  p_is_foreign_language BOOLEAN,
  p_livrux_earned       NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_reader_id     UUID;
  v_user_id       UUID;
  v_old_livrux    NUMERIC;
  v_delta         NUMERIC;
BEGIN
  SELECT reader_id, user_id, livrux_earned
  INTO v_reader_id, v_user_id, v_old_livrux
  FROM public.books
  WHERE id = p_book_id AND user_id = auth.uid();

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
    livrux_earned       = p_livrux_earned
  WHERE id = p_book_id;

  INSERT INTO public.livrux_transactions
    (reader_id, user_id, book_id, amount, reason, description)
  VALUES
    (v_reader_id, v_user_id, p_book_id, v_delta, 'book_updated', p_title);

  UPDATE public.readers
  SET livrux_balance = livrux_balance + v_delta,
      updated_at     = NOW()
  WHERE id = v_reader_id;
END;
$$;
