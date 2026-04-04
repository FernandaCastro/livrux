-- =============================================================================
-- Livrux — Add is_foreign_language to books + update log_book RPC
-- Supports the new 'foreign_language' bonus rule type: parents can configure
-- a bonus for books read in a non-native language. The flag is set by the
-- reader (parent) at book-log time via a checkbox in the UI.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add is_foreign_language column to books
-- ---------------------------------------------------------------------------
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS is_foreign_language BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- 2. Update log_book RPC to accept and store is_foreign_language
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_book(
  p_reader_id           UUID,
  p_title               TEXT,
  p_author              TEXT,
  p_total_pages         INTEGER,
  p_cover_url           TEXT,
  p_livrux_earned       NUMERIC,
  p_date_completed      DATE,
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
