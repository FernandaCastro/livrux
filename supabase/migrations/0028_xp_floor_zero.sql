-- =============================================================================
-- Livrux — XP never goes below zero
--
-- When badges are revoked on book deletion the XP deduction could drive the
-- reader's total below 0. This migration clamps the balance at 0.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.revoke_unqualified_badges(p_reader_id UUID)
RETURNS TABLE (revoked_slug TEXT, penalty_xp INTEGER)
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

  SELECT COUNT(*), COALESCE(SUM(total_pages), 0)
  INTO v_book_count, v_total_pages
  FROM public.books WHERE reader_id = p_reader_id;

  SELECT COUNT(*) INTO v_foreign_count
  FROM public.books
  WHERE reader_id = p_reader_id AND is_foreign_language = TRUE;

  v_current_streak := public.calculate_streak(p_reader_id);

  FOR v_rb IN
    SELECT badge_slug, bonus_xp
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
      ELSE TRUE
    END;

    IF NOT v_still_qualifies THEN
      DELETE FROM public.reader_badges
      WHERE reader_id = p_reader_id AND badge_slug = v_rb.badge_slug;

      IF v_rb.bonus_xp > 0 THEN
        INSERT INTO public.xp_transactions (reader_id, user_id, amount, reason)
        VALUES (p_reader_id, v_user_id, -v_rb.bonus_xp, 'badge_revoked_' || v_rb.badge_slug);

        UPDATE public.readers
        SET xp = GREATEST(0, xp - v_rb.bonus_xp), updated_at = NOW()
        WHERE id = p_reader_id;
      END IF;

      revoked_slug := v_rb.badge_slug;
      penalty_xp   := v_rb.bonus_xp;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Ensure the column itself can never be stored as negative (belt-and-suspenders).
ALTER TABLE public.readers
  ADD CONSTRAINT readers_xp_non_negative CHECK (xp >= 0);
