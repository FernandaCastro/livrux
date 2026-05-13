-- ---------------------------------------------------------------------------
-- Fix SECURITY DEFINER authorization gaps
--
-- 1. Revoke direct RPC access to internal badge functions from authenticated.
--    check_and_award_badges, check_book_club_badge, revoke_unqualified_badges
--    are called only by log_book / complete_book / delete_book, which already
--    validate ownership. Exposing them via GRANT lets any authenticated user
--    award or revoke badges on any reader directly.
--
-- 2. Add ownership/friendship guard to calculate_streak and get_streak_info.
--    Both query books and reading_sessions via SECURITY DEFINER (bypassing RLS)
--    but were missing an authorization check. A caller must own the reader or
--    have an accepted friendship with it.
-- ---------------------------------------------------------------------------


-- ── 1. Revoke internal badge functions from authenticated ─────────────────

REVOKE EXECUTE ON FUNCTION
  public.check_and_award_badges(UUID),
  public.check_book_club_badge(UUID),
  public.revoke_unqualified_badges(UUID)
FROM authenticated;


-- ── 2. calculate_streak — add ownership/friendship guard ─────────────────

CREATE OR REPLACE FUNCTION public.calculate_streak(p_reader_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak       INTEGER := 0;
  v_check_date   DATE;
  v_has_activity BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.readers
    WHERE id = p_reader_id AND user_id = public.family_owner_id()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.reader_friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = p_reader_id AND addressee_id IN (SELECT public.my_reader_ids()))
        OR (addressee_id = p_reader_id AND requester_id IN (SELECT public.my_reader_ids()))
      )
  ) THEN
    RAISE EXCEPTION 'Reader not found or access denied';
  END IF;

  v_check_date := CURRENT_DATE;

  SELECT EXISTS (
    SELECT 1 FROM public.books
    WHERE reader_id = p_reader_id
      AND total_pages < 100
      AND date_completed::DATE = v_check_date
    UNION ALL
    SELECT 1 FROM public.reading_sessions
    WHERE reader_id = p_reader_id
      AND session_date = v_check_date
  ) INTO v_has_activity;

  IF NOT v_has_activity THEN
    v_check_date := CURRENT_DATE - 1;
  END IF;

  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.books
      WHERE reader_id = p_reader_id
        AND total_pages < 100
        AND date_completed::DATE = v_check_date
      UNION ALL
      SELECT 1 FROM public.reading_sessions
      WHERE reader_id = p_reader_id
        AND session_date = v_check_date
    ) INTO v_has_activity;

    EXIT WHEN NOT v_has_activity;

    v_streak     := v_streak + 1;
    v_check_date := v_check_date - 1;
  END LOOP;

  RETURN v_streak;
END;
$$;


-- ── 3. get_streak_info — add ownership/friendship guard ──────────────────

CREATE OR REPLACE FUNCTION public.get_streak_info(p_reader_id UUID)
RETURNS TABLE (current_streak INTEGER, best_streak INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current   INTEGER;
  v_best      INTEGER := 0;
  v_streak    INTEGER := 0;
  v_prev_date DATE    := NULL;
  v_row       RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.readers
    WHERE id = p_reader_id AND user_id = public.family_owner_id()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.reader_friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = p_reader_id AND addressee_id IN (SELECT public.my_reader_ids()))
        OR (addressee_id = p_reader_id AND requester_id IN (SELECT public.my_reader_ids()))
      )
  ) THEN
    RAISE EXCEPTION 'Reader not found or access denied';
  END IF;

  v_current := public.calculate_streak(p_reader_id);

  FOR v_row IN (
    SELECT DISTINCT activity_date FROM (
      SELECT date_completed::DATE AS activity_date
      FROM public.books
      WHERE reader_id = p_reader_id AND total_pages < 100
      UNION
      SELECT session_date AS activity_date
      FROM public.reading_sessions
      WHERE reader_id = p_reader_id
    ) sub
    ORDER BY activity_date
  ) LOOP
    IF v_prev_date IS NULL OR v_row.activity_date = v_prev_date + 1 THEN
      v_streak := v_streak + 1;
    ELSE
      v_streak := 1;
    END IF;

    IF v_streak > v_best THEN
      v_best := v_streak;
    END IF;

    v_prev_date := v_row.activity_date;
  END LOOP;

  IF v_current > v_best THEN
    v_best := v_current;
  END IF;

  RETURN QUERY SELECT v_current, v_best;
END;
$$;
