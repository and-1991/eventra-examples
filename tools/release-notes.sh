#!/usr/bin/env bash
# Print the CHANGELOG.md section for a version: tools/release-notes.sh v1.3.0  (or 1.3.0)
# Exits 1 if the section is missing or empty.
set -euo pipefail
ver="${1#v}"
file="$(dirname "$0")/../CHANGELOG.md"
notes="$(awk -v v="$ver" '
  $0 ~ "^## \\[" v "\\]" { on=1; next }
  on && /^## \[/ { exit }
  on && /^\[[0-9.]+\]: / { exit }
  on { print }
' "$file" | sed '/./,$!d' | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}')"
[ -n "$notes" ] || { echo "No CHANGELOG.md section for $ver" >&2; exit 1; }
printf '%s\n' "$notes"
