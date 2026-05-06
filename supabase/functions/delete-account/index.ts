import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// DELETE /functions/v1/delete-account
//
// 1. Validates the caller's JWT.
// 2. Copies the consent record to consent_logs (GDPR 3-year retention).
// 3. Deletes the auth user — cascades to all public tables.

Deno.serve(async (req: Request) => {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  // ── 1. Identify the caller ──────────────────────────────────────────────
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

  // ── 2. Copy consent record to audit log before deletion ─────────────────
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('terms_accepted_at')
    .eq('id', user.id)
    .single();

  if (profile?.terms_accepted_at) {
    const now = new Date();
    const retainUntil = new Date(now);
    retainUntil.setFullYear(retainUntil.getFullYear() + 3);

    const { error: logError } = await adminClient
      .from('consent_logs')
      .insert({
        user_id:            user.id,
        email:              user.email ?? '',
        terms_accepted_at:  profile.terms_accepted_at,
        account_deleted_at: now.toISOString(),
        retain_until:       retainUntil.toISOString(),
      });

    if (logError) {
      // Log the error but don't block deletion — user's right to erasure
      // takes precedence over our internal audit logging.
      console.error('[delete-account] Failed to write consent log:', logError.message);
    }
  }

  // ── 3. Delete the auth user (cascades to all public tables) ─────────────
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('[delete-account] Failed to delete user:', deleteError.message);
    return json({ error: deleteError.message }, 500);
  }

  console.log('[delete-account] Deleted user:', user.id);
  return json({ success: true }, 200);
});

// ── helpers ────────────────────────────────────────────────────────────────
function json(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
