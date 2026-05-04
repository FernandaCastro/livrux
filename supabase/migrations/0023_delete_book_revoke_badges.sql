-- =============================================================================
-- Livrux — delete_book: also revoke badges no longer earned
--
-- When a book is deleted its reading sessions are removed via CASCADE.
-- This migration adds a helper that checks every badge the reader currently
-- holds and revokes (+ claws back bonus Livrux) any that they no longer
-- qualify for based on the post-deletion state.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. revoke_unqualified_badges(p_reader_id)
--    Called after a book (and its sessions) have been deleted.
--    Returns one row per badge revoked so callers can surface this in the UI.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_unqualified_badges(p_reader_id UUID)
RETURNS TABLE (revoked_slug TEXT, penalty_livrux NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID;
  v_book_count     BIGINT;
  v_total_pages    BIGINT;
  v_foreign_count  BIGINT;
  v_current_streak INTEGER;
  v_rb             RECORD;
  v_still_qualifies BOOLEAN;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.readers WHERE id = p_reader_id;

  -- Recompute stats against the post-deletion state (same logic as check_and_award_badges).
  SELECT COUNT(*), COALESCE(SUM(total_pages), 0)
  INTO v_book_count, v_total_pages
  FROM public.books WHERE reader_id = p_reader_id;

  SELECT COUNT(*) INTO v_foreign_count
  FROM public.books
  WHERE reader_id = p_reader_id AND is_foreign_language = TRUE;

  v_current_streak := public.calculate_streak(p_reader_id);

  FOR v_rb IN
    SELECT badge_slug, bonus_livrux
    FROM public.reader_badges
    WHERE reader_id = p_reader_id
    ORDER BY badge_slug
  LOOP
    v_still_qualifies := CASE v_rb.badge_slug
      WHEN 'first_book'       THEN v_book_count      >= 1
      WHEN 'bookworm_5'       THEN v_book_count      >= 5
      WHEN 'bookworm_25'      THEN v_book_count      >= 25
      WHEN 'centurion'        THEN v_book_count      >= 100
      WHEN 'page_hunter_500'  THEN v_total_pages     >= 500
      WHEN 'page_hunter_5000' THEN v_total_pages     >= 5000
      WHEN 'polyglot'         THEN v_foreign_count   >= 3
      WHEN 'streak_7'         THEN v_current_streak  >= 7
      WHEN 'streak_30'        THEN v_current_streak  >= 30
      WHEN 'book_club'        THEN EXISTS (
        SELECT 1
        FROM public.books b1
        JOIN public.reader_friendships rf
          ON rf.status = 'accepted'
         AND (rf.requester_id = p_reader_id OR rf.addressee_id = p_reader_id)
        JOIN public.books b2
          ON b2.reader_id = CASE
               WHEN rf.requester_id = p_reader_id THEN rf.addressee_id
               ELSE rf.requester_id
             END
        WHERE b1.reader_id = p_reader_id
          AND LOWER(TRIM(b1.title)) = LOWER(TRIM(b2.title))
      )
      ELSE TRUE  -- unknown future badges are kept
    END;

    IF NOT v_still_qualifies THEN
      DELETE FROM public.reader_badges
      WHERE reader_id = p_reader_id AND badge_slug = v_rb.badge_slug;

      IF v_rb.bonus_livrux > 0 THEN
        INSERT INTO public.livrux_transactions (reader_id, user_id, amount, reason)
        VALUES (p_reader_id, v_user_id, -v_rb.bonus_livrux, 'badge_revoked_' || v_rb.badge_slug);

        UPDATE public.readers
        SET livrux_balance = livrux_balance - v_rb.bonus_livrux,
            updated_at     = NOW()
        WHERE id = p_reader_id;
      END IF;

      revoked_slug   := v_rb.badge_slug;
      penalty_livrux := v_rb.bonus_livrux;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
--2. Drop delete_book--
-- ---------------------------------------------------------------------------
DROP FUNCTION delete_book;

-- ---------------------------------------------------------------------------
-- 3. delete_book — rewritten to return JSONB with revoked badges
--    { "revoked_badges": [{"slug": "...", "penalty_livrux": 5.0}] }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_book(p_book_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_id     UUID;
  v_user_id       UUID;
  v_livrux_earned NUMERIC;
  v_revoked       JSONB := '[]'::JSONB;
  v_row           RECORD;
BEGIN
  SELECT reader_id, user_id, livrux_earned
  INTO v_reader_id, v_user_id, v_livrux_earned
  FROM public.books
  WHERE id = p_book_id AND user_id = auth.uid();

  IF v_reader_id IS NULL THEN
    RAISE EXCEPTION 'Book not found or access denied';
  END IF;

  -- Delete the book. reading_sessions cascade automatically.
  DELETE FROM public.books WHERE id = p_book_id;

  -- Deduct Livrux earned from this book (only meaningful for completed books;
  -- livrux_earned is 0 for 'reading' books so this is always safe).
  IF v_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason)
    VALUES (v_reader_id, v_user_id, NULL, -v_livrux_earned, 'book_deleted');

    UPDATE public.readers
    SET livrux_balance = livrux_balance - v_livrux_earned,
        updated_at     = NOW()
    WHERE id = v_reader_id;
  END IF;

  -- Revoke any badges the reader no longer qualifies for.
  FOR v_row IN
    SELECT revoked_slug, penalty_livrux
    FROM public.revoke_unqualified_badges(v_reader_id)
  LOOP
    v_revoked := v_revoked || jsonb_build_object(
      'slug',            v_row.revoked_slug,
      'penalty_livrux',  v_row.penalty_livrux
    );
  END LOOP;

  RETURN jsonb_build_object('revoked_badges', v_revoked);
END;
$$;
