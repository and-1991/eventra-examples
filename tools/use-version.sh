#!/usr/bin/env bash
# Switch this repo to a released version (git tag) and install its pinned dependencies.
#   tools/use-version.sh            list versions
#   tools/use-version.sh v1.2.0     check out v1.2.0 (detached HEAD) + pnpm install
#   tools/use-version.sh latest     back to main
set -euo pipefail
cd "$(dirname "$0")/.."

if [ $# -eq 0 ]; then
  git tag -l 'v*' --sort=-v:refname -n1
  echo; echo "current: $(git describe --tags --always)"
  exit 0
fi

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Working tree has uncommitted changes — commit or stash them first." >&2
  exit 1
fi

target="$1"
if [ "$target" = "latest" ]; then
  git switch main
else
  git rev-parse -q --verify "refs/tags/$target" >/dev/null || { echo "Unknown version: $target (run without args to list)" >&2; exit 1; }
  git switch --detach "$target"
fi

echo "On $(git describe --tags --always). Installing pinned dependencies..."
pnpm install --frozen-lockfile || pnpm install
echo "Done. Installed CLI: $(node -p "require('./node_modules/@eventra_dev/eventra-cli/package.json').version" 2>/dev/null || echo n/a)"
