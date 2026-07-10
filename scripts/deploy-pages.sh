#!/usr/bin/env bash
# Deploy only the runtime PWA assets (no tests, no .wrangler, no node junk).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/typing-tutor"
STAGE="${TMPDIR:-/tmp}/layer-tutor-deploy-$$"

cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

mkdir -p "$STAGE"
# Runtime surface only.
cp "$SRC/index.html" "$SRC/style.css" "$SRC/manifest.webmanifest" "$SRC/sw.js" "$STAGE/"
cp -R "$SRC/js" "$STAGE/js"
cp -R "$SRC/icons" "$STAGE/icons"
# Never ship tests or local wrangler state.
rm -rf "$STAGE/js/../tests" 2>/dev/null || true

echo "Deploying staged assets from $STAGE"
cd "$STAGE"
npx --yes wrangler pages deploy . --project-name layer-tutor --branch main
