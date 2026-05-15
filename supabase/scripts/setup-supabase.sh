#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# setup-supabase.sh — Bootstrap a Supabase project from scratch.
#
# Usage:
#   ./supabase/scripts/setup-supabase.sh --project-ref <ref>
#
# What it does:
#   1. Links the Supabase CLI to the target project
#   2. Pushes all pending migrations
#   3. Deploys all Edge Functions
#   4. Configures secrets (RESEND_API_KEY)
#   5. Configures SMTP + email templates via Management API
#   6. Prints a checklist of manual steps (pg_cron, etc.)
#
# Requirements:
#   - supabase CLI
#   - jq (for JSON escaping of email templates)
#   - A Supabase Personal Access Token (supabase.com/dashboard/account/tokens)
# ---------------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/../templates"

# ── Helpers ─────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${BOLD}→ $*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

prompt_secret() {
  local name="$1"
  local description="$2"
  local value=""
  while [[ -z "$value" ]]; do
    echo -e "${BOLD}${name}${RESET} — ${description}"
    read -rsp "  Enter value (input hidden): " value
    echo
    [[ -z "$value" ]] && warn "Value cannot be empty."
  done
  echo "$value"
}

prompt_value() {
  local name="$1"
  local description="$2"
  local default="${3:-}"
  local value=""
  echo -e "${BOLD}${name}${RESET} — ${description}"
  if [[ -n "$default" ]]; then
    read -rp "  Enter value [${default}]: " value
    value="${value:-$default}"
  else
    while [[ -z "$value" ]]; do
      read -rp "  Enter value: " value
      [[ -z "$value" ]] && warn "Value cannot be empty."
    done
  fi
  echo "$value"
}

# ── Parse arguments ──────────────────────────────────────────────────────────

PROJECT_REF=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-ref) PROJECT_REF="$2"; shift 2 ;;
    *) error "Unknown argument: $1" ;;
  esac
done

[[ -z "$PROJECT_REF" ]] && error "Usage: $0 --project-ref <ref>"

# ── Check dependencies ───────────────────────────────────────────────────────

command -v supabase &>/dev/null || error "Supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
command -v jq &>/dev/null       || error "jq not found. Install: brew install jq"

# ── Step 1: Link project ─────────────────────────────────────────────────────

echo
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD} Livrux — Supabase project setup${RESET}"
echo -e "${BOLD} Project ref: ${PROJECT_REF}${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo

info "Step 1/5 — Linking project..."
supabase link --project-ref "$PROJECT_REF"
success "Project linked."

# ── Step 2: Push migrations ──────────────────────────────────────────────────

echo
info "Step 2/5 — Pushing migrations..."
supabase db push --yes
success "Migrations applied."

# ── Step 3: Deploy Edge Functions ────────────────────────────────────────────

echo
info "Step 3/5 — Deploying Edge Functions..."
FUNCTIONS=(accept-invitation delete-account invite-guardian search-reader)
for fn in "${FUNCTIONS[@]}"; do
  echo "  Deploying ${fn}..."
  supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
done
success "All Edge Functions deployed."

# ── Step 4: Configure secrets ────────────────────────────────────────────────

echo
info "Step 4/5 — Configuring secrets..."
echo "  The following secrets are required. Press Ctrl+C to skip any that"
echo "  are already configured (run 'supabase secrets list' to check)."
echo

RESEND_KEY=$(prompt_secret "RESEND_API_KEY" "Resend API key for sending invitation emails")
supabase secrets set RESEND_API_KEY="$RESEND_KEY" --project-ref "$PROJECT_REF"
success "RESEND_API_KEY set."

# ── Step 5: Configure SMTP + email templates ─────────────────────────────────

echo
info "Step 5/5 — Configuring SMTP and email templates..."
echo "  Requires a Supabase Personal Access Token."
echo "  Generate one at: https://supabase.com/dashboard/account/tokens"
echo

SUPABASE_PAT=$(prompt_secret "SUPABASE_PAT" "Personal Access Token")
SMTP_HOST=$(prompt_value    "SMTP_HOST"    "SMTP server host"    "smtp.resend.com")
SMTP_PORT=$(prompt_value    "SMTP_PORT"    "SMTP port"           "465")
SMTP_USER=$(prompt_value    "SMTP_USER"    "SMTP username"       "resend")
SMTP_PASS=$(prompt_secret   "SMTP_PASS"    "SMTP password (Resend API key or equivalent)")
SMTP_FROM=$(prompt_value    "SMTP_FROM"    "Sender email address (must be verified in Resend)")
SMTP_NAME=$(prompt_value    "SMTP_NAME"    "Sender display name" "Livrux")

CONFIRM_TEMPLATE=$(cat "$TEMPLATES_DIR/confirmSignin.html")
RESET_TEMPLATE=$(cat   "$TEMPLATES_DIR/resetPassword.html")

PAYLOAD=$(jq -n \
  --arg smtp_host         "$SMTP_HOST" \
  --argjson smtp_port     "$SMTP_PORT" \
  --arg smtp_user         "$SMTP_USER" \
  --arg smtp_pass         "$SMTP_PASS" \
  --arg smtp_admin_email  "$SMTP_FROM" \
  --arg smtp_sender_name  "$SMTP_NAME" \
  --arg confirm_subject   "Confirm your email · Confirme seu email · E-Mail bestätigen" \
  --arg confirm_content   "$CONFIRM_TEMPLATE" \
  --arg recovery_subject  "Reset your password · Redefinição de senha · Passwort zurücksetzen" \
  --arg recovery_content  "$RESET_TEMPLATE" \
  '{
    smtp_host:                              $smtp_host,
    smtp_port:                              $smtp_port,
    smtp_user:                              $smtp_user,
    smtp_pass:                              $smtp_pass,
    smtp_admin_email:                       $smtp_admin_email,
    smtp_sender_name:                       $smtp_sender_name,
    mailer_templates_confirmation_subject:  $confirm_subject,
    mailer_templates_confirmation_content:  $confirm_content,
    mailer_templates_recovery_subject:      $recovery_subject,
    mailer_templates_recovery_content:      $recovery_content
  }')

HTTP_STATUS=$(curl -s -o /tmp/supabase_smtp_response.json -w "%{http_code}" \
  -X PATCH \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if [[ "$HTTP_STATUS" == "200" ]]; then
  success "SMTP and email templates configured."
else
  warn "Management API returned HTTP ${HTTP_STATUS}. Response:"
  cat /tmp/supabase_smtp_response.json
  echo
  warn "SMTP configuration may not have been applied. Check the Supabase dashboard."
fi

# ── Done ─────────────────────────────────────────────────────────────────────

echo
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD} Setup complete!${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo
echo -e "${YELLOW}${BOLD}Manual steps required:${RESET}"
echo
echo "  1. Enable the pg_cron extension:"
echo "     Supabase Dashboard → Database → Extensions → pg_cron → Enable"
echo "     (Required for the weekly rate_limit_attempts cleanup job)"
echo
echo "  2. Verify the cron job was registered:"
echo "     SQL Editor → SELECT * FROM cron.job;"
echo
echo "  Done! The project is ready to use."
echo
