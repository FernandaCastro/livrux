import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// POST /functions/v1/accept-invitation
// Body: { token: string }
//
// 1. Validates the caller's JWT (accepting user must be logged in).
// 2. Looks up the invitation by token.
// 3. Validates: pending status, email match, not already a co-guardian.
// 4. Creates the co_guardian row linking the user to the owner.
// 5. Marks the invitation as accepted.

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  // ── 1. Identify the accepting user ────────────────────────────────────────
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: 'Unauthorized' }, 401);

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ── 2. Parse body ──────────────────────────────────────────────────────────
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const rawToken = (body.token ?? '').trim();
  if (!rawToken) return json({ error: 'Token is required' }, 400);

  // The token stored in DB is a UUID; the app may send just the first 8 chars
  // (as shown in the email). We search by prefix if the token is short.
  let invitation: Record<string, unknown> | null = null;

  if (rawToken.length === 8) {
    // Short code — look up via RPC to safely cast UUID → text in SQL.
    const { data, error: rpcError } = await adminClient
      .rpc('find_invitation_by_short_code', { p_code: rawToken.toLowerCase() });
    invitation = Array.isArray(data) && data.length > 0 ? data[0] : null;
  } else {
    const { data, error: qError } = await adminClient
      .from('guardian_invitations')
      .select('*')
      .eq('token', rawToken.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();
    invitation = data;
  }

  if (!invitation) {
    return json({ error: 'Invitation not found or already used' }, 404);
  }

  // ── 3. Validate invitation ─────────────────────────────────────────────────
  const invitedEmail = (invitation.email as string).toLowerCase();
  const callerEmail  = (user.email ?? '').toLowerCase();

  if (invitedEmail !== callerEmail) {
    return json({ error: 'This invitation was sent to a different email address' }, 403);
  }

  const ownerId = invitation.owner_id as string;

  // Prevent accepting your own invitation (owner inviting themselves).
  if (user.id === ownerId) {
    return json({ error: 'Cannot accept your own invitation' }, 400);
  }

  // Check if this user is already a co-guardian of any family.
  const { data: existingLink } = await adminClient
    .from('co_guardians')
    .select('owner_id')
    .eq('guardian_id', user.id)
    .maybeSingle();

  if (existingLink) {
    if (existingLink.owner_id === ownerId) {
      return json({ error: 'You are already a co-guardian of this family' }, 400);
    }
    return json({ error: 'You are already linked to another family' }, 400);
  }

  // ── 4. Create co_guardian link ─────────────────────────────────────────────
  const { error: insertError } = await adminClient
    .from('co_guardians')
    .insert({ owner_id: ownerId, guardian_id: user.id });

  if (insertError) {
    return json({ error: 'Failed to link account' }, 500);
  }

  // ── 5. Mark invitation as accepted ────────────────────────────────────────
  await adminClient
    .from('guardian_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id as string);

  return json({ success: true, owner_id: ownerId }, 200);
});

function json(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
