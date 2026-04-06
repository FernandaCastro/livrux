-- =============================================================================
-- Livrux — Atomic book-update RPC
-- Updates all editable book fields, records a 'book_updated' transaction with
-- the Livrux delta (new minus old), and adjusts the reader balance atomically.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_book(
  p_book_id             UUID,
  p_title               TEXT,
  p_author              TEXT,
  p_total_pages         INTEGER,
  p_cover_url           TEXT,
  p_notes               TEXT,
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
  -- Verify ownership and fetch current livrux_earned.
  SELECT reader_id, user_id, livrux_earned
  INTO v_reader_id, v_user_id, v_old_livrux
  FROM public.books
  WHERE id = p_book_id AND user_id = auth.uid();

  IF v_reader_id IS NULL THEN
    RAISE EXCEPTION 'Book not found or access denied';
  END IF;

  v_delta := p_livrux_earned - v_old_livrux;

  -- Update book fields.
  UPDATE public.books
  SET
    title               = p_title,
    author              = p_author,
    total_pages         = p_total_pages,
    cover_url           = p_cover_url,
    notes               = p_notes,
    is_foreign_language = p_is_foreign_language,
    livrux_earned       = p_livrux_earned
  WHERE id = p_book_id;

  -- Record the balance change as an auditable transaction.
  -- amount = delta (positive if earned more, negative if earned less).
  -- description = new book title.
  INSERT INTO public.livrux_transactions
    (reader_id, user_id, book_id, amount, reason, description)
  VALUES
    (v_reader_id, v_user_id, p_book_id, v_delta, 'book_updated', p_title);

  -- Adjust reader balance by the delta atomically.
  UPDATE public.readers
  SET livrux_balance = livrux_balance + v_delta,
      updated_at     = NOW()
  WHERE id = v_reader_id;
END;
$$;
