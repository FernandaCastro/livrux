-- =============================================================================
-- Livrux — Book reading status
-- Adds status ('reading' | 'completed'), date_start, and makes date_completed
-- nullable so books can be tracked from the first page to the last.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add new columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.books
  ADD COLUMN status     TEXT NOT NULL DEFAULT 'completed'
                            CHECK (status IN ('reading', 'completed')),
  ADD COLUMN date_start DATE NOT NULL DEFAULT CURRENT_DATE;

-- ---------------------------------------------------------------------------
-- 2. Make date_completed nullable
--    Existing rows keep their date; new 'reading' books will have NULL.
-- ---------------------------------------------------------------------------
ALTER TABLE public.books
  ALTER COLUMN date_completed DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Backfill: existing completed books get date_start = date_completed
-- ---------------------------------------------------------------------------
UPDATE public.books
SET date_start = date_completed
WHERE date_start = CURRENT_DATE AND date_completed IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Index for filtering by status per reader
-- ---------------------------------------------------------------------------
CREATE INDEX idx_books_reader_status ON public.books (reader_id, status);

-- ---------------------------------------------------------------------------
-- 5. Update log_book RPC — now accepts date_start and status.
--    When status = 'reading', livrux is NOT awarded yet and date_completed
--    is stored as NULL.
--    When status = 'completed' (default), behaviour is identical to before.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_book(
  p_reader_id          UUID,
  p_title              TEXT,
  p_author             TEXT,
  p_total_pages        INTEGER,
  p_cover_url          TEXT,
  p_livrux_earned      NUMERIC,
  p_date_start         DATE,
  p_date_completed     DATE,      -- NULL when status = 'reading'
  p_notes              TEXT,
  p_is_foreign_language BOOLEAN,
  p_rating             TEXT,
  p_review             TEXT,
  p_status             TEXT DEFAULT 'completed'
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

  -- Only award Livrux when completing immediately
  IF p_status = 'completed' AND p_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason)
    VALUES (p_reader_id, v_user_id, v_book_id, p_livrux_earned, 'book_completed');

    UPDATE public.readers
    SET livrux_balance = livrux_balance + p_livrux_earned,
        updated_at = NOW()
    WHERE id = p_reader_id;
  END IF;

  RETURN v_book_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. complete_book RPC — transitions a 'reading' book to 'completed'.
--    Awards the Livrux, sets date_completed, rating, and review atomically.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_book(
  p_book_id            UUID,
  p_date_completed     DATE,
  p_livrux_earned      NUMERIC,
  p_rating             TEXT,
  p_review             TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_reader_id UUID;
  v_user_id   UUID;
  v_status    TEXT;
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
END;
$$;
