-- =============================================================================
-- Livrux — Complete schema (consolidated, release-ready)
--
-- Apply to a fresh Supabase project to reach the full baseline.
-- For an existing project that already has migrations applied, run:
--   supabase migration repair --status applied <timestamp>_0001_schema
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. user_profiles — extends auth.users with app-specific data.
CREATE TABLE public.user_profiles (
  id                       UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name             TEXT,
  avatar_url               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parental_pin             TEXT    DEFAULT NULL,
  parental_unlock_duration INTEGER NOT NULL DEFAULT 5,
  terms_accepted_at        TIMESTAMPTZ           -- nullable; pre-GDPR users have NULL
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- "Users can view their own or family members profile" added after co_guardians below.


-- 2. reward_formulas — one formula per family; controls Livrux earned per book.
CREATE TABLE public.reward_formulas (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_reward   NUMERIC(10,2) NOT NULL DEFAULT 5,
  per_page_rate NUMERIC(10,4) NOT NULL DEFAULT 0.1,
  bonus_rules   JSONB         NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE public.reward_formulas ENABLE ROW LEVEL SECURITY;

-- Policies added after family_owner_id() below.


-- 3. readers — each user (family) can have multiple readers (their children).
CREATE TABLE public.readers (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT          NOT NULL,
  livrux_balance   NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  pin              TEXT          DEFAULT NULL,
  friend_code      TEXT          UNIQUE,
  friends_autonomy BOOLEAN       NOT NULL DEFAULT FALSE,
  avatar_seed      TEXT,
  old_avatar_seed  TEXT,
  xp               INTEGER       NOT NULL DEFAULT 0,
  book_count       INTEGER       NOT NULL DEFAULT 0,
  CONSTRAINT readers_xp_non_negative CHECK (xp >= 0)
);

CREATE INDEX idx_readers_friend_code ON public.readers (friend_code);

ALTER TABLE public.readers ENABLE ROW LEVEL SECURITY;

-- Policies added after family_owner_id() and my_reader_ids() below.


-- 4. badges — static catalog, seeded below.
CREATE TABLE public.badges (
  slug            TEXT    PRIMARY KEY,
  name_key        TEXT    NOT NULL,
  description_key TEXT    NOT NULL,
  icon            TEXT    NOT NULL,
  tier            TEXT    NOT NULL DEFAULT 'bronze'
                              CHECK (tier IN ('bronze', 'silver', 'gold')),
  sort_order      INTEGER NOT NULL DEFAULT 99
);

CREATE INDEX idx_badges_sort_order ON public.badges (sort_order);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read badges catalog"
  ON public.badges FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.badges (slug, name_key, description_key, icon, tier, sort_order) VALUES
  ('first_book',       'badges.first_book.name',       'badges.first_book.description',       '📖', 'bronze',  1),
  ('bookworm_5',       'badges.bookworm_5.name',       'badges.bookworm_5.description',       '🐛', 'bronze',  2),
  ('page_hunter_500',  'badges.page_hunter_500.name',  'badges.page_hunter_500.description',  '📜', 'bronze',  3),
  ('streak_7',         'badges.streak_7.name',         'badges.streak_7.description',         '🔥', 'bronze',  4),
  ('bookworm_25',      'badges.bookworm_25.name',      'badges.bookworm_25.description',      '🦋', 'silver',  5),
  ('polyglot',         'badges.polyglot.name',         'badges.polyglot.description',         '🌍', 'silver',  6),
  ('book_club',        'badges.book_club.name',        'badges.book_club.description',        '🤝', 'silver',  7),
  ('streak_30',        'badges.streak_30.name',        'badges.streak_30.description',        '⚡', 'gold',    8),
  ('page_hunter_5000', 'badges.page_hunter_5000.name', 'badges.page_hunter_5000.description', '🗺️', 'gold',    9),
  ('centurion',        'badges.centurion.name',        'badges.centurion.description',        '🏆', 'gold',   10);


-- 5. books — each book belongs to a reader.
CREATE TABLE public.books (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id           UUID          NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  user_id             UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT          NOT NULL,
  author              TEXT,
  total_pages         INTEGER       NOT NULL CHECK (total_pages > 0),
  cover_url           TEXT,
  livrux_earned       NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_completed      TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  is_foreign_language BOOLEAN       NOT NULL DEFAULT FALSE,
  rating              TEXT          CHECK (rating IN ('disliked', 'liked', 'loved')),
  review              TEXT,
  status              TEXT          NOT NULL DEFAULT 'completed'
                                        CHECK (status IN ('reading', 'completed')),
  date_start          DATE          NOT NULL DEFAULT CURRENT_DATE,
  xp_earned           INTEGER       NOT NULL DEFAULT 0
);

CREATE INDEX idx_books_reader_status ON public.books (reader_id, status);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Policies added after family_owner_id() and my_reader_ids() below.


-- 6. livrux_transactions — immutable audit log of every Livrux credit/debit.
CREATE TABLE public.livrux_transactions (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id   UUID          NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id     UUID          REFERENCES public.books(id) ON DELETE SET NULL,
  amount      NUMERIC(10,2) NOT NULL,
  reason      TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.livrux_transactions ENABLE ROW LEVEL SECURITY;

-- Policy added after family_owner_id() below.


-- 7. reader_friendships
CREATE TABLE public.reader_friendships (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID    NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  addressee_id UUID    NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  status       TEXT    NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX idx_rf_requester ON public.reader_friendships (requester_id);
CREATE INDEX idx_rf_addressee ON public.reader_friendships (addressee_id);

ALTER TABLE public.reader_friendships ENABLE ROW LEVEL SECURITY;

-- Policies added after my_reader_ids() below.


-- 8. reading_sessions — daily reading progress for medium/long books.
CREATE TABLE public.reading_sessions (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id    UUID    NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  book_id      UUID    NOT NULL REFERENCES public.books(id)   ON DELETE CASCADE,
  user_id      UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  last_page    INTEGER NOT NULL CHECK (last_page > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reader_id, book_id, session_date)
);

CREATE INDEX idx_rs_reader_date ON public.reading_sessions (reader_id, session_date DESC);
CREATE INDEX idx_rs_book        ON public.reading_sessions (book_id);

ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

-- Policies added after family_owner_id() and my_reader_ids() below.


-- 9. reader_badges — one row per (reader, badge) earned.
CREATE TABLE public.reader_badges (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id  UUID        NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_slug TEXT        NOT NULL REFERENCES public.badges(slug),
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bonus_xp   INTEGER     NOT NULL DEFAULT 0,
  UNIQUE (reader_id, badge_slug)
);

CREATE INDEX idx_rb_reader ON public.reader_badges (reader_id);

ALTER TABLE public.reader_badges ENABLE ROW LEVEL SECURITY;

-- Policies added after family_owner_id() and my_reader_ids() below.


-- 10. consent_logs — GDPR/DSGVO audit log; intentionally no FK to auth.users
--     so the record survives account deletion (3-year retention, Art. 6 GDPR).
CREATE TABLE public.consent_logs (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL,
  email              TEXT        NOT NULL,
  terms_accepted_at  TIMESTAMPTZ,           -- nullable: pre-GDPR accounts have NULL
  account_deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retain_until       TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
-- No policies — only the service-role Edge Function can read/write this table.


-- 11. co_guardians — allows multiple auth users to share one family's data.
CREATE TABLE public.co_guardians (
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, guardian_id),
  CHECK (owner_id <> guardian_id)
);

CREATE UNIQUE INDEX co_guardians_unique_guardian ON public.co_guardians(guardian_id);

ALTER TABLE public.co_guardians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family can view co-guardians" ON public.co_guardians
  FOR SELECT
  USING (owner_id = auth.uid() OR guardian_id = auth.uid());

CREATE POLICY "family can remove co-guardians" ON public.co_guardians
  FOR DELETE
  USING (owner_id = auth.uid() OR guardian_id = auth.uid());


-- 12. guardian_invitations
CREATE TABLE public.guardian_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  token       UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status      TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

ALTER TABLE public.guardian_invitations ENABLE ROW LEVEL SECURITY;

-- Policies added after family_owner_id() below.


-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- ---------------------------------------------------------------------------
-- handle_new_user — creates user_profiles and reward_formulas on registration.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, terms_accepted_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    (NEW.raw_user_meta_data->>'terms_accepted_at')::TIMESTAMPTZ
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.reward_formulas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- generate_friend_code — unique 6-char alphanumeric code (no ambiguous chars).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT    := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code  TEXT;
  done  BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.readers WHERE friend_code = code) THEN
      done := TRUE;
    END IF;
  END LOOP;
  RETURN code;
END;
$$;


-- ---------------------------------------------------------------------------
-- set_friend_code trigger — auto-assigns friend_code on reader INSERT.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_friend_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.friend_code IS NULL THEN
    NEW.friend_code := public.generate_friend_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_reader_friend_code
  BEFORE INSERT ON public.readers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_friend_code();


-- ---------------------------------------------------------------------------
-- family_owner_id() — returns the root owner's user_id:
--   co-guardian → the owner they belong to; everyone else → their own uid.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.family_owner_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.co_guardians WHERE guardian_id = auth.uid() LIMIT 1),
    auth.uid()
  )
$$;


-- ---------------------------------------------------------------------------
-- my_reader_ids() — returns all reader IDs for the calling user's family.
-- SECURITY DEFINER breaks the readers ↔ reader_friendships RLS cycle.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_reader_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.readers WHERE user_id = public.family_owner_id();
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES (require family_owner_id / my_reader_ids)
-- ─────────────────────────────────────────────────────────────────────────────

-- user_profiles
CREATE POLICY "Users can view their own or family members profile"
  ON public.user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.co_guardians
      WHERE (owner_id = auth.uid() AND guardian_id = user_profiles.id)
         OR (guardian_id = auth.uid() AND owner_id = user_profiles.id)
    )
  );

-- reward_formulas
CREATE POLICY "family can read formula" ON public.reward_formulas
  FOR SELECT USING (public.family_owner_id() = user_id);

CREATE POLICY "family can update formula" ON public.reward_formulas
  FOR UPDATE USING (public.family_owner_id() = user_id);

-- readers
CREATE POLICY "family can manage readers" ON public.readers
  FOR ALL
  USING    (public.family_owner_id() = user_id)
  WITH CHECK (public.family_owner_id() = user_id);

CREATE POLICY "View accepted friend readers" ON public.readers
  FOR SELECT
  USING (
    public.family_owner_id() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = readers.id OR rf.addressee_id = readers.id)
        AND (
          rf.requester_id IN (SELECT public.my_reader_ids())
          OR rf.addressee_id IN (SELECT public.my_reader_ids())
        )
    )
  );

CREATE POLICY "View pending friend request readers" ON public.readers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'pending'
        AND rf.requester_id = readers.id
        AND rf.addressee_id IN (SELECT public.my_reader_ids())
    )
  );

-- books
CREATE POLICY "family can manage books" ON public.books
  FOR ALL
  USING    (public.family_owner_id() = user_id)
  WITH CHECK (public.family_owner_id() = user_id);

CREATE POLICY "View accepted friend books" ON public.books
  FOR SELECT
  USING (
    public.family_owner_id() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = books.reader_id OR rf.addressee_id = books.reader_id)
        AND (
          rf.requester_id IN (SELECT public.my_reader_ids())
          OR rf.addressee_id IN (SELECT public.my_reader_ids())
        )
    )
  );

-- livrux_transactions
CREATE POLICY "family can manage transactions" ON public.livrux_transactions
  FOR ALL
  USING    (public.family_owner_id() = user_id)
  WITH CHECK (public.family_owner_id() = user_id);

-- reader_friendships
CREATE POLICY "View own reader friendships" ON public.reader_friendships
  FOR SELECT
  USING (
    requester_id IN (SELECT public.my_reader_ids())
    OR addressee_id IN (SELECT public.my_reader_ids())
  );

CREATE POLICY "Send friend requests" ON public.reader_friendships
  FOR INSERT
  WITH CHECK (
    requester_id IN (SELECT public.my_reader_ids())
  );

CREATE POLICY "Respond to friend requests" ON public.reader_friendships
  FOR UPDATE
  USING (
    addressee_id IN (SELECT public.my_reader_ids())
  );

CREATE POLICY "Remove friendships" ON public.reader_friendships
  FOR DELETE
  USING (
    requester_id IN (SELECT public.my_reader_ids())
    OR addressee_id IN (SELECT public.my_reader_ids())
  );

-- reading_sessions
CREATE POLICY "family can manage reading sessions" ON public.reading_sessions
  FOR ALL
  USING    (public.family_owner_id() = user_id)
  WITH CHECK (public.family_owner_id() = user_id);

CREATE POLICY "View accepted friend reading sessions" ON public.reading_sessions
  FOR SELECT
  USING (
    public.family_owner_id() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = reading_sessions.reader_id OR rf.addressee_id = reading_sessions.reader_id)
        AND (
          rf.requester_id IN (SELECT public.my_reader_ids())
          OR rf.addressee_id IN (SELECT public.my_reader_ids())
        )
    )
  );

-- reader_badges
CREATE POLICY "family can read reader badges" ON public.reader_badges
  FOR SELECT USING (public.family_owner_id() = user_id);

CREATE POLICY "family can insert reader badges" ON public.reader_badges
  FOR INSERT WITH CHECK (public.family_owner_id() = user_id);

CREATE POLICY "View accepted friend badges" ON public.reader_badges
  FOR SELECT
  USING (
    public.family_owner_id() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = reader_badges.reader_id OR rf.addressee_id = reader_badges.reader_id)
        AND (
          rf.requester_id IN (SELECT public.my_reader_ids())
          OR rf.addressee_id IN (SELECT public.my_reader_ids())
        )
    )
  );

-- guardian_invitations
CREATE POLICY "family can view invitations" ON public.guardian_invitations
  FOR SELECT
  USING (public.family_owner_id() = owner_id);

CREATE POLICY "family can create invitations" ON public.guardian_invitations
  FOR INSERT
  WITH CHECK (public.family_owner_id() = owner_id);

CREATE POLICY "family can cancel invitations" ON public.guardian_invitations
  FOR UPDATE
  USING (public.family_owner_id() = owner_id)
  WITH CHECK (public.family_owner_id() = owner_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- BUSINESS LOGIC FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- ---------------------------------------------------------------------------
-- calculate_streak — current active reading streak in days.
-- A "reading day" = a short book completed (<100 pp) OR a reading session logged.
-- Allows yesterday as anchor so the streak isn't broken before today's log.
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- get_streak_info — returns current streak and all-time best streak.
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


-- ---------------------------------------------------------------------------
-- search_reader_by_code — finds a reader by friend code.
-- SECURITY DEFINER allows any authenticated user to discover a reader.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_reader_by_code(p_code TEXT)
RETURNS TABLE (id UUID, name TEXT, avatar_seed TEXT, book_count BIGINT, xp INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.avatar_seed,
    r.book_count::BIGINT,
    r.xp
  FROM public.readers r
  WHERE r.friend_code = p_code;
$$;


-- ---------------------------------------------------------------------------
-- check_and_award_badges — evaluates all badge criteria and awards new badges.
-- Returns (awarded_slug, bonus_xp) for each badge just awarded.
-- XP values are 10% of original to keep rewards balanced.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_reader_id UUID)
RETURNS TABLE (awarded_slug TEXT, bonus_xp INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID;
  v_book_count     BIGINT;
  v_total_pages    BIGINT;
  v_foreign_count  BIGINT;
  v_current_streak INTEGER;
  v_slug           TEXT;
  v_xp             INTEGER;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.readers WHERE id = p_reader_id;

  SELECT COUNT(*), COALESCE(SUM(total_pages), 0)
  INTO v_book_count, v_total_pages
  FROM public.books WHERE reader_id = p_reader_id;

  SELECT COUNT(*) INTO v_foreign_count
  FROM public.books WHERE reader_id = p_reader_id AND is_foreign_language = TRUE;

  v_current_streak := public.calculate_streak(p_reader_id);

  FOR v_slug, v_xp IN (VALUES
    ('first_book',           5),
    ('bookworm_5',          10),
    ('bookworm_25',         25),
    ('centurion',          100),
    ('page_hunter_500',      5),
    ('page_hunter_5000',    50),
    ('polyglot',            15),
    ('streak_7',            10),
    ('streak_30',           50)
  ) LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.reader_badges
      WHERE reader_id = p_reader_id AND badge_slug = v_slug
    );

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
      INSERT INTO public.reader_badges (reader_id, user_id, badge_slug, bonus_xp)
      VALUES (p_reader_id, v_user_id, v_slug, v_xp);

      UPDATE public.readers
      SET xp = xp + v_xp, updated_at = NOW()
      WHERE id = p_reader_id;

      awarded_slug := v_slug;
      bonus_xp     := v_xp;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;


-- ---------------------------------------------------------------------------
-- check_book_club_badge — awards book_club when two accepted friends have
-- logged the same title (case-insensitive). Returns TRUE if just awarded.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_book_club_badge(p_reader_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
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
    INSERT INTO public.reader_badges (reader_id, user_id, badge_slug, bonus_xp)
    VALUES (p_reader_id, v_user_id, 'book_club', 10)
    ON CONFLICT DO NOTHING;

    UPDATE public.readers
    SET xp = xp + 10, updated_at = NOW()
    WHERE id = p_reader_id;
  END IF;

  RETURN v_earned;
END;
$$;


-- ---------------------------------------------------------------------------
-- revoke_unqualified_badges — called after a book is deleted.
-- Revokes any badges no longer earned and deducts their XP (floor: 0).
-- Returns (revoked_slug, penalty_xp) for each revoked badge.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_unqualified_badges(p_reader_id UUID)
RETURNS TABLE (revoked_slug TEXT, penalty_xp INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id         UUID;
  v_book_count      BIGINT;
  v_total_pages     BIGINT;
  v_foreign_count   BIGINT;
  v_current_streak  INTEGER;
  v_rb              RECORD;
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


-- ---------------------------------------------------------------------------
-- log_reading_session — upserts a daily reading session.
-- Awards XP = pages advanced for long books (> 100 pages).
-- Returns { xp_earned: <int> }.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_reading_session(
  p_reader_id UUID,
  p_book_id   UUID,
  p_last_page INTEGER,
  p_date      DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id             UUID;
  v_total_pages         INTEGER;
  v_previous_last_page  INTEGER;
  v_pages_delta         INTEGER;
  v_xp_earned           INTEGER := 0;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.readers
  WHERE id = p_reader_id AND user_id = public.family_owner_id();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reader not found or access denied';
  END IF;

  SELECT total_pages INTO v_total_pages
  FROM public.books
  WHERE id = p_book_id AND reader_id = p_reader_id;

  SELECT COALESCE(
    (SELECT last_page FROM public.reading_sessions
      WHERE reader_id = p_reader_id AND book_id = p_book_id
        AND session_date = p_date),
    (SELECT last_page FROM public.reading_sessions
      WHERE reader_id = p_reader_id AND book_id = p_book_id
        AND session_date < p_date
      ORDER BY session_date DESC LIMIT 1),
    0
  ) INTO v_previous_last_page;

  INSERT INTO public.reading_sessions (reader_id, book_id, user_id, session_date, last_page)
  VALUES (p_reader_id, p_book_id, v_user_id, p_date, p_last_page)
  ON CONFLICT (reader_id, book_id, session_date)
  DO UPDATE SET last_page = EXCLUDED.last_page;

  IF v_total_pages > 100 THEN
    v_pages_delta := GREATEST(p_last_page - v_previous_last_page, 0);
    v_xp_earned   := v_pages_delta;

    IF v_xp_earned > 0 THEN
      UPDATE public.books
      SET xp_earned = xp_earned + v_xp_earned
      WHERE id = p_book_id;

      UPDATE public.readers
      SET xp = xp + v_xp_earned, updated_at = NOW()
      WHERE id = p_reader_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('xp_earned', v_xp_earned);
END;
$$;


-- ---------------------------------------------------------------------------
-- log_book — inserts a book, awards Livrux (if completed), awards XP,
-- checks badges. Returns { book_id, awarded_badges, xp_earned }.
-- XP = total_pages for any book added directly as completed (no sessions).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_book(
  p_reader_id           UUID,
  p_title               TEXT,
  p_author              TEXT,
  p_total_pages         INTEGER,
  p_cover_url           TEXT,
  p_livrux_earned       NUMERIC,
  p_status              TEXT    DEFAULT 'completed',
  p_date_start          DATE    DEFAULT CURRENT_DATE,
  p_date_completed      DATE    DEFAULT NULL,
  p_notes               TEXT    DEFAULT NULL,
  p_is_foreign_language BOOLEAN DEFAULT FALSE,
  p_rating              TEXT    DEFAULT NULL,
  p_review              TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_book_id   UUID;
  v_badges    JSONB   := '[]'::JSONB;
  v_badge_row RECORD;
  v_xp_earned INTEGER := 0;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.readers
  WHERE id = p_reader_id AND user_id = public.family_owner_id();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reader not found or access denied';
  END IF;

  IF p_status = 'completed' THEN
    v_xp_earned := p_total_pages;
  END IF;

  INSERT INTO public.books (
    reader_id, user_id, title, author, total_pages,
    cover_url, livrux_earned, status, date_start, date_completed,
    notes, is_foreign_language, rating, review, xp_earned
  ) VALUES (
    p_reader_id, v_user_id, p_title, p_author, p_total_pages,
    p_cover_url,
    CASE WHEN p_status = 'completed' THEN p_livrux_earned ELSE 0 END,
    p_status, p_date_start, p_date_completed,
    p_notes, p_is_foreign_language,
    CASE WHEN p_status = 'completed' THEN p_rating ELSE NULL END,
    CASE WHEN p_status = 'completed' THEN p_review ELSE NULL END,
    v_xp_earned
  ) RETURNING id INTO v_book_id;

  IF p_status = 'completed' THEN
    UPDATE public.readers
    SET book_count = book_count + 1,
        xp         = xp + v_xp_earned,
        updated_at = NOW()
    WHERE id = p_reader_id;
  END IF;

  IF p_status = 'completed' AND p_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason, description)
    VALUES (p_reader_id, v_user_id, v_book_id, p_livrux_earned, 'book_completed', p_title);

    UPDATE public.readers
    SET livrux_balance = livrux_balance + p_livrux_earned,
        updated_at     = NOW()
    WHERE id = p_reader_id;
  END IF;

  IF p_status = 'completed' THEN
    FOR v_badge_row IN
      SELECT awarded_slug, bonus_xp
      FROM public.check_and_award_badges(p_reader_id)
    LOOP
      v_badges := v_badges || jsonb_build_object(
        'slug',     v_badge_row.awarded_slug,
        'bonus_xp', v_badge_row.bonus_xp
      );
    END LOOP;

    IF public.check_book_club_badge(p_reader_id) THEN
      v_badges := v_badges || jsonb_build_object(
        'slug',     'book_club',
        'bonus_xp', 10
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'book_id',        v_book_id,
    'awarded_badges', v_badges,
    'xp_earned',      v_xp_earned
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- complete_book — transitions a 'reading' book to 'completed', awards
-- Livrux and XP, checks badges. Returns { awarded_badges, xp_earned }.
-- Short books: XP = total_pages. Long books: XP = remaining pages after
-- last session (tops up books.xp_earned to equal total_pages).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_book(
  p_book_id        UUID,
  p_date_completed DATE,
  p_livrux_earned  NUMERIC,
  p_rating         TEXT,
  p_review         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_id    UUID;
  v_user_id      UUID;
  v_title        TEXT;
  v_status       TEXT;
  v_total_pages  INTEGER;
  v_last_page    INTEGER := 0;
  v_badges       JSONB   := '[]'::JSONB;
  v_badge_row    RECORD;
  v_xp_earned    INTEGER := 0;
BEGIN
  SELECT reader_id, user_id, title, status, total_pages
  INTO v_reader_id, v_user_id, v_title, v_status, v_total_pages
  FROM public.books
  WHERE id = p_book_id AND user_id = public.family_owner_id();

  IF v_reader_id IS NULL THEN
    RAISE EXCEPTION 'Book not found or access denied';
  END IF;

  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'Book is already completed';
  END IF;

  IF v_total_pages <= 100 THEN
    v_xp_earned := v_total_pages;
  ELSE
    SELECT COALESCE(last_page, 0) INTO v_last_page
    FROM public.reading_sessions
    WHERE book_id = p_book_id AND reader_id = v_reader_id
    ORDER BY session_date DESC
    LIMIT 1;

    v_xp_earned := GREATEST(v_total_pages - v_last_page, 0);
  END IF;

  UPDATE public.books
  SET status         = 'completed',
      date_completed = p_date_completed,
      livrux_earned  = p_livrux_earned,
      rating         = p_rating,
      review         = p_review,
      xp_earned      = xp_earned + v_xp_earned
  WHERE id = p_book_id;

  UPDATE public.readers
  SET book_count = book_count + 1,
      xp         = xp + v_xp_earned,
      updated_at = NOW()
  WHERE id = v_reader_id;

  IF p_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason, description)
    VALUES (v_reader_id, v_user_id, p_book_id, p_livrux_earned, 'book_completed', v_title);

    UPDATE public.readers
    SET livrux_balance = livrux_balance + p_livrux_earned,
        updated_at     = NOW()
    WHERE id = v_reader_id;
  END IF;

  FOR v_badge_row IN
    SELECT awarded_slug, bonus_xp
    FROM public.check_and_award_badges(v_reader_id)
  LOOP
    v_badges := v_badges || jsonb_build_object(
      'slug',     v_badge_row.awarded_slug,
      'bonus_xp', v_badge_row.bonus_xp
    );
  END LOOP;

  IF public.check_book_club_badge(v_reader_id) THEN
    v_badges := v_badges || jsonb_build_object(
      'slug',     'book_club',
      'bonus_xp', 10
    );
  END IF;

  RETURN jsonb_build_object(
    'awarded_badges', v_badges,
    'xp_earned',      v_xp_earned
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- delete_book — deletes a book, deducts its Livrux and XP, revokes badges.
-- Returns { revoked_badges: [{slug, penalty_xp}] }.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_book(p_book_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_id     UUID;
  v_user_id       UUID;
  v_title         TEXT;
  v_status        TEXT;
  v_livrux_earned NUMERIC;
  v_xp_earned     INTEGER;
  v_revoked       JSONB := '[]'::JSONB;
  v_row           RECORD;
BEGIN
  SELECT reader_id, user_id, title, status, livrux_earned, xp_earned
  INTO v_reader_id, v_user_id, v_title, v_status, v_livrux_earned, v_xp_earned
  FROM public.books
  WHERE id = p_book_id AND user_id = public.family_owner_id();

  IF v_reader_id IS NULL THEN
    RAISE EXCEPTION 'Book not found or access denied';
  END IF;

  DELETE FROM public.books WHERE id = p_book_id;

  IF v_status = 'completed' THEN
    UPDATE public.readers
    SET book_count = book_count - 1,
        updated_at = NOW()
    WHERE id = v_reader_id;
  END IF;

  IF v_xp_earned > 0 THEN
    UPDATE public.readers
    SET xp         = GREATEST(0, xp - v_xp_earned),
        updated_at = NOW()
    WHERE id = v_reader_id;
  END IF;

  IF v_livrux_earned > 0 THEN
    INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason, description)
    VALUES (v_reader_id, v_user_id, NULL, -v_livrux_earned, 'book_deleted', v_title);

    UPDATE public.readers
    SET livrux_balance = livrux_balance - v_livrux_earned,
        updated_at     = NOW()
    WHERE id = v_reader_id;
  END IF;

  FOR v_row IN
    SELECT revoked_slug, penalty_xp
    FROM public.revoke_unqualified_badges(v_reader_id)
  LOOP
    v_revoked := v_revoked || jsonb_build_object(
      'slug',       v_row.revoked_slug,
      'penalty_xp', v_row.penalty_xp
    );
  END LOOP;

  RETURN jsonb_build_object('revoked_badges', v_revoked);
END;
$$;


-- ---------------------------------------------------------------------------
-- update_book — updates editable book fields and records the Livrux delta.
-- Only inserts a transaction when the Livrux amount actually changed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_book(
  p_book_id             UUID,
  p_title               TEXT,
  p_author              TEXT,
  p_total_pages         INTEGER,
  p_cover_url           TEXT,
  p_date_completed      DATE,
  p_is_foreign_language BOOLEAN,
  p_livrux_earned       NUMERIC,
  p_rating              TEXT DEFAULT NULL,
  p_review              TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_id  UUID;
  v_user_id    UUID;
  v_old_livrux NUMERIC;
  v_delta      NUMERIC;
BEGIN
  SELECT reader_id, user_id, livrux_earned
  INTO v_reader_id, v_user_id, v_old_livrux
  FROM public.books
  WHERE id = p_book_id AND user_id = public.family_owner_id();

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
    livrux_earned       = p_livrux_earned,
    rating              = p_rating,
    review              = p_review
  WHERE id = p_book_id;

  IF v_delta <> 0 THEN
    INSERT INTO public.livrux_transactions
      (reader_id, user_id, book_id, amount, reason, description)
    VALUES
      (v_reader_id, v_user_id, p_book_id, v_delta, 'book_updated', p_title);

    UPDATE public.readers
    SET livrux_balance = livrux_balance + v_delta,
        updated_at     = NOW()
    WHERE id = v_reader_id;
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- spend_livrux — logs a real-life Livrux expense. p_amount is positive.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spend_livrux(
  p_reader_id   UUID,
  p_amount      NUMERIC,
  p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
BEGIN
  SELECT user_id, livrux_balance
  INTO v_user_id, v_balance
  FROM public.readers
  WHERE id = p_reader_id AND user_id = public.family_owner_id();

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
      updated_at     = NOW()
  WHERE id = p_reader_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- find_invitation_by_short_code — used by the accept-invitation Edge Function
-- to find a pending invitation by the first 8 hex chars of its UUID token.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_invitation_by_short_code(p_code TEXT)
RETURNS SETOF public.guardian_invitations
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM   public.guardian_invitations
  WHERE  status = 'pending'
  AND    token::text ILIKE p_code || '%'
  LIMIT  1;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- Required so the authenticated/anon roles pass the PostgreSQL permission check
-- before RLS policies are evaluated. consent_logs is intentionally excluded —
-- it has no RLS policies, so only the service role (Edge Function) can access it.
-- ─────────────────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON public.badges TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.user_profiles,
  public.reward_formulas,
  public.readers,
  public.books,
  public.livrux_transactions,
  public.reader_friendships,
  public.reading_sessions,
  public.reader_badges,
  public.co_guardians,
  public.guardian_invitations
TO authenticated;

GRANT EXECUTE ON FUNCTION
  public.family_owner_id(),
  public.my_reader_ids(),
  public.calculate_streak(UUID),
  public.get_streak_info(UUID),
  public.search_reader_by_code(TEXT),
  public.check_and_award_badges(UUID),
  public.check_book_club_badge(UUID),
  public.revoke_unqualified_badges(UUID),
  public.log_reading_session(UUID, UUID, INTEGER, DATE),
  public.log_book(UUID, TEXT, TEXT, INTEGER, TEXT, NUMERIC, TEXT, DATE, DATE, TEXT, BOOLEAN, TEXT, TEXT),
  public.complete_book(UUID, DATE, NUMERIC, TEXT, TEXT),
  public.delete_book(UUID),
  public.update_book(UUID, TEXT, TEXT, INTEGER, TEXT, DATE, BOOLEAN, NUMERIC, TEXT, TEXT),
  public.spend_livrux(UUID, NUMERIC, TEXT),
  public.find_invitation_by_short_code(TEXT)
TO authenticated;
