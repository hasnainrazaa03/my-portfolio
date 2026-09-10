#!/usr/bin/env bash
# buildInterSubset.sh — regenerate public/fonts/inter-var-latin.woff2.
#
# The shipped file is a build artifact, committed because it never changes and
# because a font download does not belong in `npm install`. This records
# exactly how it was produced so it can be reproduced or upgraded.
#
# REQUIRES python3 with `fonttools` and `brotli` (brotli is what encodes woff2):
#   python3 -m venv /tmp/fontenv && /tmp/fontenv/bin/pip install fonttools brotli
#   PY=/tmp/fontenv/bin/python bash scripts/buildInterSubset.sh
#
# Two savings, both worth knowing:
#   - Instancing the weight axis to 400-700 (the four weights the UI actually
#     uses: normal, medium, semibold, bold) rather than Google's 400-800.
#   - Subsetting to the latin unicode range and dropping OpenType features the
#     UI never triggers, keeping kern/liga/calt.
# Together: 48,432 -> 24,940 bytes. Four static instances would cost 63,084,
# so the variable font is both smaller and more flexible.
#
# fonts.test.js guards the result: the file must exist, be woff2, and stay
# within budget.
set -euo pipefail

PY="${PY:-python3}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/fonts/inter-var-latin.woff2"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Google's own latin subset of Inter v20, variable, weights 400-800.
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
CSS="$(curl -sS -A "$UA" 'https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap')"
URL="$(printf '%s' "$CSS" | awk '/\/\* latin \*\//{f=1} f&&/url\(/{print; exit}' | sed -E 's/.*url\(([^)]+)\).*/\1/')"
[ -n "$URL" ] || { echo "could not find the latin subset URL in the Google Fonts CSS" >&2; exit 1; }
curl -sS -A "$UA" "$URL" -o "$TMP/inter.woff2"

# The unicode-range below MUST stay in step with the @font-face in
# src/index.css — a glyph outside it renders from the fallback family.
RANGE='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'

"$PY" -m fontTools.varLib.instancer "$TMP/inter.woff2" 'wght=400:700' -o "$TMP/clamped.ttf"
"$PY" -m fontTools.subset "$TMP/clamped.ttf" \
  --unicodes="$RANGE" \
  --layout-features='kern,liga,calt' \
  --flavor=woff2 \
  --output-file="$OUT"

printf 'wrote %s (%s bytes)\n' "$OUT" "$(wc -c < "$OUT" | tr -d ' ')"
