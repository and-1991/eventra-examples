// Live checks for the eventra-cli 2.6.8 / plugins vue+angular 1.3.3, svelte+astro 1.3.2 release notes.
// One section per claim, each with a real assertion; nothing is taken from the notes on trust.
//   CLI    - file names and server text printed safely, .mts/.cts, a user class called Eventra,
//            thousands of calls to another analytics library, endpoint approvals outside the repo,
//            eventra.local.json never written through a link
//   plugins - a line break in a template event name is reported (all four), Vue props named
//            `class`/`for`, many `<template` in one Vue file, Astro tags with many attributes
// Fixtures live in temp dirs INSIDE this package, so the SDK and plugin imports resolve.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVENTRA_BIN = path.join(HERE, "..", "..", "node_modules", ".bin", "eventra");
// approvals go to a temp folder, never to the real ~/.config/eventra
const CONFIG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eventra-config-268-"));
process.env.EVENTRA_CONFIG_DIR = CONFIG_DIR;

let pass = 0;
let fail = 0;
const failures = [];
const assert = (name, cond, reason) => {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    failures.push({ name, reason });
    console.log(`FAIL ${name} (${String(reason ?? "assertion failed").slice(0, 400)})`);
  }
};
const info = (n, t) => console.log(`INFO ${n}: ${t}`);
const ESC = "\x1b";
const hasRawControl = (s) => /[\x00-\x08\x0b-\x1f\x7f]/.test(s.replace(/\x1b\[[0-9;]*m/g, "")); // chalk colours aside

const dirs = [];
function project(files, { plugins = [], include = "src/**/*.ts", events = [], endpoint = "http://localhost:4000/x" } = {}) {
  const dir = fs.mkdtempSync(path.join(HERE, ".tmp-268-"));
  dirs.push(dir);
  fs.writeFileSync(
    path.join(dir, "eventra.json"),
    JSON.stringify({ apiKey: "", endpoint, events, functionWrappers: [], plugins, sync: { include: [include], exclude: ["node_modules"] } }, null, 2)
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}
const events = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "eventra.json"), "utf8")).events;
function run(args, cwd, env = {}, timeout = 120_000) {
  const t0 = Date.now();
  const r = spawnSync(EVENTRA_BIN, args, { cwd, env: { ...process.env, FORCE_COLOR: "0", ...env }, encoding: "utf8", timeout });
  return { code: r.status ?? 124, all: (r.stdout ?? "") + (r.stderr ?? ""), stdout: r.stdout ?? "", stderr: r.stderr ?? "", ms: Date.now() - t0 };
}
function runAsync(args, cwd, env = {}, timeout = 60_000) {
  return new Promise((resolve) => {
    const c = spawn(EVENTRA_BIN, args, { cwd, env: { ...process.env, FORCE_COLOR: "0", ...env } });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => c.kill("SIGKILL"), timeout);
    c.stdout.on("data", (d) => (stdout += d));
    c.stderr.on("data", (d) => (stderr += d));
    c.on("close", (code) => (clearTimeout(timer), resolve({ code: code ?? 124, stdout, stderr, all: stdout + stderr })));
    c.stdin.end("");
  });
}
const SDK = 'import { Eventra } from "@eventra_dev/eventra-sdk";\nconst t = new Eventra({ apiKey: "x" });\n';

// ---------------------------------------------------------------------------
// 1. file names with escape sequences are printed as plain escapes
// ---------------------------------------------------------------------------
{
  const evil = `src/evil${ESC}[31mRED\x07.ts`;
  const dir = project({ [evil]: SDK + "t.track(process.env.X as string);\nconst x = ((((1;\n", "src/ok.ts": SDK + 't.track("esc_ok");\n' });
  for (const cmd of ["sync", "check"]) {
    const r = run([cmd], dir);
    assert(`escape.${cmd}.no-raw-escape-in-output`, !r.all.includes(ESC) && !r.all.includes("\x07"), JSON.stringify(r.all));
    assert(`escape.${cmd}.name-shown-escaped`, r.all.includes("src/evil\\x1b[31mRED\\x07.ts"), r.all);
  }
  assert("escape.rest-of-scan-continues", events(dir).includes("esc_ok"), JSON.stringify(events(dir)));
}

// ---------------------------------------------------------------------------
// 2. .mts and .cts are TypeScript: generics and <T>casts are not syntax errors
// ---------------------------------------------------------------------------
{
  const dir = project(
    {
      "src/a.mts": SDK + "const id = <T,>(x: T) => x;\nconst s = <string>(id(\"a\") as unknown);\nt.track(\"mts_event\");\n",
      "src/b.cts": SDK + "const v = <number>(1 as unknown);\nfunction g<T>(x: T): T { return x; }\nt.track(\"cts_event\");\n",
    },
    { include: "src/**/*.{mts,cts}" }
  );
  const r = run(["sync"], dir);
  assert("mts-cts.no-syntax-error-reported", !/Syntax errors/.test(r.all), r.all);
  assert("mts-cts.events-found", ["mts_event", "cts_event"].every((e) => events(dir).includes(e)), JSON.stringify(events(dir)));
  assert("mts-cts.check-clean", /All good/.test(run(["check"], dir).all), "check not clean");
}

// ---------------------------------------------------------------------------
// 3. a class of your own named Eventra is not the SDK
// ---------------------------------------------------------------------------
{
  const dir = project({
    "src/own.ts": 'class Eventra { track(_n: string) {} }\nnew Eventra().track("own_class_a");\nconst e = new Eventra();\ne.track("own_class_b");\nexport {};\n',
    "src/lib/Eventra.ts": 'export class Eventra { track(_n: string) {} }\n',
    "src/use.ts": 'import { Eventra } from "./lib/Eventra";\nnew Eventra().track("own_class_c");\n',
    "src/real.ts": SDK + 't.track("real_sdk_event");\n',
  });
  run(["sync"], dir);
  const ev = events(dir);
  assert("own-eventra-class.not-counted", !ev.some((e) => e.startsWith("own_class_")), JSON.stringify(ev));
  assert("own-eventra-class.real-sdk-still-found", ev.includes("real_sdk_event"), JSON.stringify(ev));
}

// ---------------------------------------------------------------------------
// 4. thousands of calls to another analytics library scan fast
//    (measured: 20 000 calls took more than 400 s on 2.6.7, about 4 s on 2.6.8)
// ---------------------------------------------------------------------------
{
  let src = "type Analytics = { track(name: string, p?: object): void };\ndeclare const analytics: Analytics;\n" + SDK + 't.track("perf_real");\n';
  for (let i = 0; i < 20000; i++) src += `analytics.track("seg_${i % 50}", { i: ${i} });\n`;
  const dir = project({ "src/perf.ts": src });
  const r = run(["sync"], dir, {}, 120_000);
  assert("perf.20k-foreign-calls-under-60s", r.code === 0 && r.ms < 60_000, `exit ${r.code} in ${r.ms} ms`);
  assert("perf.only-the-sdk-event", JSON.stringify(events(dir)) === '["perf_real"]', JSON.stringify(events(dir)));
  info("perf.20k-foreign-calls", `${(r.ms / 1000).toFixed(1)} s`);
}

// ---------------------------------------------------------------------------
// 5. eventra send: approval stored outside the repository; old approvals are not trusted;
//    server text printed safely; eventra.local.json never written through a link
// ---------------------------------------------------------------------------
async function startServer(port, reply) {
  const log = [];
  const server = http.createServer((q, r) => {
    let body = "";
    q.on("data", (d) => (body += d));
    q.on("end", () => {
      log.push({ key: q.headers["x-api-key"], body });
      const [status, text] = reply(log.length);
      r.writeHead(status, { "content-type": "application/json" }).end(text);
    });
  });
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  return { server, log };
}
{
  const PORT = 4588;
  const endpoint = `http://localhost:${PORT}/api/v1/cli/events`;
  const ok = () => [200, JSON.stringify({ created: [`new${ESC}[2Jname`], existing: [`old${ESC}]0;title\x07`] })];
  const { server, log } = await startServer(PORT, ok);
  try {
    // approval lives in $EVENTRA_CONFIG_DIR, keyed by the project's real path
    const dir = project({ "src/a.ts": "" }, { endpoint, events: ["e1"] });
    const a = await runAsync(["send", "--trust-endpoint"], dir, { EVENTRA_API_KEY: "k" });
    const store = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, "trusted-endpoints.json"), "utf8"));
    assert("send.approval-saved-in-user-folder", store[fs.realpathSync(dir)] === endpoint, JSON.stringify(store));
    assert("send.approval-not-in-repo", !fs.existsSync(path.join(dir, "eventra.local.json")) || !JSON.parse(fs.readFileSync(path.join(dir, "eventra.local.json"), "utf8")).trustedEndpoint, "trustedEndpoint written into eventra.local.json");
    assert("send.approval-message-says-outside-repo", /saved outside the repository/.test(a.all), a.all);
    const mode = fs.statSync(path.join(CONFIG_DIR, "trusted-endpoints.json")).mode & 0o777;
    assert("send.approval-file-owner-only", mode === 0o600, mode.toString(8));
    // server text with escape sequences
    assert("send.server-names-no-raw-escape", !a.all.includes(ESC) && !a.all.includes("\x07"), JSON.stringify(a.all));
    assert("send.server-names-shown-escaped", a.all.includes("new\\x1b[2Jname"), a.all);
    const again = await runAsync(["send"], dir, { EVENTRA_API_KEY: "k" });
    assert("send.approved-project-sends-without-flag", again.code === 0, again.all);

    // a legacy approval in eventra.local.json (CLI before 2.6.8, or committed by a PR) is not trusted
    const legacy = project({ "src/a.ts": "" }, { endpoint, events: ["e1"] });
    fs.writeFileSync(path.join(legacy, "eventra.local.json"), JSON.stringify({ trustedEndpoint: endpoint }));
    const before = log.length;
    const l = await runAsync(["send"], legacy, { EVENTRA_API_KEY: "k" });
    assert("send.legacy-approval-not-trusted", l.code === 1 && log.length === before && /not locally approved/.test(l.all), `exit ${l.code} requests ${log.length - before} | ${l.all}`);
    assert("send.legacy-approval-explained", /no longer read for this/.test(l.all), l.all);

    // XDG_CONFIG_HOME is used when EVENTRA_CONFIG_DIR is not set
    const xdg = fs.mkdtempSync(path.join(os.tmpdir(), "eventra-xdg-"));
    const xdir = project({ "src/a.ts": "" }, { endpoint, events: ["e1"] });
    const env = { ...process.env, EVENTRA_API_KEY: "k", XDG_CONFIG_HOME: xdg };
    delete env.EVENTRA_CONFIG_DIR;
    await new Promise((resolve) => {
      const c = spawn(EVENTRA_BIN, ["send", "--trust-endpoint"], { cwd: xdir, env });
      c.stdin.end("");
      c.on("close", resolve);
    });
    assert("send.xdg-config-home-used", fs.existsSync(path.join(xdg, "eventra", "trusted-endpoints.json")), fs.readdirSync(xdg).join(","));
    fs.rmSync(xdg, { recursive: true, force: true });
  } finally {
    server.close();
  }

  // error body from the server with escape sequences
  const { server: s2 } = await startServer(PORT, () => [401, `{"error":"bad${ESC}[2J${ESC}]52;c;ZXZpbA==\x07key"}`]);
  try {
    const dir = project({ "src/a.ts": "" }, { endpoint, events: ["e1"] });
    const r = await runAsync(["send", "--trust-endpoint"], dir, { EVENTRA_API_KEY: "k" });
    assert("send.error-body-no-raw-escape", r.code === 1 && !r.all.includes(ESC) && !r.all.includes("\x07"), JSON.stringify(r.all));
    assert("send.error-body-still-shown", /bad\\x1b\[2J/.test(r.all), r.all);
  } finally {
    s2.close();
  }

  // eventra.local.json is a link to another file: the CLI refuses to write the key through it.
  // `init` and `send` save a key only after an interactive prompt (needs a TTY), so the function both
  // of them call (saveLocalApiKey of the published CLI) is called directly in a child process.
  {
    const cliConfig = path.join(path.dirname(fs.realpathSync(path.join(HERE, "..", "..", "node_modules", "@eventra_dev", "eventra-cli", "package.json"))), "dist", "config", "config.js");
    const save = (dir) =>
      spawnSync(process.execPath, ["-e", `require(${JSON.stringify(cliConfig)}).saveLocalApiKey("secret-key").then(() => console.log("SAVED"), (e) => { console.log("REFUSED " + e.message); })`], { cwd: dir, encoding: "utf8", timeout: 30_000 });
    const dir = project({ "src/a.ts": "" });
    const victim = path.join(dir, "victim.txt");
    fs.writeFileSync(victim, "original\n");
    fs.symlinkSync(victim, path.join(dir, "eventra.local.json"));
    const r = save(dir);
    assert("local-json-link.refused-with-reason", /REFUSED .*symbolic link/.test(r.stdout), r.stdout + r.stderr);
    assert("local-json-link.target-untouched", fs.readFileSync(victim, "utf8") === "original\n", fs.readFileSync(victim, "utf8"));
    // a normal file is still written, owner-only, with the key and nothing else
    const plain = project({ "src/a.ts": "" });
    fs.writeFileSync(path.join(plain, "eventra.local.json"), JSON.stringify({ trustedEndpoint: "http://old", apiKey: "old" }));
    const p = save(plain);
    const saved = JSON.parse(fs.readFileSync(path.join(plain, "eventra.local.json"), "utf8"));
    const mode = fs.statSync(path.join(plain, "eventra.local.json")).mode & 0o777;
    assert("local-json.saved-key-only-owner-readable", /SAVED/.test(p.stdout) && JSON.stringify(saved) === '{"apiKey":"secret-key"}' && mode === 0o600, `${p.stdout}${p.stderr} ${JSON.stringify(saved)} ${mode.toString(8)}`);
  }
}

// ---------------------------------------------------------------------------
// 6. plugins: a line break inside a template event name is reported, not cut (all four)
// ---------------------------------------------------------------------------
{
  const dir = project(
    {
      "src/t.ts": SDK + 't.track("anchor");\n',
      "src/A.vue": '<script setup lang="ts">\nimport "./t";\n</script>\n<template><button event="vue_line\nbreak">x</button><button event="vue_ok">y</button></template>\n',
      "src/S.svelte": '<script lang="ts">\nimport "./t";\n</script>\n<button event="svelte_line\nbreak">x</button><button event="svelte_ok">y</button>\n',
      "src/P.astro": '---\nimport "./t";\n---\n<button event="astro_line\nbreak">x</button><button event="astro_ok">y</button>\n',
      "src/app/x.component.ts": 'import { Component } from "@angular/core";\n@Component({ selector: "x", templateUrl: "./x.component.html" })\nexport class X {}\n',
      "src/app/x.component.html": '<button event="ng_line\nbreak">x</button><button event="ng_ok">y</button>\n',
    },
    {
      plugins: ["vue", "svelte", "astro", "angular"].map((p) => `@eventra_dev/cli-plugin-${p}`),
      include: "src/**/*.{ts,vue,svelte,astro,html}",
    }
  );
  const r = run(["sync"], dir);
  const ev = events(dir);
  for (const p of ["vue", "svelte", "astro", "ng"]) {
    assert(`newline-name.${p}.not-cut`, !ev.includes(`${p}_line`) && !ev.some((e) => e.startsWith(`${p}_line`)), JSON.stringify(ev));
    assert(`newline-name.${p}.reported`, r.all.includes(`"${p}_line\\nbreak"`), r.all);
    assert(`newline-name.${p}.other-events-kept`, ev.includes(`${p}_ok`), JSON.stringify(ev));
  }
  assert("newline-name.scan-not-clean", /4 event names the CLI cannot accept/.test(r.all), r.all);
}

// ---------------------------------------------------------------------------
// 7. Vue: props named with reserved words; a file with many `<template`
// ---------------------------------------------------------------------------
{
  const dir = project(
    {
      "src/t.ts": SDK + "export { t };\n",
      "src/Btn.vue":
        '<script setup lang="ts">\nimport { t } from "./t";\nconst props = defineProps<{ class?: string; for?: string; default?: string; name: string }>();\nfunction go() { t.track(props.name); }\n</script>\n<template><button :class="props.class" @click="go">x</button></template>\n',
      "src/Opt.vue":
        '<script lang="ts">\nimport { t } from "./t";\nexport default { props: ["class", "for", "new", "label"], methods: { go() { t.track("vue_options_reserved"); } } };\n</script>\n<template><button @click="go">{{ label }}</button></template>\n',
      "src/Use.vue": '<script setup lang="ts">\nimport Btn from "./Btn.vue";\n</script>\n<template><Btn name="vue_reserved_prop" class="c" for="f" /></template>\n',
      "src/Tpl.vue": '<script setup lang="ts">\nimport "./t";\n</script>\n<template><button event="vue_tpl_ok">x</button></template>\n<!-- ' + "<template ".repeat(40000) + " -->\n",
    },
    { plugins: ["@eventra_dev/cli-plugin-vue"], include: "src/**/*.{ts,vue}" }
  );
  const r = run(["sync"], dir);
  const ev = events(dir);
  assert("vue.reserved-prop.no-syntax-error", !/Syntax errors|failed to transform/i.test(r.all), r.all);
  assert("vue.reserved-prop.event-found", ev.includes("vue_reserved_prop") && ev.includes("vue_options_reserved"), JSON.stringify(ev));
  assert("vue.many-template-tags.fast", r.ms < 30_000 && ev.includes("vue_tpl_ok"), `${r.ms} ms ${JSON.stringify(ev)}`);
  info("vue.many-template-tags", `${r.ms} ms for 40 000 <template`);
}

// ---------------------------------------------------------------------------
// 8. Astro: a tag with too many attributes, a run of unclosed <script
// ---------------------------------------------------------------------------
{
  const attrs = Array.from({ length: 1500 }, (_, i) => `a${i}`).join(" ");
  const dir = project(
    {
      "src/t.ts": SDK + "export { t };\n",
      "src/Big.astro": `---\nimport { t } from "./t";\nt.track("astro_front");\n---\n<div ${attrs}>x</div><button event="astro_after">y</button>\n`,
      "src/Fine.astro": `---\n---\n<div ${Array.from({ length: 900 }, (_, i) => `a${i}`).join(" ")}>x</div><button event="astro_900_attrs">y</button>\n`,
      "src/Scripts.astro": '---\nimport { t } from "./t";\nt.track("astro_scripts_front");\n---\n<button event="astro_scripts_tpl">y</button>\n' + "<script x ".repeat(40000),
    },
    { plugins: ["@eventra_dev/cli-plugin-astro"], include: "src/**/*.{ts,astro}" }
  );
  const r = run(["sync"], dir);
  const ev = events(dir);
  assert("astro.many-attributes.read-in-part", /src\/Big\.astro: template events were not scanned - a tag has about 1500 attributes \(limit 1000\)/.test(r.all), r.all);
  assert("astro.many-attributes.frontmatter-still-read", ev.includes("astro_front") && !ev.includes("astro_after"), JSON.stringify(ev));
  assert("astro.900-attributes.read-fully", ev.includes("astro_900_attrs"), JSON.stringify(ev));
  assert("astro.unclosed-scripts.reported-and-fast", /src\/Scripts\.astro: template events were not scanned/.test(r.all) && ev.includes("astro_scripts_front") && r.ms < 60_000, `${r.ms} ms | ${r.all}`);
  info("astro.limits", `${r.ms} ms`);
}

for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
console.log(`\n=== Summary (2.6.8): ${pass} passed, ${fail} failed ===`);
if (fail) {
  for (const f of failures) console.log(` - ${f.name}: ${f.reason}`);
  process.exit(1);
}
