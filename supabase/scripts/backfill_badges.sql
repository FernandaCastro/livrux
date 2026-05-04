-- =============================================================================
-- Livrux — Badge backfill for pre-existing readers
--
-- Run this once in the Supabase SQL Editor (or via psql) after deploying
-- migrations 0018–0022. It awards every badge each reader already qualifies
-- for based on their historical books and reading sessions.
--
-- Safe to re-run: check_and_award_badges skips badges already earned.
-- =============================================================================

DO $$
DECLARE
  v_reader     RECORD;
  v_badge      RECORD;
  v_total      INTEGER := 0;
  v_readers_ct INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Livrux badge backfill starting ===';

  FOR v_reader IN
    SELECT id, name FROM public.readers ORDER BY created_at
  LOOP
    v_readers_ct := v_readers_ct + 1;

    -- Book-based and streak-based badges
    FOR v_badge IN
      SELECT awarded_slug, bonus_livrux
      FROM public.check_and_award_badges(v_reader.id)
    LOOP
      RAISE NOTICE 'Reader "%"  →  badge "%" awarded  (+% Livrux)',
        v_reader.name, v_badge.awarded_slug, v_badge.bonus_livrux;
      v_total := v_total + 1;
    END LOOP;

    -- Book-club badge (cross-reader, checked separately)
    PERFORM public.check_book_club_badge(v_reader.id);

  END LOOP;

  RAISE NOTICE '=== Backfill complete: % reader(s) processed, % badge(s) awarded ===',
    v_readers_ct, v_total;
END;
$$;
