import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// POST /functions/v1/search-reader
// Body: { code: string }
//
// Rate limit: 20 searches per hour per user_id.
// Wraps search_reader_by_code RPC, which is no longer granted to authenticated.

const RATE_LIMIT   = 20;
const WINDOW_HOURS = 1;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  // ── 1. Identify caller ─────────────────────────────────────────────────────
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

  // ── 2. Rate limit check ────────────────────────────────────────────────────
  const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const { count } = await adminClient
    .from('rate_limit_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('action', 'search_reader_by_code')
    .gte('attempted_at', windowStart);

  if ((count ?? 0) >= RATE_LIMIT) {
    return json({ error: 'Too many requests. Try again later.' }, 429);
  }

  await adminClient
    .from('rate_limit_attempts')
    .insert({ user_id: user.id, action: 'search_reader_by_code' });

  // ── 3. Parse and validate body ─────────────────────────────────────────────
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const code = (body.code ?? '').trim().toUpperCase();
  if (!code || code.length !== 6) {
    return json({ error: 'Code must be 6 characters' }, 400);
  }

  // ── 4. Call RPC via service role (bypasses revoked authenticated grant) ────
  const { data, error } = await adminClient.rpc('search_reader_by_code', { p_code: code });
  if (error) return json({ error: 'Search failed' }, 500);

  return json({ data: data ?? [] }, 200);
});

function json(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
