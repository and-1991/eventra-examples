#!/usr/bin/env bash
# Re-record every GIF in the repo from real runs:
#   examples/*/*/demo.gif   sync, check, detected events and an SDK call reaching the mock server
#   assets/demo.gif         a Vue session on a throw-away copy (add a button, drift, check fails, sync fixes it)
#   assets/overview.gif     a full `pnpm verify` run
# Needs python3 with Pillow, the DejaVu mono font, and free ports 3000 and 4000.
#   tools/record-gifs/record.sh [work dir]
set -euo pipefail
R="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$R/tools/record-gifs"
S="${1:-$(mktemp -d)}"
mkdir -p "$S"
export EVENTRA_API_KEY=test
cd "$R"

for p in 3000 4000; do
  if (ss -ltn 2>/dev/null | grep -qE ":$p\s"); then echo "port $p is busy" >&2; exit 1; fi
done

echo "== 1/3 per-example sessions"
rm -rf "$S/cap"
python3 -I "$HERE/capture.py" "$R" "$S"

echo "== 2/3 Vue session on a throw-away copy"
V="$(mktemp -d "$S/vuecopy.XXXXXX")"
(cd "$R/examples/frontend/vue" && tar cf - --exclude=node_modules --exclude=dist --exclude=demo.gif . | tar xf - -C "$V")
ln -s "$R/examples/frontend/vue/node_modules" "$V/node_modules"
cd "$V"
git init -q . && git add -A && git -c user.name=rec -c user.email=rec@localhost commit -qm base
: > "$S/demo.jsonl"
run() { out=$(bash -c "$2" 2>&1); ec=$?; python3 -c 'import json,sys;print(json.dumps({"cmd":sys.argv[1],"out":sys.argv[2],"ec":int(sys.argv[3])}))' "$1" "$out" $ec >> "$S/demo.jsonl"; }
set +e
run 'eventra sync' 'eventra sync'
run "sed -i 's|<TrackedButton event=\"vue_click\">|<TrackedButton event=\"vue_demo_new\">Demo</TrackedButton>\n    &|' src/App.vue" "sed -i 's|<TrackedButton event=\"vue_click\">|<TrackedButton event=\"vue_demo_new\">Demo</TrackedButton>\n    &|' src/App.vue; git diff --stat src/App.vue | head -1"
run 'eventra sync' 'eventra sync'
run 'grep demo eventra.json' 'grep demo eventra.json'
run 'eventra check' 'eventra check'
git checkout -q -- src/App.vue
run '# button removed from App.vue -> eventra.json is now stale
eventra check' 'eventra check'
run 'eventra sync && eventra check' 'eventra sync >/dev/null && eventra check'
node "$R/tools/mock-server/index.js" > "$S/mock-v.log" 2>&1 &
MOCK=$!
sleep 1.5
out=$(bash -c "'$R/examples/backend/express/node_modules/.bin/tsx' -e \"import { trackFeature } from './src/tracker.ts'; trackFeature('vue_page_view');\"; sleep 2; echo \"TRACK HIT x\$(grep -c 'TRACK HIT' '$S/mock-v.log')  events: \$(grep -o '\"name\": \"[a-z_]*\"' '$S/mock-v.log' | sed 's/\"name\": //; s/\"//g' | head -3 | tr '\n' ' ')\"" 2>&1)
python3 -c 'import json,sys;print(json.dumps({"cmd":sys.argv[1],"out":sys.argv[2],"ec":0}))' 'tsx -e "trackFeature(\"vue_page_view\")"   # SDK -> mock :4000' "$out" >> "$S/demo.jsonl"
kill $MOCK 2>/dev/null
set -e
cd "$R"

echo "== 3/3 pnpm verify"
bash tools/verify-all.sh > "$S/verify.log" 2>&1

python3 -I - "$HERE" "$S" "$R" <<'PY'
import glob, json, os, re, sys
here, S, R = sys.argv[1:4]
sys.path.insert(0, here)
import gifr
os.chdir(R)
tot = 0
for f in sorted(glob.glob(f'{S}/cap/*.json')):
    key = os.path.basename(f)[:-5].replace('_', '/', 1)
    out = f'examples/{key}/demo.gif'
    gifr.build(json.load(open(f)), f'eventra — examples/{key}', out, rows=22)
    tot += os.path.getsize(out)
print('example GIFs:', tot // 1024, 'KB total')
steps = [json.loads(l) for l in open(f'{S}/demo.jsonl')]
gifr.build(steps, 'eventra sync / check / SDK — examples/frontend/vue', 'assets/demo.gif', rows=22)
out = []
for l in open(f'{S}/verify.log').read().splitlines():
    l = re.sub(r'^\s*\d+(?=(SDK|CLI) )', '', l)
    if re.match(r'(CLI|SDK) (OK|FAIL)|===|CLI:|SDK:|Mock OK|CLI failures|SDK failures|TRACK HIT total|ALL PASSED', l):
        out.append(l)
gifr.build([{'cmd': 'pnpm verify', 'out': '\n'.join(out), 'ec': 0}], 'eventra-examples — pnpm verify (all examples)', 'assets/overview.gif', rows=21, linedelay=55)
for f in ['assets/demo.gif', 'assets/overview.gif']:
    print(f, os.path.getsize(f) // 1024, 'KB')
PY
echo "work files: $S (demo.jsonl holds the Vue session output for docs/DEMO.md)"
