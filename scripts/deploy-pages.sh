#!/usr/bin/env bash
# Local deploy: stage runtime assets, then wrangler pages deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/scripts/stage-pages.sh"

cd "$ROOT"
npx --yes wrangler pages deploy .pages-out --project-name layer-tutor --branch main
