#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$ROOT/node_modules/.bin:${HOME}/.local/share/pnpm:${HOME}/.nvm/versions/node/v22.12.0/bin:$PATH"
TSX="$ROOT/examples/backend/express/node_modules/.bin/tsx"
MOCK_LOG="/tmp/eventra-mock-$$.log"
CLI_FAIL=0
SDK_FAIL=0

declare -A EXPECTED
EXPECTED[backend/express]="express_home express_request"
EXPECTED[backend/node]="node_started"
EXPECTED[backend/fastify]="fastify_home fastify_request fastify_response"
EXPECTED[backend/hono]="hono_home hono_request hono_response"
EXPECTED[backend/nestjs]="nestjs_home nestjs_request nestjs_response"
EXPECTED[frontend/react]="react_page_view new_event check_mode react_click react_click_enum"
EXPECTED[frontend/vue]="vue_page_view vue_click"
EXPECTED[frontend/svelte]="svelte_page_view svelte_click"
EXPECTED[frontend/vanilla]="vanilla_page_view vanilla_click"
EXPECTED[frontend/next]="next_page_view next_click"
EXPECTED[frontend/nuxt]="nuxt_page_view nuxt_click nuxt_dynamic_feature"
EXPECTED[frontend/astro]="astro_page_view astro_click"
EXPECTED[frontend/angular]="angular_page_view angular_click"
EXPECTED[runtimes/cloudflare]="cloudflare_request cloudflare_test cloudflare_after_timeout"
EXPECTED[runtimes/vercel]="vercel_request vercel_api_hit"

kill_port() {
  fuser -k "$1/tcp" 2>/dev/null || true
  sleep 0.3
}

wait_mock() {
  for _ in $(seq 1 30); do
    curl -sf http://localhost:4000/ >/dev/null && return 0
    sleep 0.2
  done
  echo "Mock server did not start"; cat "$MOCK_LOG"; exit 1
}

hits() {
  grep -c "TRACK HIT" "$MOCK_LOG" 2>/dev/null | tr -d '\n' || echo 0
}

sdk_ok() {
  local name="$1"
  shift
  local before after
  before=$(hits)
  "$@" || true
  sleep 1.5
  after=$(hits)
  if [ "${after:-0}" -gt "${before:-0}" ] 2>/dev/null; then
    echo "SDK OK   $name"
  else
    echo "SDK FAIL $name (hits $before -> $after)"
    SDK_FAIL=$((SDK_FAIL + 1))
  fi
}

echo "=== Versions ==="
echo "CLI: $(node -p "require('$ROOT/node_modules/@eventra_dev/eventra-cli/package.json').version")"
echo "SDK: $(node -p "require('$ROOT/node_modules/.pnpm/@eventra_dev+eventra-sdk@1.1.5/node_modules/@eventra_dev/eventra-sdk/package.json').version")"

echo ""
echo "=== Mock server ==="
kill_port 4000
node "$ROOT/tools/mock-server/index.js" >"$MOCK_LOG" 2>&1 &
MOCK_PID=$!
trap 'kill $MOCK_PID 2>/dev/null; kill_port 3000; kill_port 4000' EXIT
wait_mock
echo "Mock OK"

echo ""
echo "=== CLI sync + check ==="
for key in $(echo "${!EXPECTED[@]}" | tr ' ' '\n' | sort); do
  dir="$ROOT/examples/$key"
  cd "$dir"
  if ! eventra sync >/dev/null 2>&1; then
    echo "CLI FAIL $key (sync)"; CLI_FAIL=$((CLI_FAIL+1)); continue
  fi
  if ! eventra check 2>&1 | grep -q "All good"; then
    echo "CLI FAIL $key (check)"; CLI_FAIL=$((CLI_FAIL+1)); continue
  fi
  found=$(node -e "console.log((require('./eventra.json').events||[]).sort().join(' '))")
  exp="${EXPECTED[$key]}"; missing=""
  for ev in $exp; do echo " $found " | grep -q " $ev " || missing="$missing $ev"; done
  if [ -n "$missing" ]; then echo "CLI FAIL $key missing:$missing"; CLI_FAIL=$((CLI_FAIL+1))
  else echo "CLI OK   $key"; fi
done

echo ""
echo "=== SDK smoke (mock :4000/track) ==="

sdk_ok node timeout 8 bash -c "cd \"$ROOT/examples/backend/node\" && \"$TSX\" src/index.ts"

kill_port 3000
sdk_ok express bash -c "cd \"$ROOT/examples/backend/express\" && \"$TSX\" src/index.ts & sleep 3 && curl -sf http://localhost:3000/ >/dev/null && sleep 2; fuser -k 3000/tcp 2>/dev/null || true"

kill_port 3000
sdk_ok hono bash -c "cd \"$ROOT/examples/backend/hono\" && \"$TSX\" src/server.node.ts & sleep 3 && curl -sf http://localhost:3000/ >/dev/null && sleep 2; fuser -k 3000/tcp 2>/dev/null || true"

kill_port 3000
sdk_ok fastify bash -c "cd \"$ROOT/examples/backend/fastify\" && \"$TSX\" src/server.ts & sleep 3 && curl -sf http://localhost:3000/ >/dev/null && sleep 2; fuser -k 3000/tcp 2>/dev/null || true"

kill_port 3000
sdk_ok nestjs bash -c "cd \"$ROOT/examples/backend/nestjs\" && pnpm exec nest start & sleep 8 && curl -sf http://localhost:3000/ >/dev/null && sleep 2; fuser -k 3000/tcp 2>/dev/null || true"

sdk_ok cloudflare timeout 15 bash -c "cd \"$ROOT/examples/runtimes/cloudflare\" && \"$TSX\" src/test.ts"

sdk_ok react timeout 8 bash -c "cd \"$ROOT/examples/frontend/react\" && \"$TSX\" -e \"import { trackReactPageView } from './src/events.ts'; trackReactPageView();\""
sdk_ok vue timeout 8 bash -c "cd \"$ROOT/examples/frontend/vue\" && \"$TSX\" -e \"import { trackVuePageView } from './src/events.ts'; trackVuePageView();\""
sdk_ok svelte timeout 8 bash -c "cd \"$ROOT/examples/frontend/svelte\" && \"$TSX\" -e \"import { trackSveltePageView } from './src/lib/events.ts'; trackSveltePageView();\""
sdk_ok vanilla timeout 8 bash -c "cd \"$ROOT/examples/frontend/vanilla\" && \"$TSX\" -e \"import { trackVanillaPageView } from './src/events.ts'; trackVanillaPageView();\""
sdk_ok next timeout 8 bash -c "cd \"$ROOT/examples/frontend/next\" && \"$TSX\" -e \"import { trackNextPageView } from './lib/events.ts'; trackNextPageView();\""
sdk_ok nuxt timeout 8 bash -c "cd \"$ROOT/examples/frontend/nuxt\" && \"$TSX\" -e \"import { trackNuxtPageView } from './utils/events.ts'; trackNuxtPageView();\""
sdk_ok astro timeout 8 bash -c "cd \"$ROOT/examples/frontend/astro\" && \"$TSX\" -e \"import { trackAstroPageView } from './src/events.ts'; trackAstroPageView();\""
sdk_ok angular timeout 8 bash -c "cd \"$ROOT/examples/frontend/angular\" && \"$TSX\" -e \"import { trackAngularPageView } from './src/app/events.ts'; trackAngularPageView();\""

kill_port 3000
sdk_ok vercel bash -c "cd \"$ROOT/examples/runtimes/vercel\" && pnpm exec next dev -p 3000 & sleep 14 && curl -sf http://localhost:3000/api/track >/dev/null && sleep 2; fuser -k 3000/tcp 2>/dev/null || true"

echo ""
echo "=== Summary ==="
echo "CLI failures: $CLI_FAIL"
echo "SDK failures: $SDK_FAIL"
echo "TRACK HIT total: $(hits)"
[ "$CLI_FAIL" -eq 0 ] && [ "$SDK_FAIL" -eq 0 ] && echo "ALL PASSED" && exit 0
exit 1
