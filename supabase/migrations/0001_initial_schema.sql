-- =============================================================================
-- Livrux — Initial database schema
-- Run this migration once in your Supabase SQL editor or via supabase db push.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. user_profiles
--    Extends auth.users with app-specific data.
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. reward_formulas
--    One formula per user account. Controls how many Livrux a reader earns.
--    coins = base_reward + (pages * per_page_rate) + bonuses
-- ---------------------------------------------------------------------------
CREATE TABLE public.reward_formulas (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_reward   NUMERIC(10,2) NOT NULL DEFAULT 5,
  per_page_rate NUMERIC(10,4) NOT NULL DEFAULT 0.1,
  bonus_rules   JSONB       NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE public.reward_formulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own formula"
  ON public.reward_formulas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own formula"
  ON public.reward_formulas FOR UPDATE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. readers
--    Each user can define multiple readers (e.g. their children).
-- ---------------------------------------------------------------------------
CREATE TABLE public.readers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  avatar_url      TEXT,
  livrux_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.readers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own readers"
  ON public.readers FOR ALL
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. books
--    Each book is linked to a reader and records earned Livrux.
--    user_id is denormalized here to simplify RLS without extra JOINs.
-- ---------------------------------------------------------------------------
CREATE TABLE public.books (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id      UUID        NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id),
  title          TEXT        NOT NULL,
  author         TEXT,
  total_pages    INTEGER     NOT NULL CHECK (total_pages > 0),
  cover_url      TEXT,
  livrux_earned  NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_completed DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own books"
  ON public.books FOR ALL
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. livrux_transactions
--    Immutable audit log of every Livrux credit/debit event.
-- ---------------------------------------------------------------------------
CREATE TABLE public.livrux_transactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id  UUID        NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id),
  book_id    UUID        REFERENCES public.books(id) ON DELETE SET NULL,
  amount     NUMERIC(10,2) NOT NULL, -- positive = earn, negative = spend
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.livrux_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own transactions"
  ON public.livrux_transactions FOR ALL
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. Atomic book-logging RPC
--    Inserts a book, creates a transaction, and updates the reader balance
--    in a single database transaction to prevent balance drift.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_book(
  p_reader_id    UUID,
  p_title        TEXT,
  p_author       TEXT,
  p_total_pages  INTEGER,
  p_cover_url    TEXT,
  p_livrux_earned NUMERIC,
  p_date_completed DATE,
  p_notes        TEXT
)
RETURNS UUID   -- returns the new book id
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id  UUID;
  v_book_id  UUID;
BEGIN
  -- Verify that the calling user owns this reader.
  SELECT user_id INTO v_user_id
  FROM public.readers
  WHERE id = p_reader_id AND user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reader not found or access denied';
  END IF;

  -- Insert the book record.
  INSERT INTO public.books (
    reader_id, user_id, title, author, total_pages,
    cover_url, livrux_earned, date_completed, notes
  ) VALUES (
    p_reader_id, v_user_id, p_title, p_author, p_total_pages,
    p_cover_url, p_livrux_earned, p_date_completed, p_notes
  ) RETURNING id INTO v_book_id;

  -- Record the Livrux transaction.
  INSERT INTO public.livrux_transactions (reader_id, user_id, book_id, amount, reason)
  VALUES (p_reader_id, v_user_id, v_book_id, p_livrux_earned, 'book_completed');

  -- Update the reader's balance atomically.
  UPDATE public.readers
  SET livrux_balance = livrux_balance + p_livrux_earned,
      updated_at = NOW()
  WHERE id = p_reader_id;

  RETURN v_book_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Sign-up trigger
--    Automatically creates user_profiles and reward_formulas rows when a
--    new user registers via Supabase Auth.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
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
-- 8. Storage buckets
--    Run these in the Supabase Storage section or via the CLI.
--    Included here as documentation; they cannot run in a plain SQL migration.
-- ---------------------------------------------------------------------------
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true);
--
-- Policy: authenticated users can upload to their own folder only.
-- CREATE POLICY "Owner can upload avatar"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Public can view avatars"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');
