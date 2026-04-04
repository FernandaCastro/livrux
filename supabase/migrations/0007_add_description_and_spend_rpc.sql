-- =============================================================================
-- Livrux — Add description column to transactions + spend_livrux RPC
-- Adds a human-readable description to every transaction:
--   - book_completed / book_deleted: auto-filled with the book title
--   - manual_spend: filled by the user when logging a real-life expense
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add description column
-- ---------------------------------------------------------------------------
ALTER TABLE public.livrux_transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- ---------------------------------------------------------------------------
-- 2. Update log_book RPC to store book title as description
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_book(
  p_reader_id      UUID,
  p_title          TEXT,
  p_author         TEXT,
  p_total_pages    INTEGER,
  p_cover_url      TEXT,
  p_livrux_earned  NUMERIC,
  p_date_completed DATE,
  p_notes          TEXT
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
    cover_url, livrux_earned, date_completed, notes
  ) VALUES (
    p_reader_id, v_user_id, p_title, p_author, p_total_pages,
    p_cover_url, p_livrux_earned, p_date_completed, p_notes
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
-- 3. Update delete_book RPC to store book title as description
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_book(p_book_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_reader_id     UUID;
  v_user_id       UUID;
  v_livrux_earned NUMERIC;
  v_title         TEXT;
BEGIN
  SELECT reader_id, user_id, livrux_earned, title
  INTO v_reader_id, v_user_id, v_livrux_earned, v_title
  FROM public.books
  WHERE id = p_book_id AND user_id = auth.uid();

  IF v_reader_id IS NULL THEN
    RAISE EXCEPTION 'Book not found or access denied';
  END IF;

  DELETE FROM public.books WHERE id = p_book_id;

  INSERT INTO public.livrux_transactions
    (reader_id, user_id, book_id, amount, reason, description)
  VALUES
    (v_reader_id, v_user_id, NULL, -v_livrux_earned, 'book_deleted', v_title);

  UPDATE public.readers
  SET livrux_balance = livrux_balance - v_livrux_earned,
      updated_at = NOW()
  WHERE id = v_reader_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. New RPC: spend_livrux — logs a real-life Livrux expense
--    p_amount is a positive value; stored as negative in the transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spend_livrux(
  p_reader_id   UUID,
  p_amount      NUMERIC,
  p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
BEGIN
  SELECT user_id, livrux_balance
  INTO v_user_id, v_balance
  FROM public.readers
  WHERE id = p_reader_id AND user_id = auth.uid();

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
      updated_at = NOW()
  WHERE id = p_reader_id;
END;
$$;
