-- RPC used by the accept-invitation edge function to find a pending invitation
-- by its short code (first 8 hex chars of the UUID, case-insensitive).
-- Runs as SECURITY DEFINER so the edge function's service-role client can call
-- it without hitting RLS on guardian_invitations.

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
