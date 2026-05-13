-- =============================================================================
-- Livrux — Fix badge XP values for existing readers
--
-- Run once in the Supabase SQL Editor (or via psql) after deploying
-- 0013_reduce_badge_xp. Badge XP was reduced to 10% of original values;
-- this script corrects reader_badges.bonus_xp for already-awarded badges
-- and recalculates readers.xp from first principles.
--
-- readers.xp is always: SUM(books.xp_earned) + SUM(reader_badges.bonus_xp)
-- Recalculating from these sources is safer than applying per-row deltas.
--
-- Safe to re-run: idempotent — rows already at the correct value are skipped.
-- =============================================================================

DO $$
DECLARE
  v_badges_fixed  INTEGER := 0;
  v_readers_fixed INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Livrux XP correction starting ===';

  -- ── Step 1: Correct bonus_xp on already-awarded badges ───────────────────
  --
  -- Only updates rows where the stored value differs from the new target,
  -- so readers who never earned a badge are untouched.

  WITH new_xp (slug, xp) AS (
    VALUES
      ('first_book',         5),
      ('bookworm_5',        10),
      ('bookworm_25',       25),
      ('centurion',        100),
      ('page_hunter_500',    5),
      ('page_hunter_5000',  50),
      ('polyglot',          15),
      ('streak_7',          10),
      ('streak_30',         50),
      ('book_club',         10)
  )
  UPDATE public.reader_badges rb
  SET    bonus_xp = nx.xp
  FROM   new_xp nx
  WHERE  rb.badge_slug = nx.slug
    AND  rb.bonus_xp  <> nx.xp;

  GET DIAGNOSTICS v_badges_fixed = ROW_COUNT;
  RAISE NOTICE 'Step 1 — reader_badges rows corrected: %', v_badges_fixed;

  -- ── Step 2: Recalculate readers.xp from first principles ─────────────────
  --
  -- XP = total from completed books + total badge bonuses.
  -- GREATEST(..., 0) guards against any edge-case negative result.

  WITH correct_xp AS (
    SELECT
      r.id,
      GREATEST(
        COALESCE((SELECT SUM(b.xp_earned)  FROM public.books         b  WHERE b.reader_id  = r.id), 0)
      + COALESCE((SELECT SUM(rb.bonus_xp)  FROM public.reader_badges rb WHERE rb.reader_id = r.id), 0),
        0
      ) AS correct_xp
    FROM public.readers r
  )
  UPDATE public.readers r
  SET    xp         = cx.correct_xp,
         updated_at = NOW()
  FROM   correct_xp cx
  WHERE  r.id = cx.id
    AND  r.xp <> cx.correct_xp;

  GET DIAGNOSTICS v_readers_fixed = ROW_COUNT;
  RAISE NOTICE 'Step 2 — readers.xp values corrected: %', v_readers_fixed;

  RAISE NOTICE '=== XP correction complete ===';
END;
$$;
