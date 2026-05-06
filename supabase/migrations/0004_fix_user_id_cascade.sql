-- Fix missing ON DELETE CASCADE on user_id columns.
--
-- These tables have user_id REFERENCES auth.users(id) without a cascade action.
-- While the cascade via readers → books etc. should handle deletion in practice,
-- making the constraint explicit prevents any edge-case FK violation when
-- auth.users rows are deleted (e.g. via delete-account edge function).

ALTER TABLE public.books
  DROP CONSTRAINT books_user_id_fkey,
  ADD CONSTRAINT books_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.livrux_transactions
  DROP CONSTRAINT livrux_transactions_user_id_fkey,
  ADD CONSTRAINT livrux_transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.reading_sessions
  DROP CONSTRAINT reading_sessions_user_id_fkey,
  ADD CONSTRAINT reading_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.reader_badges
  DROP CONSTRAINT reader_badges_user_id_fkey,
  ADD CONSTRAINT reader_badges_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.xp_transactions
  DROP CONSTRAINT xp_transactions_user_id_fkey,
  ADD CONSTRAINT xp_transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
