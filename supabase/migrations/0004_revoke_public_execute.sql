-- ---------------------------------------------------------------------------
-- Revoke EXECUTE from PUBLIC for all functions in the public schema.
--
-- PostgreSQL grants EXECUTE to PUBLIC by default for every new function,
-- which means anon (unauthenticated) users and any future role can call them.
-- The fix: revoke from PUBLIC, then keep explicit grants only where needed.
--
-- Groups:
-- A) Internal badge functions — already revoked from authenticated (0002),
--    but PUBLIC was missed. No re-grant needed (called only by other functions).
--
-- B) Functions intended for authenticated users only — revoke PUBLIC, keep
--    the authenticated grant from 0001. This blocks the anon role even though
--    the functions would fail internally without a valid auth.uid().
--
-- C) find_invitation_by_short_code — called only by the accept-invitation
--    Edge Function via service_role. Revoke from both PUBLIC and authenticated.
-- ---------------------------------------------------------------------------


-- ── A. Internal badge functions (no re-grant) ─────────────────────────────

REVOKE EXECUTE ON FUNCTION
  public.check_and_award_badges(UUID),
  public.check_book_club_badge(UUID),
  public.revoke_unqualified_badges(UUID)
FROM PUBLIC;


-- ── B. Authenticated-only functions ───────────────────────────────────────

REVOKE EXECUTE ON FUNCTION
  public.family_owner_id(),
  public.my_reader_ids(),
  public.calculate_streak(UUID),
  public.get_streak_info(UUID),
  public.log_reading_session(UUID, UUID, INTEGER, DATE),
  public.log_book(UUID, TEXT, TEXT, INTEGER, TEXT, NUMERIC, TEXT, DATE, DATE, TEXT, BOOLEAN, TEXT, TEXT),
  public.complete_book(UUID, DATE, NUMERIC, TEXT, TEXT),
  public.delete_book(UUID),
  public.update_book(UUID, TEXT, TEXT, INTEGER, TEXT, DATE, BOOLEAN, NUMERIC, TEXT, TEXT),
  public.spend_livrux(UUID, NUMERIC, TEXT)
FROM PUBLIC;

-- Re-grant explicitly to authenticated (PUBLIC revoke removes the implicit grant).
GRANT EXECUTE ON FUNCTION
  public.family_owner_id(),
  public.my_reader_ids(),
  public.calculate_streak(UUID),
  public.get_streak_info(UUID),
  public.log_reading_session(UUID, UUID, INTEGER, DATE),
  public.log_book(UUID, TEXT, TEXT, INTEGER, TEXT, NUMERIC, TEXT, DATE, DATE, TEXT, BOOLEAN, TEXT, TEXT),
  public.complete_book(UUID, DATE, NUMERIC, TEXT, TEXT),
  public.delete_book(UUID),
  public.update_book(UUID, TEXT, TEXT, INTEGER, TEXT, DATE, BOOLEAN, NUMERIC, TEXT, TEXT),
  public.spend_livrux(UUID, NUMERIC, TEXT)
TO authenticated;


-- ── C. Edge-Function-only (service_role) ──────────────────────────────────

REVOKE EXECUTE ON FUNCTION
  public.find_invitation_by_short_code(TEXT)
FROM PUBLIC, authenticated;
