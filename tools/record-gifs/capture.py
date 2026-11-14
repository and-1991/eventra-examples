"""Capture real `eventra sync` / `check` / event list / SDK-to-mock runs for every example.

usage: python3 -I capture.py <repo root> <work dir> [example keys like frontend/vue ...]
Writes <work dir>/cap/<group>_<name>.json (steps for gifr.build). Needs the mock server port 4000
and port 3000 free. Servers are started in their own process group and killed by group.
"""
import glob
import json
import os
import re
import shlex
import subprocess
import sys
import time

R = sys.argv[1]
S = sys.argv[2]
TSX = shlex.quote(f"{R}/examples/backend/express/node_modules/.bin/tsx")


def tsx_e(imp, call):
    return f"{TSX} -e \"import {{ {imp} }} from '{call[0]}'; {call[1]}\""


def srv(cmd, wait=3):
    return (f"setsid {cmd} >/dev/null 2>&1 & P=$!; sleep {wait} && curl -sf http://localhost:3000/ >/dev/null; "
            f"sleep 6; kill -9 -- -$P 2>/dev/null || kill -9 $P 2>/dev/null || true")


SDK = {
    'backend/node': ('tsx src/index.ts', f'timeout 8 {TSX} src/index.ts'),
    'backend/express': ('tsx src/index.ts & curl localhost:3000', srv(f'{TSX} src/index.ts')),
    'backend/hono': ('tsx src/server.node.ts & curl localhost:3000', srv(f'{TSX} src/server.node.ts')),
    'backend/fastify': ('tsx src/server.ts & curl localhost:3000', srv(f'{TSX} src/server.ts')),
    'backend/nestjs': ('nest start & curl localhost:3000', srv('pnpm exec nest start', 8)),
    'runtimes/cloudflare': ('tsx src/test.ts', f'timeout 15 {TSX} src/test.ts'),
    'runtimes/vercel': ('next dev & curl localhost:3000/api/track',
                        "setsid pnpm exec next dev -p 3000 >/dev/null 2>&1 & P=$!; sleep 14 && curl -sf http://localhost:3000/api/track >/dev/null; "
                        "sleep 6; kill -9 -- -$P 2>/dev/null || kill -9 $P 2>/dev/null || true"),
    'frontend/react': ('trackReactPageView()', tsx_e('trackReactPageView', ('./src/events.ts', 'trackReactPageView();'))),
    'frontend/vue': ("trackFeature('vue_page_view')", tsx_e('trackFeature', ('./src/tracker.ts', "trackFeature('vue_page_view');"))),
    'frontend/svelte': ('trackSveltePageView()', tsx_e('trackSveltePageView', ('./src/lib/events.ts', 'trackSveltePageView();'))),
    'frontend/vanilla': ('trackVanillaPageView()', tsx_e('trackVanillaPageView', ('./src/events.ts', 'trackVanillaPageView();'))),
    'frontend/next': ('trackNextPageView()', tsx_e('trackNextPageView', ('./lib/events.ts', 'trackNextPageView();'))),
    'frontend/nuxt': ("trackFeature('nuxt_page_view')", tsx_e('trackFeature', ('./utils/tracker.ts', "trackFeature('nuxt_page_view');"))),
    'frontend/astro': ('trackAstroPageView()', tsx_e('trackAstroPageView', ('./src/events.ts', 'trackAstroPageView();'))),
    'frontend/angular': ('trackAngularPageView()', tsx_e('trackAngularPageView', ('./src/app/events.ts', 'trackAngularPageView();'))),
}
env = dict(os.environ, EVENTRA_API_KEY='test')


def sh(cmd, cwd):
    try:
        p = subprocess.run(['bash', '-c', cmd], cwd=cwd, env=env, capture_output=True, text=True, timeout=90)
    except subprocess.TimeoutExpired:
        return 'TIMEOUT', 124
    return (p.stdout + p.stderr).rstrip('\n'), p.returncode


mocklog = f'{S}/mock-cap.log'
mock = subprocess.Popen(['node', f'{R}/tools/mock-server/index.js'], stdout=open(mocklog, 'w'), stderr=subprocess.STDOUT, env=env)
time.sleep(1.5)
os.makedirs(f'{S}/cap', exist_ok=True)
only = sys.argv[3:]
try:
    for d in sorted(glob.glob(f'{R}/examples/*/*')):
        key = '/'.join(d.split('/')[-2:])
        if only and key not in only:
            continue
        steps = []
        for disp, cmd in [('eventra sync', 'eventra sync'), ('eventra check', 'eventra check'),
                          ("node -p \"require('./eventra.json').events.join(' ')\"", "node -p \"require('./eventra.json').events.join(' ')\"")]:
            out, ec = sh(cmd, d)
            steps.append({'cmd': disp, 'out': out, 'ec': ec})
        if key in SDK:
            before = len(open(mocklog).read())
            disp, cmd = SDK[key]
            out, ec = sh(cmd, d)
            time.sleep(1.5)
            new = open(mocklog).read()[before:]
            names = [n for n in dict.fromkeys(re.findall(r'"name": "([^"]+)"', new)) if n != '@eventra_dev/eventra-sdk']
            hits = new.count('TRACK HIT')
            lines = [f'TRACK HIT x{hits}  events: ' + ', '.join(names)] if hits else ['(no TRACK HIT)']
            steps.append({'cmd': disp + '   # → mock :4000', 'out': '\n'.join(lines), 'ec': 0})
        json.dump(steps, open(f'{S}/cap/{key.replace("/", "_")}.json', 'w'))
        print(key, [s['ec'] for s in steps], steps[-1]['out'][:70].replace('\n', ' | '), flush=True)
finally:
    mock.terminate()
