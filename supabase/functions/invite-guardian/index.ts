import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// POST /functions/v1/invite-guardian
// Body: { email: string }
//
// 1. Validates the caller's JWT.
// 2. Resolves the family owner (works for both owners and co-guardians).
// 3. Creates a pending guardian_invitation row.
// 4. Sends an invitation email via Resend.
//
// Required secret: RESEND_API_KEY
// Set with: supabase secrets set RESEND_API_KEY=<key>

const SITE_URL = 'https://livrux.fecastro.com';
const FROM_EMAIL = 'livrux@fecastro.com';

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

  // ── 2. Parse and validate body ─────────────────────────────────────────────
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email address' }, 400);
  }

  // ── 3. Resolve family owner (supports co-guardians inviting too) ───────────
  const { data: coRow } = await adminClient
    .from('co_guardians')
    .select('owner_id')
    .eq('guardian_id', user.id)
    .maybeSingle();

  const ownerId = coRow?.owner_id ?? user.id;

  // Prevent inviting yourself or someone already in the family.
  if (email === user.email?.toLowerCase()) {
    return json({ error: 'Cannot invite yourself' }, 400);
  }

  const { data: existingGuardian } = await adminClient
    .from('co_guardians')
    .select('guardian_id')
    .eq('owner_id', ownerId)
    .limit(50);

  if (existingGuardian && existingGuardian.length > 0) {
    const guardianIds = existingGuardian.map((g: { guardian_id: string }) => g.guardian_id);
    const { data: guardianProfiles } = await adminClient.auth.admin.listUsers();
    const alreadyMember = guardianProfiles?.users.some(
      (u) => guardianIds.includes(u.id) && u.email?.toLowerCase() === email,
    );
    if (alreadyMember) {
      return json({ error: 'This person is already a co-guardian' }, 400);
    }
  }

  // Cancel any existing pending invitation for the same email+owner.
  await adminClient
    .from('guardian_invitations')
    .update({ status: 'cancelled' })
    .eq('owner_id', ownerId)
    .eq('email', email)
    .eq('status', 'pending');

  // ── 4. Create invitation ───────────────────────────────────────────────────
  const { data: invitation, error: insertError } = await adminClient
    .from('guardian_invitations')
    .insert({ owner_id: ownerId, email })
    .select('token')
    .single();

  if (insertError || !invitation) {
    console.error('[invite-guardian] Insert error:', insertError?.message);
    return json({ error: 'Failed to create invitation' }, 500);
  }

  // ── 5. Fetch inviter's display name for the email ─────────────────────────
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('display_name')
    .eq('id', ownerId)
    .maybeSingle();

  const inviterName = profile?.display_name ?? 'Someone';
  const token = (invitation as { token: string }).token;
  const inviteUrl = `${SITE_URL}/invite.html?token=${token}`;

  // ── 6. Send email via Resend ───────────────────────────────────────────────
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.error('[invite-guardian] RESEND_API_KEY not set');
    return json({ error: 'Email service not configured' }, 500);
  }

  const emailBody = buildEmailHtml(inviterName, inviteUrl, token);

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: `${inviterName} convidou você para o Livrux!`,
      html: emailBody,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error('[invite-guardian] Resend error:', errText);
    return json({ error: 'Failed to send invitation email' }, 500);
  }

  console.log('[invite-guardian] Invitation sent to', email, 'token:', token);
  return json({ success: true }, 200);
});

function buildEmailHtml(inviterName: string, inviteUrl: string, token: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Convite Livrux</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF7;font-family:'Nunito',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C3AED,#A855F7);padding:36px 40px;text-align:center;">
              <p style="margin:0;font-size:36px;">📚🪙</p>
              <h1 style="margin:12px 0 0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Livrux</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Leia. Ganhe. Recompense.</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#1E1B4B;font-size:22px;font-weight:700;">Você foi convidado! 🎉</h2>
              <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6;">
                <strong>${inviterName}</strong> convidou você para gerenciar a família no <strong>Livrux</strong> — o app que transforma leitura em recompensas para as crianças!
              </p>

              <!-- Token box -->
              <div style="background:#F3F0FF;border:2px dashed #A855F7;border-radius:16px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#6B7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Seu código de convite</p>
                <p style="margin:0;color:#7C3AED;font-size:28px;font-weight:800;letter-spacing:4px;font-family:monospace;">${token.toUpperCase().substring(0, 8)}</p>
              </div>

              <p style="margin:0 0 8px;color:#374151;font-size:15px;font-weight:600;">Como aceitar:</p>
              <ol style="margin:0 0 28px;padding-left:20px;color:#4B5563;font-size:15px;line-height:2;">
                <li>Baixe o Livrux no seu celular</li>
                <li>Crie sua conta ou entre se já tiver uma</li>
                <li>Vá em <strong>Configurações → Co-responsáveis</strong></li>
                <li>Toque em <strong>Aceitar convite</strong> e insira o código acima</li>
              </ol>

              <a href="${inviteUrl}"
                 style="display:block;background:#7C3AED;color:#ffffff;text-decoration:none;text-align:center;padding:16px 24px;border-radius:14px;font-size:16px;font-weight:700;margin-bottom:28px;">
                Conhecer o Livrux →
              </a>

              <p style="margin:0;color:#9CA3AF;font-size:13px;text-align:center;">
                Este convite é pessoal e intransferível. Se você não esperava receber este e-mail, pode ignorá-lo.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;padding:20px 40px;text-align:center;border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                © ${new Date().getFullYear()} Livrux • <a href="${SITE_URL}" style="color:#7C3AED;text-decoration:none;">livrux.fecastro.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function json(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
