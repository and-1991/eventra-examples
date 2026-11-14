// Live regression suite for the CLI-core items of the eventra-cli 2.6.5 release notes.
// One section per claim; every claim has at least one real assertion. A failing assertion is a
// finding (behavior contradicts the notes), it is never weakened. `info()` lines record behavior
// the notes do not promise (shown, not counted).
//
// Everything runs in fresh temp directories, with timeouts so nothing can hang.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Since eventra-cli 2.6.8 endpoint approvals live in a per-user folder ($EVENTRA_CONFIG_DIR, else ~/.config/eventra).
// Point it at a temp folder so the suite never writes into the real one.
if (!process.env.EVENTRA_TEST_KEEP_CONFIG_DIR) {
  process.env.EVENTRA_CONFIG_DIR = (await import("node:fs")).mkdtempSync(
    (await import("node:path")).join((await import("node:os")).tmpdir(), "eventra-config-")
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTRA_BIN = path.join(__dirname, "..", "..", "node_modules", ".bin", "eventra");

let pass = 0;
let fail = 0;
const failures = [];
const ok = (n) => (pass++, console.log(`PASS ${n}`));
const bad = (n, r) => (fail++, failures.push({ name: n, reason: r }), console.log(`FAIL ${n} (${r})`));
// No known gaps left. (A "gap" for check --fix was a test bug: sync had already rewritten the file.)
const KNOWN_GAPS = [];
const assert = (n, c, r) => {
  if (KNOWN_GAPS.some((re) => re.test(n))) {
    if (c) return bad(`${n} [known gap closed upstream: remove it from KNOWN_GAPS and document it]`, "fixed");
    console.log(`GAP  ${n}`);
    return pass++;
  }
  return c ? ok(n) : bad(n, String(r ?? "assertion failed").slice(0, 400));
};
const info = (n, t) => console.log(`INFO ${n}: ${t}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SDK = 'import { Eventra } from "@eventra_dev/eventra-sdk";\nconst t = new Eventra({ apiKey: "x" });\n';

function mk(name) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `eventra-265-${name}-`));
  return d;
}
function write(cwd, rel, text) {
  fs.mkdirSync(path.dirname(path.join(cwd, rel)), { recursive: true });
  fs.writeFileSync(path.join(cwd, rel), text);
}
function cfg(cwd, over = {}, syncOver = {}) {
  const c = {
    apiKey: "",
    endpoint: "http://localhost:4000/x",
    events: [],
    plugins: [],
    sync: { include: ["**/*.ts"], ...syncOver },
    ...over,
  };
  fs.writeFileSync(path.join(cwd, "eventra.json"), JSON.stringify(c, null, 2));
}
const readCfg = (cwd) => JSON.parse(fs.readFileSync(path.join(cwd, "eventra.json"), "utf8"));
const events = (cwd) => new Set(readCfg(cwd).events);

function run(args, cwd, env = {}, timeout = 90_000) {
  const r = spawnSync(EVENTRA_BIN, args, { cwd, env: { ...process.env, ...env }, encoding: "utf8", timeout });
  return { code: r.status ?? (r.signal ? 124 : 1), stdout: r.stdout ?? "", stderr: r.stderr ?? "", all: (r.stdout ?? "") + (r.stderr ?? "") };
}
function runAsync(args, cwd, env = {}, timeout = 90_000) {
  return new Promise((resolve) => {
    const c = spawn(EVENTRA_BIN, args, { cwd, env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => c.kill("SIGKILL"), timeout);
    c.stdout.on("data", (d) => (stdout += d));
    c.stderr.on("data", (d) => (stderr += d));
    c.on("close", (code) => (clearTimeout(timer), resolve({ code: code ?? 124, stdout, stderr, all: stdout + stderr })));
    c.stdin.end("");
  });
}
async function waitFor(cond, ms = 20_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if (cond()) return true;
    } catch {}
    await sleep(250);
  }
  return false;
}
const cleanup = (d) => fs.rmSync(d, { recursive: true, force: true });

// ---------------------------------------------------------------------------
// 1. very deep code does not stop the scan; listed as skipped with the reason
// ---------------------------------------------------------------------------
function testDeepFile() {
  const cwd = mk("deep");
  cfg(cwd);
  write(cwd, "src/deep.ts", "const x = " + "[".repeat(3000) + "1" + "]".repeat(3000) + ";\n");
  write(cwd, "src/ok.ts", SDK + 't.track("deep_other_file_event");\n');
  const s = run(["sync"], cwd);
  assert("deep.sync-completes-without-crash", s.code === 0, `exit ${s.code}: ${s.all}`);
  assert("deep.rest-of-scan-continues", events(cwd).has("deep_other_file_event"), s.all);
  assert("deep.listed-as-skipped-with-file-name", /Skipped 1 file/.test(s.all) && /src\/deep\.ts/.test(s.all), s.all);
  assert("deep.reason-given", /nests too deeply/.test(s.all), s.all);
  const c = run(["check"], cwd);
  assert("deep.check-also-lists-it", /src\/deep\.ts: the code nests too deeply/.test(c.all) && c.code === 0, c.all);
  const st = run(["sync", "--strict"], cwd);
  assert("deep.strict-fails", st.code === 1, `exit ${st.code}`);
  assert("deep.check-strict-fails", run(["check", "--strict"], cwd).code === 1, "check --strict exit != 1");
  cleanup(cwd);
}

// ---------------------------------------------------------------------------
// 2. files not read: plugin missing, too large, syntax error, nothing matched; --strict; known events kept
// ---------------------------------------------------------------------------
function testNotRead() {
  // plugin missing
  {
    const cwd = mk("noplugin");
    cfg(cwd, {}, { include: ["src/**/*.{ts,vue}"] });
    write(cwd, "src/A.vue", "<template><div/></template>\n");
    write(cwd, "src/a.ts", SDK + 't.track("np_event");\n');
    for (const cmd of ["sync", "check"]) {
      const r = run([cmd], cwd);
      assert(`notread.plugin-missing.${cmd}-names-file`, /\.vue file not read/.test(r.all) && /src\/A\.vue/.test(r.all), r.all);
      assert(`notread.plugin-missing.${cmd}-says-what-to-install`, /npm install -D @eventra_dev\/cli-plugin-vue/.test(r.all) && /"plugins"/.test(r.all), r.all);
      assert(`notread.plugin-missing.${cmd}-scan-not-clean`, /scan was not clean/.test(r.all), r.all);
    }
    assert("notread.plugin-missing.sync-strict-fails", run(["sync", "--strict"], cwd).code === 1, "exit != 1");
    assert("notread.plugin-missing.check-strict-fails", run(["check", "--strict"], cwd).code === 1, "exit != 1");
    cleanup(cwd);
  }
  // too large
  {
    const cwd = mk("large");
    cfg(cwd, {}, { maxFileSize: 1000 });
    write(cwd, "src/big.ts", SDK + 't.track("large_event");\n// ' + "x".repeat(5000) + "\n");
    write(cwd, "src/ok.ts", SDK + 't.track("large_ok");\n');
    const s = run(["sync"], cwd);
    assert("notread.too-large.sync-names-file", /big\.ts: file is larger than/.test(s.all), s.all);
    assert("notread.too-large.event-not-read-but-scan-goes-on", events(cwd).has("large_ok") && !events(cwd).has("large_event"), s.all);
    assert("notread.too-large.check-names-file", /big\.ts: file is larger than/.test(run(["check"], cwd).all), "no message");
    assert("notread.too-large.strict-fails", run(["sync", "--strict"], cwd).code === 1 && run(["check", "--strict"], cwd).code === 1, "exit != 1");
    cleanup(cwd);
  }
  // syntax error
  {
    const cwd = mk("syntax");
    cfg(cwd);
    write(cwd, "src/bad.ts", SDK + 't.track("syn_bad";\n');
    write(cwd, "src/ok.ts", SDK + 't.track("syn_ok");\n');
    for (const cmd of ["sync", "check"]) {
      const r = run([cmd], cwd);
      assert(`notread.syntax.${cmd}-names-file-and-line`, /Syntax errors in 1 file/.test(r.all) && /src\/bad\.ts: line 3/.test(r.all), r.all);
    }
    assert("notread.syntax.strict-fails", run(["sync", "--strict"], cwd).code === 1 && run(["check", "--strict"], cwd).code === 1, "exit != 1");
    assert("notread.syntax.plain-sync-exits-0", run(["sync"], cwd).code === 0, "exit != 0");
    cleanup(cwd);
  }
  // nothing matched + keeps known events
  {
    const cwd = mk("nomatch");
    cfg(cwd, { events: ["keep_a", "keep_b"] }, { include: ["nomatch/**/*.ts"] });
    write(cwd, "src/ok.ts", SDK + 't.track("nm_ok");\n');
    const s = run(["sync"], cwd);
    assert("notread.nothing-matched.sync-says-so-with-pattern", /No file matched sync\.include \(nomatch\/\*\*\/\*\.ts\)/.test(s.all), s.all);
    assert("notread.nothing-matched.sync-keeps-known-events", [...events(cwd)].sort().join() === "keep_a,keep_b", [...events(cwd)].join());
    const c = run(["check"], cwd);
    assert("notread.nothing-matched.check-says-so", /No file matched sync\.include/.test(c.all), c.all);
    assert("notread.nothing-matched.strict-fails", run(["sync", "--strict"], cwd).code === 1 && run(["check", "--strict"], cwd).code === 1, "exit != 1");
    cleanup(cwd);
  }
  // sync keeps known events instead of replacing them with a shorter list (skipped file in scan)
  {
    const cwd = mk("keepknown");
    cfg(cwd, { events: ["known_from_skipped", "known_other"] });
    write(cwd, "src/deep.ts", "const x = " + "[".repeat(3000) + "1" + "]".repeat(3000) + ";\n");
    write(cwd, "src/ok.ts", SDK + 't.track("kk_ok");\n');
    const s = run(["sync"], cwd);
    assert(
      "notread.sync-keeps-known-events-when-files-skipped",
      ["known_from_skipped", "known_other", "kk_ok"].every((e) => events(cwd).has(e)),
      [...events(cwd)].join()
    );
    assert("notread.sync-says-known-events-were-kept", /previously known events were kept/.test(s.all), s.all);
    // control: a clean scan does replace the list with the shorter fresh one
    cleanup(path.join(cwd, "src", "deep.ts"));
    run(["sync"], cwd);
    assert("notread.control-clean-scan-replaces-list", [...events(cwd)].join() === "kk_ok", [...events(cwd)].join());
    cleanup(cwd);
  }
}

// ---------------------------------------------------------------------------
// 3. more ways of calling track(); callbacks are unknown names in --strict
// ---------------------------------------------------------------------------
function testCallForms() {
  const cwd = mk("forms");
  cfg(cwd);
  write(
    cwd,
    "src/forms.ts",
    SDK +
      `t.track("f_plain");
t?.track("f_optional");
t["track"]("f_bracket");
t.track.call(t, "f_call");
const alias = t;
alias.track("f_alias");
class S { private tr = new Eventra({ apiKey: "x" }); go() { this.tr.track("f_class_field"); } }
(t as any).track("f_cast");
export const tracker = { t, fire: (n: string) => t.track(n) };
tracker.fire("f_arrow_wrapper");
const { track } = t;
track("f_destructured");
const bound = t.track.bind(t);
bound("f_bound");
t.track.apply(t, ["f_apply"]);
`
  );
  run(["sync"], cwd);
  const ev = events(cwd);
  for (const e of ["f_plain", "f_optional", "f_bracket", "f_call", "f_alias", "f_class_field", "f_cast", "f_arrow_wrapper"]) {
    assert(`forms.${e}`, ev.has(e), "not found");
  }
  // Not promised by the notes: recorded, not counted.
  for (const e of ["f_destructured", "f_bound", "f_apply"]) info(`forms.${e}`, ev.has(e) ? "found" : "NOT found (call form not followed)");
  cleanup(cwd);

  // callbacks
  for (const [label, body] of [
    ["forEach", '["a1"].forEach((n) => t.track(n));'],
    ["map", '["b1"].map((n) => t.track(n));'],
    ["event-listener", 'document.addEventListener("click", (e) => t.track(e.type));'],
    ["map-forEach", "new Map<string, number>().forEach((v, k) => t.track(k));"],
  ]) {
    const d = mk("cb");
    cfg(d);
    write(d, "src/a.ts", SDK + 't.track("cb_static");\n' + body + "\n");
    const s = run(["sync", "--strict"], d);
    assert(`callback.${label}.reported-as-dynamic-callback`, /\[callback:/.test(s.stdout) && /src\/a\.ts:\d+ t\.track/.test(s.stdout), s.stdout);
    assert(`callback.${label}.strict-fails`, s.code === 1, `exit ${s.code}`);
    assert(`callback.${label}.plain-sync-exits-0`, run(["sync"], d).code === 0, "exit != 0");
    cleanup(d);
  }
  const d = mk("cbclean");
  cfg(d);
  write(d, "src/a.ts", SDK + 't.track("only_static");\n');
  assert("callback.control-static-only-strict-passes", run(["sync", "--strict"], d).code === 0, "exit != 0");
  cleanup(d);
}

// ---------------------------------------------------------------------------
// 4. sync.include / sync.exclude path forms, node_modules, symlink loops
// ---------------------------------------------------------------------------
function testPaths() {
  const cwd = mk("paths");
  const w = (rel, e) => write(cwd, rel, SDK + `t.track("${e}");\n`);
  w("src/a/one.ts", "ev_a");
  w("src/b/deep/two.ts", "ev_b_deep");
  w("src/gen/g.ts", "ev_gen");
  w("src/a/x.test.ts", "ev_test");
  w("lib/l.ts", "ev_lib");
  w("node_modules/pkg/i.ts", "ev_nm");
  w("packages/x/node_modules/y/i.ts", "ev_nm_nested");
  const get = (sync) => {
    cfg(cwd, {}, sync);
    run(["sync"], cwd);
    return events(cwd);
  };
  const withEx = (ex) => get({ include: ["**/*.ts"], exclude: ex });

  for (const form of ["src/gen", "src/gen/", "./src/gen", "/src/gen", "src/gen/**", "**/gen/**"]) {
    const ev = withEx([form]);
    assert(`paths.exclude[${form}]`, !ev.has("ev_gen") && ev.has("ev_a") && ev.has("ev_lib"), [...ev].join());
  }
  {
    const ev = withEx(["**/*.test.ts"]);
    assert("paths.exclude[**/*.test.ts]", !ev.has("ev_test") && ev.has("ev_a"), [...ev].join());
  }
  for (const form of ["./src/**/*.ts", "src/**", "src/{a,gen}/**/*.ts"]) {
    const ev = get({ include: [form] });
    assert(`paths.include[${form}]`, ev.has("ev_a") && !ev.has("ev_lib"), [...ev].join());
  }
  assert("paths.include[src/{a,gen}/**/*.ts].brace-excludes-b", !get({ include: ["src/{a,gen}/**/*.ts"] }).has("ev_b_deep"), "b/deep included");
  assert("paths.include[exact file]", [...get({ include: ["src/a/one.ts"] })].join() === "ev_a", "not exactly one.ts");

  // not promised, recorded only
  const bare = get({ include: ["src"] });
  info("paths.include[bare directory 'src']", bare.size ? "matches" : "matches nothing (reported as 'No file matched')");
  info("paths.exclude[*.test.ts unanchored]", withEx(["*.test.ts"]).has("ev_test") ? "does NOT match nested files" : "matches nested files");
  info("paths.exclude[absolute path]", withEx([path.join(cwd, "src/gen")]).has("ev_gen") ? "ignored" : "works");

  // node_modules is always left out
  for (const [label, sync] of [
    ["default-exclude", { include: ["**/*.ts"] }],
    ["empty-exclude", { include: ["**/*.ts"], exclude: [] }],
    ["include-names-it", { include: ["node_modules/**/*.ts", "**/node_modules/**/*.ts", "lib/*.ts"], exclude: [] }],
  ]) {
    const ev = get(sync);
    assert(`paths.node_modules-always-left-out.${label}`, !ev.has("ev_nm") && !ev.has("ev_nm_nested") && ev.has("ev_lib"), [...ev].join());
  }

  // symlink loops do not make a scan run forever
  fs.symlinkSync("..", path.join(cwd, "src/a/loop"));
  fs.symlinkSync("../../src", path.join(cwd, "src/b/loop2"));
  fs.symlinkSync("nonexistent", path.join(cwd, "src/dangling.ts"));
  fs.symlinkSync(".", path.join(cwd, "self"));
  cfg(cwd, {}, { include: ["**/*.ts"] });
  const t0 = Date.now();
  const r = run(["sync"], cwd, {}, 40_000);
  const dt = (Date.now() - t0) / 1000;
  assert("paths.symlink-loop.finishes-fast", r.code === 0 && dt < 30, `exit ${r.code} after ${dt.toFixed(1)}s`);
  assert("paths.symlink-loop.real-files-still-found", events(cwd).has("ev_a") && events(cwd).has("ev_lib"), [...events(cwd)].join());
  assert("paths.symlink-loop.no-duplicate-blowup", events(cwd).size === 5, `events: ${[...events(cwd)].join()}`);
  const c = run(["check"], cwd, {}, 40_000);
  assert("paths.symlink-loop.check-finishes", c.code === 0, `exit ${c.code}`);
  cleanup(cwd);
}

// ---------------------------------------------------------------------------
// 5. eventra.json: extra keys kept by sync, check --fix, watch; wrong type reported
// ---------------------------------------------------------------------------
async function testConfigKeys() {
  const cwd = mk("keys");
  write(cwd, "src/a.ts", SDK + 't.track("k1");\n');
  const base = () => ({
    apiKey: "",
    endpoint: "http://localhost:4000/x",
    events: ["old"],
    plugins: [],
    myExtra: { n: [1, 2], deep: { x: true } },
    $schema: "https://example.com/s.json",
    sync: { include: ["src/**/*.ts"], customSyncKey: 7 },
  });
  const check = (label) => {
    const c = readCfg(cwd);
    assert(`keys.${label}.top-level-extra-kept`, JSON.stringify(c.myExtra) === JSON.stringify(base().myExtra) && c.$schema === base().$schema, JSON.stringify(c));
    assert(`keys.${label}.nested-sync-extra-kept`, c.sync?.customSyncKey === 7, JSON.stringify(c.sync));
    assert(`keys.${label}.events-updated`, c.events.includes("k1") && !c.events.includes("old"), JSON.stringify(c.events));
  };
  fs.writeFileSync(path.join(cwd, "eventra.json"), JSON.stringify(base()));
  run(["sync"], cwd);
  check("sync");
  fs.writeFileSync(path.join(cwd, "eventra.json"), JSON.stringify(base()));
  const f = run(["check", "--fix"], cwd);
  assert("keys.check-fix.exits-0", f.code === 0, f.all);
  check("check-fix");

  // watch
  fs.writeFileSync(path.join(cwd, "eventra.json"), JSON.stringify(base()));
  const child = spawn(EVENTRA_BIN, ["watch"], { cwd, stdio: ["ignore", "pipe", "pipe"] });
  try {
    const okInit = await waitFor(() => readCfg(cwd).events.includes("k1"), 20_000);
    assert("keys.watch.initial-scan-updates-events", okInit, "events not updated by watch");
    write(cwd, "src/b.ts", SDK + 't.track("k2_from_watch");\n');
    const okUpd = await waitFor(() => readCfg(cwd).events.includes("k2_from_watch"), 20_000);
    assert("keys.watch.update-picks-up-new-file", okUpd, "no update");
    const c = readCfg(cwd);
    assert("keys.watch.extra-keys-kept", JSON.stringify(c.myExtra) === JSON.stringify(base().myExtra) && c.$schema === base().$schema && c.sync?.customSyncKey === 7, JSON.stringify(c));
  } finally {
    child.kill("SIGKILL");
  }

  // wrong types: reported, not silently dropped
  const wrong = [
    ["events-string", { events: "notarray" }, /events/i],
    ["functionWrappers-object", { functionWrappers: {} }, /functionWrappers/],
    ["endpoint-number", { endpoint: 5 }, /endpoint/],
    ["apiKey-number", { apiKey: 5 }, /apiKey/],
    ["plugins-string", { plugins: "vue" }, /plugins?/i],
    ["sync.maxFileSize-string", { sync: { include: ["src/**/*.ts"], maxFileSize: "big" } }, /maxFileSize/],
    ["sync.include-object", { sync: { include: {} } }, /sync\.include|include/],
    ["sync.include-boolean", { sync: { include: true } }, /sync\.include|include/],
    ["sync.exclude-object", { sync: { include: ["src/**/*.ts"], exclude: {} } }, /sync\.exclude|exclude/],
    ["sync.exclude-number", { sync: { include: ["src/**/*.ts"], exclude: 5 } }, /sync\.exclude|exclude/],
  ];
  for (const [label, patch, re] of wrong) {
    const c = { ...base(), events: [], ...patch };
    fs.writeFileSync(path.join(cwd, "eventra.json"), JSON.stringify(c));
    const r = run(["sync"], cwd);
    assert(`keys.wrong-type.${label}.reported`, re.test(r.all) && /must be|ignored|skipping|is used|not valid|invalid/i.test(r.all), `no report: ${r.all.replace(/\n/g, " | ")}`);
    assert(`keys.wrong-type.${label}.scan-still-runs`, r.code === 0 && events(cwd).has("k1"), `exit ${r.code}`);
    // sync rewrites eventra.json (drops the bad value), so check --fix needs its own fresh file
    fs.writeFileSync(path.join(cwd, "eventra.json"), JSON.stringify(c));
    const rc = run(["check", "--fix"], cwd);
    assert(`keys.wrong-type.${label}.check-fix-reports-too`, re.test(rc.all) && /must be|ignored|skipping|is used|not valid|invalid/i.test(rc.all), `no report on check --fix: ${rc.all.replace(/\n/g, " | ")}`);
    fs.writeFileSync(path.join(cwd, "eventra.json"), JSON.stringify(c));
    info(`keys.wrong-type.${label}.plain-check`, re.test(run(["check"], cwd).all) ? "reports" : "silent");
  }
  // a single pattern as text is valid on purpose (2.6.7): no warning, scan works
  fs.writeFileSync(path.join(cwd, "eventra.json"), JSON.stringify({ ...base(), events: [], sync: { include: "src/**/*.ts" } }));
  const one = run(["sync"], cwd);
  assert("keys.include-single-string.valid-no-warning", one.code === 0 && !/must be a list/.test(one.all) && events(cwd).has("k1"), one.all);
  cleanup(cwd);
}

// ---------------------------------------------------------------------------
// 6. plugin problems are short messages that say what to install
// ---------------------------------------------------------------------------
function testPluginMessages() {
  const cwd = mk("plugmsg");
  write(cwd, "src/a.ts", SDK + 't.track("pm1");\n');
  // typo'd official name -> short, one line, names the fix
  cfg(cwd, { plugins: ["@eventra_dev/plugin-vue"] }, { include: ["src/**/*.ts"] });
  let r = run(["sync"], cwd);
  assert("plugin-msg.typo-short-one-line", /skipping plugin "@eventra_dev\/plugin-vue"/.test(r.all) && !/\n\s+at /.test(r.all) && r.all.length < 600, r.all);
  assert("plugin-msg.typo-says-what-to-use", /Did you mean @eventra_dev\/cli-plugin-vue/.test(r.all), r.all);
  assert("plugin-msg.typo-scan-continues", r.code === 0 && events(cwd).has("pm1"), `exit ${r.code}`);
  // non-official spec
  cfg(cwd, { plugins: ["left-pad"] }, { include: ["src/**/*.ts"] });
  r = run(["sync"], cwd);
  assert("plugin-msg.non-official-explained-no-stack", /only official @eventra_dev\/cli-plugin-\* packages/.test(r.all) && !/\n\s+at /.test(r.all), r.all);
  // official name that is not installed
  cfg(cwd, { plugins: ["@eventra_dev/cli-plugin-doesnotexist"] }, { include: ["src/**/*.ts"] });
  r = run(["check"], cwd);
  assert("plugin-msg.missing-names-the-plugin-no-stack", /@eventra_dev\/cli-plugin-doesnotexist/.test(r.all) && !/\n\s+at |Require stack/.test(r.all) && r.all.trim().split("\n").length <= 3, r.all);
  assert("plugin-msg.missing-says-what-to-install", /npm install|pnpm add|yarn add|install/i.test(r.all), `message has no install hint: ${r.all.trim().replace(/\n/g, " | ")}`);
  assert("plugin-msg.missing-exits-nonzero", r.code !== 0, `exit ${r.code}`);
  assert("plugin-msg.missing-exact-install-command", /Install it in your project with: npm install -D @eventra_dev\/cli-plugin-doesnotexist/.test(r.all), r.all);
  // installed but throws while loading: its own error, no install hint (2.6.7)
  const brokenDir = path.join(cwd, "node_modules", "@eventra_dev", "cli-plugin-broken");
  fs.mkdirSync(brokenDir, { recursive: true });
  fs.writeFileSync(path.join(brokenDir, "package.json"), JSON.stringify({ name: "@eventra_dev/cli-plugin-broken", version: "1.0.0", main: "index.js" }));
  fs.writeFileSync(path.join(brokenDir, "index.js"), 'throw new Error("boom in plugin");\n');
  cfg(cwd, { plugins: ["@eventra_dev/cli-plugin-broken"] }, { include: ["src/**/*.ts"] });
  r = run(["check"], cwd);
  assert("plugin-msg.installed-but-broken-shows-its-error-no-hint", /boom in plugin/.test(r.all) && !/Install it in your project/.test(r.all) && r.code !== 0, r.all);
  cleanup(cwd);
}

// ---------------------------------------------------------------------------
// 7. tsconfig extending a missing file warns and names the fix
// ---------------------------------------------------------------------------
function testTsconfigExtends() {
  for (const [label, ext, fix] of [
    ["nuxt", "./.nuxt/tsconfig.json", /npx nuxt prepare/],
    ["sveltekit", "./.svelte-kit/tsconfig.json", /npx svelte-kit sync/],
  ]) {
    const cwd = mk("tsc");
    cfg(cwd, {}, { include: ["src/**/*.ts"] });
    write(cwd, "src/a.ts", SDK + 't.track("ts1");\n');
    write(cwd, "tsconfig.json", JSON.stringify({ extends: ext }));
    for (const cmd of ["sync", "check"]) {
      const r = run([cmd], cwd);
      assert(`tsconfig.${label}.${cmd}-warns-extends-missing`, /tsconfig\.json extends a file that does not exist/.test(r.all), r.all);
      assert(`tsconfig.${label}.${cmd}-names-the-fix`, fix.test(r.all), r.all);
      assert(`tsconfig.${label}.${cmd}-does-not-fail`, r.code === 0, `exit ${r.code}`);
    }
    assert(`tsconfig.${label}.event-still-found`, events(cwd).has("ts1"), "event lost");
    cleanup(cwd);
  }
  // generic missing base: warns (fix is the user's, message names the missing file)
  const cwd = mk("tscgen");
  cfg(cwd, {}, { include: ["src/**/*.ts"] });
  write(cwd, "src/a.ts", SDK + 't.track("ts2");\n');
  write(cwd, "tsconfig.json", JSON.stringify({ extends: "./nope/tsconfig.json" }));
  const r = run(["sync"], cwd);
  assert("tsconfig.generic-missing-base-warns-and-names-file", /extends a file that does not exist/.test(r.all) && /nope\/tsconfig\.json/.test(r.all), r.all);
  assert("tsconfig.warning-once-not-per-file", (r.all.match(/extends a file that does not exist/g) || []).length === 1, r.all);
  cleanup(cwd);
}

// ---------------------------------------------------------------------------
// 8. watch: syntax errors from an edit are reported; dependents of a changed file are rescanned
// ---------------------------------------------------------------------------
async function testWatch() {
  const cwd = mk("watch");
  cfg(cwd, {}, { include: ["**/*.ts"] });
  write(cwd, "wrap.ts", SDK + "export function fire(name: string) { console.log(name); }\n");
  write(cwd, "use.ts", 'import { fire } from "./wrap";\nfire("dep_event_one");\n');
  write(cwd, "other.ts", SDK + 't.track("watch_other");\n');
  const child = spawn(EVENTRA_BIN, ["watch"], { cwd, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  try {
    assert("watch.initial-scan", await waitFor(() => events(cwd).has("watch_other")), out);
    assert("watch.initial-wrapper-not-a-wrapper-yet", !events(cwd).has("dep_event_one"), [...events(cwd)].join());

    // dependents: only wrap.ts changes; use.ts must be rescanned and its event appear
    write(cwd, "wrap.ts", SDK + "export function fire(name: string) { t.track(name); }\n");
    assert("watch.dependent-of-changed-file-is-rescanned", await waitFor(() => events(cwd).has("dep_event_one")), `events: ${[...events(cwd)].join()} | ${out}`);
    // and back: removing the forwarding makes the dependent's event go away again
    write(cwd, "wrap.ts", SDK + "export function fire(name: string) { console.log(name); }\n");
    assert("watch.dependent-rescanned-again-on-revert", await waitFor(() => !events(cwd).has("dep_event_one")), `events: ${[...events(cwd)].join()}`);

    // syntax error introduced by an edit
    out = "";
    write(cwd, "other.ts", SDK + 't.track("watch_other";\n');
    const seen = await waitFor(() => /Syntax errors? in 1 file/.test(out) && /other\.ts: line \d+/.test(out), 20_000);
    assert("watch.syntax-error-from-edit-is-reported-with-file-and-line", seen, out);
    // fixing it clears the report and the event stays
    out = "";
    write(cwd, "other.ts", SDK + 't.track("watch_other");\nt.track("watch_other_two");\n');
    assert("watch.fix-brings-events-back", await waitFor(() => events(cwd).has("watch_other_two")), out);
    assert("watch.no-syntax-error-after-fix", !/Syntax error/.test(out), out);
  } finally {
    child.kill("SIGKILL");
    await sleep(200);
    cleanup(cwd);
  }
}

// ---------------------------------------------------------------------------
// 9. eventra send: trims key, explains connection failures, stderr, no duplicates
// ---------------------------------------------------------------------------
function startServer(port) {
  return new Promise((resolve) => {
    const log = [];
    const server = http.createServer((q, r) => {
      let b = "";
      q.on("data", (c) => (b += c));
      q.on("end", () => {
        log.push({ url: q.url, key: q.headers["x-api-key"] ?? q.headers.authorization, body: b });
        r.writeHead(200).end('{"ok":true}');
      });
    });
    server.listen(port, () => resolve({ server, log }));
  });
}
async function testSend() {
  const PORT = 4577;
  const endpoint = `http://localhost:${PORT}/api/v1/cli/events`;
  const mkSend = (events) => {
    const cwd = mk("send");
    cfg(cwd, { endpoint, events }, { include: ["src/**/*.ts"] });
    return cwd;
  };

  // trims a pasted key; sends exactly one request per run
  {
    const cwd = mkSend(["e1", "e2"]);
    const { server, log } = await startServer(PORT);
    try {
      await runAsync(["send", "--trust-endpoint"], cwd, { EVENTRA_API_KEY: "k" });
      log.length = 0;
      const r = await runAsync(["send"], cwd, { EVENTRA_API_KEY: "  pasted-key \r\n" });
      assert("send.trims-pasted-key-env", r.code === 0 && log.length === 1 && log[0].key === "pasted-key", `exit ${r.code} sent key ${JSON.stringify(log[0]?.key)} | ${r.all}`);
      // key pasted into eventra.local.json
      fs.writeFileSync(path.join(cwd, "eventra.local.json"), JSON.stringify({ trustedEndpoint: endpoint, apiKey: "\t local-key  " }));
      log.length = 0;
      const r2 = await runAsync(["send"], cwd, { EVENTRA_API_KEY: "" });
      assert("send.trims-pasted-key-local-json", r2.code === 0 && log[0]?.key === "local-key", `exit ${r2.code} key ${JSON.stringify(log[0]?.key)} | ${r2.all}`);
      // whitespace-only key counts as missing
      log.length = 0;
      fs.writeFileSync(path.join(cwd, "eventra.local.json"), JSON.stringify({ trustedEndpoint: endpoint }));
      const r3 = await runAsync(["send"], cwd, { EVENTRA_API_KEY: "   " });
      assert("send.blank-key-is-missing-key", r3.code === 1 && log.length === 0 && /API key required/.test(r3.stderr), `exit ${r3.code}, requests ${log.length} | ${r3.all}`);
      const r3b = await runAsync(["send"], cwd, { EVENTRA_API_KEY: "" });
      assert("send.missing-key-error-on-stderr", r3b.code === 1 && /EVENTRA_API_KEY/.test(r3b.stderr) && !/EVENTRA_API_KEY/.test(r3b.stdout), `exit ${r3b.code} stderr=${r3b.stderr} stdout=${r3b.stdout}`);
      // single run -> single request, success output on stdout
      log.length = 0;
      const r4 = await runAsync(["send"], cwd, { EVENTRA_API_KEY: "k" });
      assert("send.one-run-one-request", r4.code === 0 && log.length === 1, `requests: ${log.length}`);
      assert("send.success-on-stdout-stderr-empty", /Sent 2 events/.test(r4.stdout) && r4.stderr.trim() === "", `stdout=${r4.stdout} stderr=${r4.stderr}`);
    } finally {
      server.close();
      cleanup(cwd);
    }
  }
  // the same event listed several times in eventra.json is sent once
  {
    const cwd = mkSend(["e1", "e1", "e2", "e2", "e1"]);
    const { server, log } = await startServer(PORT);
    try {
      await runAsync(["send", "--trust-endpoint"], cwd, { EVENTRA_API_KEY: "k" });
      const body = JSON.parse(log[log.length - 1]?.body || "{}");
      const names = body.events || [];
      assert("send.same-event-not-sent-twice", names.length === new Set(names).size, `payload events: ${JSON.stringify(names)}`);
    } finally {
      server.close();
      cleanup(cwd);
    }
  }
  // connection failures explained, errors on stderr
  for (const [label, ep, reason] of [
    ["refused", `http://localhost:${PORT + 1}/api/v1/cli/events`, /ECONNREFUSED/],
    ["unknown-host", "http://nonexistent.invalid/api/v1/cli/events", /ENOTFOUND/],
  ]) {
    const cwd = mkSend(["e1"]);
    cfg(cwd, { endpoint: ep, events: ["e1"] }, { include: ["src/**/*.ts"] });
    try {
      await runAsync(["send", "--trust-endpoint"], cwd, { EVENTRA_API_KEY: "k" }, 30_000);
      const r = await runAsync(["send"], cwd, { EVENTRA_API_KEY: "k" }, 30_000);
      assert(`send.connection-${label}.exit-1`, r.code === 1, `exit ${r.code}`);
      assert(`send.connection-${label}.reason-explained`, reason.test(r.stderr), `stderr=${r.stderr}`);
      assert(`send.connection-${label}.error-on-stderr-not-stdout`, /All retries exhausted/.test(r.stderr) && !/All retries exhausted|ECONNREFUSED|ENOTFOUND/.test(r.stdout), `stdout=${r.stdout}`);
      assert(`send.connection-${label}.retry-progress-shown`, /Attempt 1\/4 failed/.test(r.all), r.all);
    } finally {
      cleanup(cwd);
    }
  }
  // HTTP error bodies also go to stderr
  {
    const cwd = mkSend(["e1"]);
    const server = http.createServer((q, r) => (q.resume(), r.writeHead(401).end('{"error":"unauthorized"}')));
    await new Promise((r) => server.listen(PORT, r));
    try {
      await runAsync(["send", "--trust-endpoint"], cwd, { EVENTRA_API_KEY: "k" });
      const r = await runAsync(["send"], cwd, { EVENTRA_API_KEY: "k" });
      assert("send.http-401.exit-1-error-on-stderr", r.code === 1 && /401|unauthorized/i.test(r.stderr), `exit ${r.code} stderr=${r.stderr} stdout=${r.stdout}`);
    } finally {
      server.close();
      cleanup(cwd);
    }
  }
}

// ---------------------------------------------------------------------------
// 10. eventra init recognises Nuxt, SvelteKit and Angular CLI projects
// ---------------------------------------------------------------------------
function testInit() {
  const cases = [
    ["nuxt", { dependencies: { nuxt: "^3.0.0" } }, {}, "@eventra_dev/cli-plugin-vue"],
    ["nuxt-devdep", { devDependencies: { nuxt: "^3.0.0" } }, {}, "@eventra_dev/cli-plugin-vue"],
    ["sveltekit", { devDependencies: { "@sveltejs/kit": "^2.0.0", svelte: "^5.0.0" } }, {}, "@eventra_dev/cli-plugin-svelte"],
    ["angular-cli", { dependencies: { "@angular/core": "^18.0.0" } }, { "angular.json": "{}" }, "@eventra_dev/cli-plugin-angular"],
  ];
  for (const [label, pkg, files, plugin] of cases) {
    const cwd = mk(`init-${label}`);
    write(cwd, "package.json", JSON.stringify(pkg));
    for (const [f, c] of Object.entries(files)) write(cwd, f, c);
    const r = run(["init", "-y"], cwd);
    assert(`init.${label}.creates-config`, r.code === 0 && fs.existsSync(path.join(cwd, "eventra.json")), r.all);
    const c = fs.existsSync(path.join(cwd, "eventra.json")) ? readCfg(cwd) : { plugins: [] };
    assert(`init.${label}.adds-${plugin.split("-").pop()}-plugin`, c.plugins.includes(plugin), JSON.stringify(c.plugins));
    // the plugin is either wired into "plugins" (checked above) or, when not resolvable, init says what to install
    assert(`init.${label}.output-names-the-plugin`, r.stdout.includes(plugin), r.stdout);
    cleanup(cwd);
  }
  const cwd = mk("init-plain");
  write(cwd, "package.json", JSON.stringify({ dependencies: { express: "^4" } }));
  run(["init", "-y"], cwd);
  assert("init.plain-node-project-gets-no-plugin", readCfg(cwd).plugins.length === 0, JSON.stringify(readCfg(cwd).plugins));
  cleanup(cwd);
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("=== eventra-cli 2.6.5 core release-note items ===\n");
  testDeepFile();
  testNotRead();
  testCallForms();
  testPaths();
  await testConfigKeys();
  testPluginMessages();
  testTsconfigExtends();
  await testWatch();
  await testSend();
  testInit();
  console.log(`\n=== Summary: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f.name}: ${f.reason}`);
    process.exitCode = 1;
  }
}
main();
