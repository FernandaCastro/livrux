import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// POST /functions/v1/invite-guardian
// Body: { email: string, lang?: 'en' | 'pt' | 'de' }
//
// 1. Validates the caller's JWT.
// 2. Resolves the family owner (works for both owners and co-guardians).
// 3. Creates a pending guardian_invitation row.
// 4. Sends an invitation email via Resend in the requested language.
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
  let body: { email?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const lang  = (['en', 'pt', 'de'].includes(body.lang ?? '')) ? (body.lang as 'en' | 'pt' | 'de') : 'en';
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
    return json({ error: 'Email service not configured' }, 500);
  }

  const emailBody = buildEmailHtml(inviterName, inviteUrl, token, lang);
  const subject   = emailSubject(inviterName, lang);

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject,
      html: emailBody,
    }),
  });

  if (!resendRes.ok) {
    return json({ error: 'Failed to send invitation email' }, 500);
  }

  return json({ success: true }, 200);
});

// ── Email translations ────────────────────────────────────────────────────────

const EMAIL_I18N = {
  en: {
    tagline:   'Read. Earn. Reward.',
    title:     "You've been invited! 🎉",
    body:      (name: string) => `<strong>${name}</strong> invited you to manage the family on <strong>Livrux</strong> — the app that turns reading into rewards for kids!`,
    codeLabel: 'Your invitation code',
    stepsTitle:'How to accept:',
    steps: [
      'Download Livrux on your phone',
      'Create an account or sign in',
      'Go to <strong>Settings → Co-guardians</strong>',
      'Tap <strong>Accept invitation</strong> and enter the code above',
    ],
    cta:       'Learn about Livrux →',
    notice:    "This invitation is personal and non-transferable. If you didn't expect this email, you can safely ignore it.",
  },
  pt: {
    tagline:   'Leia. Ganhe. Recompense.',
    title:     'Você foi convidado! 🎉',
    body:      (name: string) => `<strong>${name}</strong> convidou você para gerenciar a família no <strong>Livrux</strong> — o app que transforma leitura em recompensas para as crianças!`,
    codeLabel: 'Seu código de convite',
    stepsTitle:'Como aceitar:',
    steps: [
      'Baixe o Livrux no seu celular',
      'Crie sua conta ou entre se já tiver uma',
      'Vá em <strong>Configurações → Co-responsáveis</strong>',
      'Toque em <strong>Aceitar convite</strong> e insira o código acima',
    ],
    cta:       'Conhecer o Livrux →',
    notice:    'Este convite é pessoal e intransferível. Se você não esperava receber este e-mail, pode ignorá-lo.',
  },
  de: {
    tagline:   'Lesen. Verdienen. Belohnen.',
    title:     'Du wurdest eingeladen! 🎉',
    body:      (name: string) => `<strong>${name}</strong> hat dich eingeladen, die Familie in <strong>Livrux</strong> zu verwalten — der App, die Lesen in Belohnungen für Kinder verwandelt!`,
    codeLabel: 'Dein Einladungscode',
    stepsTitle:'So nimmst du an:',
    steps: [
      'Lade Livrux auf dein Smartphone',
      'Erstelle ein Konto oder melde dich an',
      'Gehe zu <strong>Einstellungen → Mitverantwortliche</strong>',
      'Tippe auf <strong>Einladung annehmen</strong> und gib den Code oben ein',
    ],
    cta:       'Livrux kennenlernen →',
    notice:    'Diese Einladung ist persönlich und nicht übertragbar. Wenn du diese E-Mail nicht erwartet hast, kannst du sie einfach ignorieren.',
  },
} as const;

function emailSubject(inviterName: string, lang: 'en' | 'pt' | 'de'): string {
  const subjects = {
    en: `${inviterName} invited you to Livrux!`,
    pt: `${inviterName} convidou você para o Livrux!`,
    de: `${inviterName} hat dich zu Livrux eingeladen!`,
  };
  return subjects[lang];
}

function buildEmailHtml(
  inviterName: string,
  inviteUrl: string,
  token: string,
  lang: 'en' | 'pt' | 'de',
): string {
  const t   = EMAIL_I18N[lang];
  const shortCode = token.replace(/-/g, '').substring(0, 8).toUpperCase();
  const stepsHtml = t.steps
    .map((s) => `<li style="margin-bottom:8px;">${s}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Livrux</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF7;font-family:'Nunito',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C3AED,#A855F7);border-radius:24px;padding:36px 40px;text-align:center;">
              <h1 style="margin:12px 0 0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Livrux</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${t.tagline}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#1E1B4B;font-size:22px;font-weight:700;">${t.title}</h2>
              <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6;">${t.body(inviterName)}</p>

              <!-- Token box -->
              <div style="background:#F3F0FF;border:2px dashed #A855F7;border-radius:16px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#6B7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">${t.codeLabel}</p>
                <p style="margin:0;color:#7C3AED;font-size:28px;font-weight:800;letter-spacing:4px;font-family:monospace;">${shortCode}</p>
              </div>

              <p style="margin:0 0 8px;color:#374151;font-size:15px;font-weight:600;">${t.stepsTitle}</p>
              <ol style="margin:0 0 28px;padding-left:20px;color:#4B5563;font-size:15px;line-height:1.8;">${stepsHtml}</ol>

              <a href="${inviteUrl}"
                 style="display:block;background:#7C3AED;color:#ffffff;text-decoration:none;text-align:center;padding:16px 24px;border-radius:14px;font-size:16px;font-weight:700;margin-bottom:28px;">
                ${t.cta}
              </a>

              <p style="margin:0;color:#9CA3AF;font-size:13px;text-align:center;">${t.notice}</p>
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
