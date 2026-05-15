#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# setup-supabase.sh — Bootstrap a Supabase project from scratch.
#
# Usage:
#   ./scripts/setup-supabase.sh --project-ref <ref>
#
# What it does:
#   1. Links the Supabase CLI to the target project
#   2. Pushes all pending migrations
#   3. Deploys all Edge Functions
#   4. Prompts for secrets and sets them
#   5. Prints a checklist of manual steps (pg_cron, etc.)
# ---------------------------------------------------------------------------

set -euo pipefail

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

# ── Step 1: Link project ─────────────────────────────────────────────────────

echo
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD} Livrux — Supabase project setup${RESET}"
echo -e "${BOLD} Project ref: ${PROJECT_REF}${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo

info "Step 1/4 — Linking project..."
supabase link --project-ref "$PROJECT_REF"
success "Project linked."

# ── Step 2: Push migrations ──────────────────────────────────────────────────

echo
info "Step 2/4 — Pushing migrations..."
supabase db push --yes
success "Migrations applied."

# ── Step 3: Deploy Edge Functions ────────────────────────────────────────────

echo
info "Step 3/4 — Deploying Edge Functions..."
FUNCTIONS=(accept-invitation delete-account invite-guardian search-reader)
for fn in "${FUNCTIONS[@]}"; do
  echo "  Deploying ${fn}..."
  supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
done
success "All Edge Functions deployed."

# ── Step 4: Configure secrets ────────────────────────────────────────────────

echo
info "Step 4/4 — Configuring secrets..."
echo "  The following secrets are required. Press Ctrl+C to skip any that"
echo "  are already configured (run 'supabase secrets list' to check)."
echo

RESEND_KEY=$(prompt_secret "RESEND_API_KEY" "Resend API key for sending invitation emails")
supabase secrets set RESEND_API_KEY="$RESEND_KEY" --project-ref "$PROJECT_REF"
success "RESEND_API_KEY set."

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
