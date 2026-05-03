-- =============================================================================
-- Livrux — Reading sessions
-- Tracks daily reading progress for medium (100–300 pp) and long (300+ pp)
-- books so that streak calculations have day-level granularity.
-- =============================================================================

CREATE TABLE public.reading_sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id    UUID        NOT NULL REFERENCES public.readers(id) ON DELETE CASCADE,
  book_id      UUID        NOT NULL REFERENCES public.books(id)   ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id),
  session_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  pages_read   INTEGER     NOT NULL CHECK (pages_read > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reader_id, book_id, session_date)
);

CREATE INDEX idx_rs_reader_date ON public.reading_sessions (reader_id, session_date DESC);
CREATE INDEX idx_rs_book        ON public.reading_sessions (book_id);

ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reading sessions"
  ON public.reading_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Allow viewing sessions of accepted friend readers (same pattern as books)
CREATE POLICY "View accepted friend reading sessions"
  ON public.reading_sessions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'accepted'
        AND (rf.requester_id = reading_sessions.reader_id OR rf.addressee_id = reading_sessions.reader_id)
        AND EXISTS (
          SELECT 1 FROM public.readers my_r
          WHERE my_r.user_id = auth.uid()
            AND (my_r.id = rf.requester_id OR my_r.id = rf.addressee_id)
        )
    )
  );
