#!/usr/bin/env bash
# Build a clean Cloudflare Pages payload (runtime PWA only — no tests, no wrangler junk).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/typing-tutor"
OUT="$ROOT/.pages-out"

rm -rf "$OUT"
mkdir -p "$OUT"

cp "$SRC/index.html" "$SRC/style.css" "$SRC/manifest.webmanifest" "$SRC/sw.js" "$OUT/"
cp -R "$SRC/js" "$OUT/js"
cp -R "$SRC/icons" "$OUT/icons"

# Belt-and-suspenders: never ship tests if a path ever drifts.
rm -rf "$OUT/tests" "$OUT/js/tests" "$OUT/.wrangler"

echo "Staged Pages payload → $OUT"
find "$OUT" -type f | sort
