-- =============================================================================
-- Livrux — Streaks & Badges
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. badges — static catalog seeded below
-- ---------------------------------------------------------------------------
CREATE TABLE public.badges (
  slug        TEXT PRIMARY KEY,
  name_key    TEXT NOT NULL, -- i18n key, e.g. "badges.first_book.name"
  description_key TEXT NOT NULL,
  icon        TEXT NOT NULL,
  tier        TEXT NOT NULL DEFAULT 'bronze'
                  CHECK (tier IN ('bronze', 'silver', 'gold'))
);

-- ---------------------------------------------------------------------------
-- 2. reader_badges — one row per (reader, badge) when earned
-- ---------------------------------------------------------------------------
CREATE TABLE public.reader_badges (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id    UUID        NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id),
  badge_slug   TEXT        NOT NULL REFERENCES public.badges(slug),
  earned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bonus_livrux NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE (reader_id, badge_slug)
);

CREATE INDEX idx_rb_reader ON public.reader_badges (reader_id);

ALTER TABLE public.reader_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own reader badges"
  ON public.reader_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reader badges"
  ON public.reader_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow friends to see each other's badges
CREATE POLICY "View accepted friend badges"
  ON public.reader_badges FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = reader_badges.reader_id OR rf.addressee_id = reader_badges.reader_id)
        AND EXISTS (
          SELECT 1 FROM public.readers my_r
          WHERE my_r.user_id = auth.uid()
            AND (my_r.id = rf.requester_id OR my_r.id = rf.addressee_id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Badge catalog seed
-- ---------------------------------------------------------------------------
INSERT INTO public.badges (slug, name_key, description_key, icon, tier) VALUES
  ('first_book',        'badges.first_book.name',        'badges.first_book.description',        '📖', 'bronze'),
  ('bookworm_5',        'badges.bookworm_5.name',        'badges.bookworm_5.description',        '🐛', 'bronze'),
  ('bookworm_25',       'badges.bookworm_25.name',       'badges.bookworm_25.description',       '🦋', 'silver'),
  ('centurion',         'badges.centurion.name',         'badges.centurion.description',         '🏆', 'gold'),
  ('page_hunter_500',   'badges.page_hunter_500.name',   'badges.page_hunter_500.description',   '📜', 'bronze'),
  ('page_hunter_5000',  'badges.page_hunter_5000.name',  'badges.page_hunter_5000.description',  '🗺️',  'gold'),
  ('polyglot',          'badges.polyglot.name',          'badges.polyglot.description',          '🌍', 'silver'),
  ('streak_7',          'badges.streak_7.name',          'badges.streak_7.description',          '🔥', 'bronze'),
  ('streak_30',         'badges.streak_30.name',         'badges.streak_30.description',         '⚡', 'gold'),
  ('book_club',         'badges.book_club.name',         'badges.book_club.description',         '🤝', 'silver');

-- ---------------------------------------------------------------------------
-- 4. calculate_streak(p_reader_id)
--    Returns the current active streak in days.
--
--    A "reading day" is any calendar date where the reader either:
--      a) completed a book with total_pages < 100  (short book), OR
--      b) logged a reading session (medium/long book)
--
--    The streak is the count of consecutive days ending today (or yesterday,
--    to avoid penalising readers who haven't logged yet today).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_streak(p_reader_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak      INTEGER := 0;
  v_check_date  DATE;
  v_has_activity BOOLEAN;
BEGIN
  -- Start checking from today; if today has no activity yet, allow yesterday
  -- as the anchor so the streak isn't broken by not having logged yet.
  v_check_date := CURRENT_DATE;

  -- If today has no activity, try starting from yesterday.
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

-- ---------------------------------------------------------------------------
-- 5. get_streak_info(p_reader_id)
--    Returns current streak + all-time best streak.
-- ---------------------------------------------------------------------------
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
  v_current := public.calculate_streak(p_reader_id);

  -- Compute best streak by walking all reading days in order.
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

  -- Current streak might exceed stored best if not yet persisted.
  IF v_current > v_best THEN
    v_best := v_current;
  END IF;

  RETURN QUERY SELECT v_current, v_best;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. check_and_award_badges(p_reader_id)
--    Evaluates all badge criteria for a reader and inserts any newly earned
--    badges. Returns the slugs of badges just awarded (empty if none).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_reader_id UUID)
RETURNS TABLE (awarded_slug TEXT, bonus_livrux NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID;
  v_book_count     BIGINT;
  v_total_pages    BIGINT;
  v_foreign_count  BIGINT;
  v_current_streak INTEGER;
  v_slug           TEXT;
  v_bonus          NUMERIC;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.readers WHERE id = p_reader_id;

  SELECT COUNT(*), COALESCE(SUM(total_pages), 0)
  INTO v_book_count, v_total_pages
  FROM public.books WHERE reader_id = p_reader_id;

  SELECT COUNT(*) INTO v_foreign_count
  FROM public.books WHERE reader_id = p_reader_id AND is_foreign_language = TRUE;

  v_current_streak := public.calculate_streak(p_reader_id);

  -- Evaluate each badge
  FOR v_slug, v_bonus IN (VALUES
    ('first_book',       5::NUMERIC),
    ('bookworm_5',      10::NUMERIC),
    ('bookworm_25',     25::NUMERIC),
    ('centurion',      100::NUMERIC),
    ('page_hunter_500',  5::NUMERIC),
    ('page_hunter_5000',50::NUMERIC),
    ('polyglot',        15::NUMERIC),
    ('streak_7',        10::NUMERIC),
    ('streak_30',       50::NUMERIC)
  ) LOOP
    -- Skip if already earned
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.reader_badges
      WHERE reader_id = p_reader_id AND badge_slug = v_slug
    );

    -- Check criterion
    IF  (v_slug = 'first_book'       AND v_book_count    >= 1)
     OR (v_slug = 'bookworm_5'       AND v_book_count    >= 5)
     OR (v_slug = 'bookworm_25'      AND v_book_count    >= 25)
     OR (v_slug = 'centurion'        AND v_book_count    >= 100)
     OR (v_slug = 'page_hunter_500'  AND v_total_pages   >= 500)
     OR (v_slug = 'page_hunter_5000' AND v_total_pages   >= 5000)
     OR (v_slug = 'polyglot'         AND v_foreign_count >= 3)
     OR (v_slug = 'streak_7'         AND v_current_streak >= 7)
     OR (v_slug = 'streak_30'        AND v_current_streak >= 30)
    THEN
      INSERT INTO public.reader_badges (reader_id, user_id, badge_slug, bonus_livrux)
      VALUES (p_reader_id, v_user_id, v_slug, v_bonus);

      -- Credit bonus Livrux atomically
      IF v_bonus > 0 THEN
        INSERT INTO public.livrux_transactions (reader_id, user_id, amount, reason)
        VALUES (p_reader_id, v_user_id, v_bonus, 'badge_' || v_slug);

        UPDATE public.readers
        SET livrux_balance = livrux_balance + v_bonus,
            updated_at = NOW()
        WHERE id = p_reader_id;
      END IF;

      awarded_slug := v_slug;
      bonus_livrux := v_bonus;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. book_club badge — awarded when two accepted friends have both logged
--    the same title (case-insensitive). Checked separately since it requires
--    cross-reader data.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_book_club_badge(p_reader_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_already BOOLEAN;
  v_earned  BOOLEAN := FALSE;
BEGIN
  SELECT user_id INTO v_user_id FROM public.readers WHERE id = p_reader_id;

  SELECT EXISTS (
    SELECT 1 FROM public.reader_badges
    WHERE reader_id = p_reader_id AND badge_slug = 'book_club'
  ) INTO v_already;

  IF v_already THEN RETURN FALSE; END IF;

  SELECT EXISTS (
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
  ) INTO v_earned;

  IF v_earned THEN
    INSERT INTO public.reader_badges (reader_id, user_id, badge_slug, bonus_livrux)
    VALUES (p_reader_id, v_user_id, 'book_club', 10)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.livrux_transactions (reader_id, user_id, amount, reason)
    VALUES (p_reader_id, v_user_id, 10, 'badge_book_club');

    UPDATE public.readers
    SET livrux_balance = livrux_balance + 10,
        updated_at = NOW()
    WHERE id = p_reader_id;
  END IF;

  RETURN v_earned;
END;
$$;
