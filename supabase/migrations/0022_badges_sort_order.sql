-- =============================================================================
-- Livrux — Badge sort order (easiest → hardest)
-- =============================================================================

ALTER TABLE public.badges ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 99;

UPDATE public.badges SET sort_order = CASE slug
  WHEN 'first_book'       THEN 1   -- 1 livro
  WHEN 'bookworm_5'       THEN 2   -- 5 livros
  WHEN 'page_hunter_500'  THEN 3   -- 500 páginas
  WHEN 'streak_7'         THEN 4   -- 7 dias seguidos
  WHEN 'bookworm_25'      THEN 5   -- 25 livros
  WHEN 'polyglot'         THEN 6   -- 3 livros em língua estrangeira
  WHEN 'book_club'        THEN 7   -- mesmo livro que um amigo
  WHEN 'streak_30'        THEN 8   -- 30 dias seguidos
  WHEN 'page_hunter_5000' THEN 9   -- 5.000 páginas
  WHEN 'centurion'        THEN 10  -- 100 livros
  ELSE 99
END;

CREATE INDEX idx_badges_sort_order ON public.badges (sort_order);
