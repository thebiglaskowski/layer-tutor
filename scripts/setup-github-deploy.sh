#!/usr/bin/env bash
# One-time setup: store Cloudflare credentials as GitHub Actions secrets
# so every push to main auto-deploys to https://layer-tutor.pages.dev
set -euo pipefail

REPO="${REPO:-thebiglaskowski/layer-tutor}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-7c7e77ed222e182eca8404ff176eb6b8}"

echo "→ Setting CLOUDFLARE_ACCOUNT_ID on $REPO"
printf '%s' "$ACCOUNT_ID" | gh secret set CLOUDFLARE_ACCOUNT_ID -R "$REPO"

echo
echo "Create a Cloudflare API token with:"
echo "  Permission: Account → Cloudflare Pages → Edit"
echo "  Account resources: Include → Joe@thebiglaskowski.com's Account"
echo
echo "Quick link (sign in if needed):"
echo "  https://dash.cloudflare.com/profile/api-tokens"
echo "  → Create Token → Create Custom Token"
echo "  → Permissions: Account · Cloudflare Pages · Edit"
echo
echo "Paste the token below (input hidden), then press Enter:"
read -r -s TOKEN
echo
if [ -z "${TOKEN}" ]; then
  echo "No token entered — aborting." >&2
  exit 1
fi

printf '%s' "$TOKEN" | gh secret set CLOUDFLARE_API_TOKEN -R "$REPO"
echo "→ CLOUDFLARE_API_TOKEN saved"
echo
echo "Triggering a deploy workflow run…"
gh workflow run deploy.yml -R "$REPO" --ref main
echo
echo "Watch: gh run watch -R $REPO"
echo "Live:  https://layer-tutor.pages.dev"
