-- =============================================================================
-- Livrux — Atomic book-deletion RPC
-- Deletes a book, records a negative Livrux transaction, and subtracts the
-- reader's balance in a single database transaction to prevent balance drift.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_book(p_book_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_reader_id     UUID;
  v_user_id       UUID;
  v_livrux_earned NUMERIC;
BEGIN
  -- Verify that the calling user owns this book and fetch the earned amount.
  SELECT reader_id, user_id, livrux_earned
  INTO v_reader_id, v_user_id, v_livrux_earned
  FROM public.books
  WHERE id = p_book_id AND user_id = auth.uid();

  IF v_reader_id IS NULL THEN
    RAISE EXCEPTION 'Book not found or access denied';
  END IF;

  -- Delete the book record (livrux_transactions.book_id becomes NULL via ON DELETE SET NULL).
  DELETE FROM public.books WHERE id = p_book_id;

  -- Record the compensating negative transaction.
  INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason)
  VALUES (v_reader_id, v_user_id, NULL, -v_livrux_earned, 'book_deleted');

  -- Subtract the coins from the reader's balance atomically.
  UPDATE public.readers
  SET livrux_balance = livrux_balance - v_livrux_earned,
      updated_at = NOW()
  WHERE id = v_reader_id;
END;
$$;
