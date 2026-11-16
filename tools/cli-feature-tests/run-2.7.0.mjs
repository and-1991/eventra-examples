// Live checks for eventra-cli 2.7.0 (with SDK 2.1.0) and cli-plugin-angular 1.3.4.
// One section per claim, each with a real assertion; nothing is taken from the release notes on trust.
//   1  events sent through withUser() are found (chain, variable, typed parameter, untyped tracker)
//   2  `eventra check` gives a tip when no tracking call says which user it belongs to (and only then)
//   3  wrappers called through .call / .apply (README, not in the release notes)
//   4  a template with one known value is that one name (README)
//   5  a plugin installed under another name (npm alias) is refused (README)
//   6  `send` with broken JSON in eventra.json names the problem
//   7  Astro: a template expression that does not parse is reported
//   8  Angular 1.3.4: template expression errors give line and column
//   9  a file far over sync.maxFileSize is refused before it is read
//  10  `send` retry messages go to stderr (2.7.0 diff), stdout keeps only the result
// Fixtures live in temp dirs INSIDE this package, so the SDK and plugin imports resolve.
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVENTRA_BIN = path.join(HERE, "..", "..", "node_modules", ".bin", "eventra");
const CONFIG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eventra-config-270-"));
process.env.EVENTRA_CONFIG_DIR = CONFIG_DIR;

let pass = 0;
let fail = 0;
const failures = [];
const KNOWN_GAPS = [];
const assert = (name, cond, reason) => {
  if (KNOWN_GAPS.some((re) => re.test(name))) {
    if (cond) {
      fail++;
      failures.push({ name, reason: "known gap closed upstream: remove it from KNOWN_GAPS and document it" });
      console.log(`FAIL ${name} [known gap closed upstream]`);
    } else {
      pass++;
      console.log(`GAP  ${name}`);
    }
    return;
  }
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    failures.push({ name, reason });
    console.log(`FAIL ${name} (${String(reason ?? "assertion failed").slice(0, 600)})`);
  }
};
const info = (n, t) => console.log(`INFO ${n}: ${t}`);

const dirs = [];
function project(files, { plugins = [], include = "src/**/*.ts", events = [], extraSync = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(HERE, ".tmp-270-"));
  dirs.push(dir);
  fs.writeFileSync(
    path.join(dir, "eventra.json"),
    JSON.stringify(
      { apiKey: "", endpoint: "http://localhost:4000/x", events, functionWrappers: [], plugins, sync: { include: [include], exclude: ["node_modules"], ...extraSync } },
      null,
      2
    )
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}
const events = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "eventra.json"), "utf8")).events;
function run(args, cwd, env = {}, timeout = 120_000) {
  const r = spawnSync(EVENTRA_BIN, args, { cwd, env: { ...process.env, FORCE_COLOR: "0", EVENTRA_API_KEY: "k", ...env }, encoding: "utf8", timeout, input: "" });
  return { code: r.status ?? 124, all: (r.stdout ?? "") + (r.stderr ?? ""), stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}
const SDK = 'import { Eventra } from "@eventra_dev/eventra-sdk";\nconst t = new Eventra({ apiKey: "x" });\n';
const TIP = /Tip: no Eventra track\(\) call passes a userId/;

// ---------------------------------------------------------------------------
// 1. withUser()
// ---------------------------------------------------------------------------
{
  const dir = project({
    "src/a.ts":
      SDK +
      'import type { EventraScope } from "@eventra_dev/eventra-sdk";\n' +
      "declare const id: string;\n" +
      't.withUser(id).track("wu_chain");\n' +
      'const s = t.withUser(id);\ns.track("wu_var");\n' +
      't.withUser(id)?.track("wu_optional");\n' +
      'const typed: EventraScope = t.withUser(42);\ntyped.track("wu_typed");\n' +
      'function inRequest(scope: EventraScope) { scope.track("wu_param"); }\ninRequest(s);\n' +
      't.withUser(null).track("wu_null");\n' +
      't.withUser(id).track("wu_props", { properties: { plan: "pro" }, userId: null });\n' +
      'let anyT: any = new Eventra({ apiKey: "y" });\nanyT.withUser(id).track("wu_any_tracker");\n' +
      "export function dyn(n: string) { t.withUser(id).track(n); }\n",
    "src/req.ts":
      SDK +
      'const req: any = {};\nreq.tracker = t.withUser("u");\nreq.tracker.track("wu_untyped_holder");\n',
    "src/own.ts":
      'interface EventraScope { track(n: string): void }\nconst mine: EventraScope = { track() {} };\nmine.track("own_scope_not_sdk");\n' +
      'class Other { withUser(_: string) { return { track(_n: string) {} }; } }\nnew Other().withUser("u").track("other_withUser_not_sdk");\n',
  });
  const r = run(["sync"], dir);
  const ev = events(dir);
  for (const n of ["wu_chain", "wu_var", "wu_optional", "wu_typed", "wu_param", "wu_null", "wu_props", "wu_any_tracker"]) {
    assert(`withUser.found.${n}`, ev.includes(n), JSON.stringify(ev) + " | " + r.all);
  }
  assert("withUser.inside-a-function-is-a-wrapper", /~ src\/a\.ts:\d+ t\.withUser\(id\)\.track\(\.\.\.\)/.test(r.all) && /Inside a wrapper/.test(r.all), r.all);
  assert("withUser.documented-gap.untyped-holder-not-followed", !ev.includes("wu_untyped_holder"), JSON.stringify(ev));
  assert("withUser.own-interface-EventraScope-not-counted", !ev.includes("own_scope_not_sdk"), JSON.stringify(ev));
  assert("withUser.own-class-withUser-not-counted", !ev.includes("other_withUser_not_sdk"), JSON.stringify(ev));
  const c = run(["check"], dir);
  assert("withUser.check-agrees-with-sync", c.code === 0 || !/missing|not in eventra\.json/i.test(c.all), `${c.code} ${c.all}`);
  // element access t["withUser"](id).track(...) is not in the detector: informational
  const el = project({ "src/e.ts": SDK + 't["withUser"]("u").track("wu_element_access");\n' });
  run(["sync"], el);
  info("withUser.element-access", events(el).includes("wu_element_access") ? "found" : "not found (t[\"withUser\"](id).track is not followed)");
}

// ---------------------------------------------------------------------------
// 2. the check tip
// ---------------------------------------------------------------------------
function tipCase(label, files, { expectTip, opts = {}, strict = false } = {}) {
  const dir = project(files, opts);
  run(["sync"], dir);
  const r = run(strict ? ["check", "--strict"] : ["check"], dir);
  assert(`tip.${label}`, TIP.test(r.all) === expectTip, `code=${r.code} | ${r.all}`);
  return { dir, r };
}
{
  const { r, dir } = tipCase("no-user-anywhere.shown", { "src/a.ts": SDK + 't.track("tip_a");\nt.track("tip_b", { properties: { x: 1 } });\n' }, { expectTip: true });
  assert("tip.is-not-a-failure", r.code === 0, `${r.code} ${r.all}`);
  assert("tip.names-the-fix-and-docs", /identify\(userId\)/.test(r.all) && /withUser\(\)/.test(r.all) && /https:\/\/eventra\.dev\/docs#sdk-identify/.test(r.all), r.all);
  assert("tip.goes-to-stderr", TIP.test(r.stderr) && !TIP.test(r.stdout), JSON.stringify({ out: r.stdout, err: r.stderr }));
  const strict = run(["check", "--strict"], dir);
  assert("tip.strict-still-exit-0", strict.code === 0 && TIP.test(strict.all), `${strict.code} ${strict.all}`);
  const sync = run(["sync"], dir);
  assert("tip.not-printed-by-sync", !TIP.test(sync.all), sync.all);
  // a check that fails for another reason (event missing from eventra.json) still shows it, and still fails
  fs.appendFileSync(path.join(dir, "src/a.ts"), 't.track("tip_new_unsynced");\n');
  const failing = run(["check"], dir);
  info("tip.with-failing-check", `exit ${failing.code}, tip ${TIP.test(failing.all) ? "shown" : "not shown"}`);
  assert("tip.failing-check-still-fails", failing.code !== 0, `${failing.code} ${failing.all}`);
}
tipCase("userId-literal.hidden", { "src/a.ts": SDK + 't.track("u1");\nt.track("u2", { userId: "x" });\n' }, { expectTip: false });
tipCase("userId-shorthand.hidden", { "src/a.ts": SDK + 'declare const userId: string;\nt.track("u1", { userId });\n' }, { expectTip: false });
tipCase("userId-null-literal.hidden", { "src/a.ts": SDK + 't.track("u1", { userId: null });\n' }, { expectTip: false });
tipCase("userId-getter.hidden", { "src/a.ts": SDK + 't.track("u1", { get userId() { return "x"; } });\n' }, { expectTip: false });
tipCase("spread.hidden", { "src/a.ts": SDK + 'declare const o: object;\nt.track("u1", { ...o });\n' }, { expectTip: false });
tipCase("options-variable.hidden", { "src/a.ts": SDK + 'declare const o: { userId?: string };\nt.track("u1", o);\n' }, { expectTip: false });
tipCase("identify.hidden", { "src/a.ts": SDK + 't.identify("u");\nt.track("u1");\n' }, { expectTip: false });
tipCase("identify-in-other-file.hidden", { "src/a.ts": SDK + 'export { t };\nt.track("u1");\n', "src/auth.ts": 'import { t } from "./a";\nexport const signIn = (id: string) => t.identify(id);\n' }, { expectTip: false });
tipCase("withUser.hidden", { "src/a.ts": SDK + 't.track("u1");\nt.withUser("u").track("u2");\n' }, { expectTip: false });
tipCase("withUser-unused-scope.hidden", { "src/a.ts": SDK + 't.track("u1");\nexport const s = t.withUser("u");\n' }, { expectTip: false });
tipCase("reset-only.shown", { "src/a.ts": SDK + 't.track("u1");\nt.reset();\n' }, { expectTip: true });
tipCase("properties-userId-not-a-user.shown", { "src/a.ts": SDK + 't.track("u1", { properties: { userId: "x" } });\n' }, { expectTip: true });
tipCase("no-track-calls.hidden", { "src/a.ts": SDK + "export { t };\n" }, { expectTip: false });
tipCase("own-class-identify-does-not-count.shown", { "src/a.ts": SDK + 'class Auth { identify(_: string) {} }\nnew Auth().identify("u");\nt.track("u1");\n' }, { expectTip: true });
tipCase(
  "wrapper-without-user.shown",
  { "src/a.ts": SDK + 'export function trackFeature(n: string) { t.track(n); }\ntrackFeature("w1");\n' },
  { expectTip: true }
);
tipCase(
  "wrapper-forwarding-user.hidden",
  { "src/a.ts": SDK + 'export function trackFeature(n: string, userId?: string) { t.track(n, { userId }); }\ntrackFeature("w1");\n' },
  { expectTip: false }
);
tipCase("syntax-error-file.hidden", { "src/a.ts": SDK + 't.track("s1");\n', "src/b.ts": "const x = ((((1;\n" }, { expectTip: false });
tipCase(
  "identify-in-vue-sfc.hidden",
  {
    "src/t.ts": SDK + 'export { t };\nt.track("vue_u1");\n',
    "src/Login.vue": '<script setup lang="ts">\nimport { t } from "./t";\nfunction done(id: string) { t.identify(id); }\n</script>\n<template><button @click="done(\'1\')">in</button></template>\n',
  },
  { expectTip: false, opts: { plugins: ["@eventra_dev/cli-plugin-vue"], include: "src/**/*.{ts,vue}" } }
);

// ---------------------------------------------------------------------------
// 3. .call / .apply
// ---------------------------------------------------------------------------
{
  const dir = project({
    "src/a.ts":
      SDK +
      "function trackFeature(name: string) { t.track(name); }\n" +
      'trackFeature("ca_direct");\n' +
      'trackFeature.call(null, "ca_call");\n' +
      'trackFeature.apply(null, ["ca_apply"]);\n' +
      'const args: [string] = ["ca_apply_variable"];\ntrackFeature.apply(null, args);\n' +
      'const more: string[] = [];\ntrackFeature.apply(null, [...more, "ca_after_spread"] as [string]);\n' +
      'function twoArgs(prefix: string, name: string) { t.track(name); }\ntwoArgs.call(null, "p", "ca_second_arg");\ntwoArgs.apply(null, ["p", "ca_second_apply"]);\n' +
      'function withThis(this: unknown, name: string) { t.track(name); }\nwithThis.call({}, "ca_this_call");\nwithThis.apply({}, ["ca_this_apply"]);\nwithThis.call(null, "ca_this_plain");\n' +
      'function withThis2(this: unknown, prefix: string, name: string) { t.track(name); }\nwithThis2.call({}, "p", "ca_this2_call");\nwithThis2.apply({}, ["p", "ca_this2_apply"]);\nwithThis2.call(null, "p", "ca_this2_plain");\n',
  });
  const r = run(["sync"], dir);
  const ev = events(dir);
  for (const n of ["ca_direct", "ca_call", "ca_apply", "ca_second_arg", "ca_second_apply"]) assert(`callApply.found.${n}`, ev.includes(n), JSON.stringify(ev) + " | " + r.all);
  assert("callApply.this-param.call", ev.includes("ca_this_call"), JSON.stringify(ev));
  assert("callApply.this-param.apply", ev.includes("ca_this_apply"), JSON.stringify(ev));
  // 2.7.1: a TypeScript `this:` parameter is not an argument, also in a plain call and for a second parameter
  assert("callApply.this-param.second-param-call", ev.includes("ca_this2_call") && ev.includes("ca_this2_apply") && ev.includes("ca_this2_plain"), JSON.stringify(ev));
  assert("callApply.this-param.plain-call", ev.includes("ca_this_plain"), JSON.stringify(ev));
  assert("callApply.apply-variable-not-read (documented)", !ev.includes("ca_apply_variable"), JSON.stringify(ev));
  assert("callApply.spread-before-not-read (documented)", !ev.includes("ca_after_spread"), JSON.stringify(ev));
}

// ---------------------------------------------------------------------------
// 4. a template with one known value
// ---------------------------------------------------------------------------
{
  const dir = project({
    "src/a.ts":
      SDK +
      'const type = "signup";\nt.track(`feature_${type}`);\n' +
      'const a = "x", b = "y";\nt.track(`two_${a}_${b}`);\n' +
      'declare const flag: boolean;\nconst two = flag ? "on" : "off";\nt.track(`toggle_${two}`);\n',
  });
  const r = run(["sync"], dir);
  const ev = events(dir);
  assert("template.one-value.is-a-name", ev.includes("feature_signup"), JSON.stringify(ev));
  assert("template.all-parts-known.is-a-name", ev.includes("two_x_y"), JSON.stringify(ev));
  assert("template.one-value.not-listed-as-dynamic", !/feature_\$\{type\}|feature_signup.*dynamic/i.test(r.all), r.all);
  info("template.two-values", `events=${JSON.stringify(ev.filter((e) => e.startsWith("toggle")))} output=${JSON.stringify(r.all.split("\n").filter((l) => /toggle/.test(l)))}`);
}

// ---------------------------------------------------------------------------
// 5. plugin installed under another name
// ---------------------------------------------------------------------------
{
  const dir = project({ "src/a.ts": SDK + 't.track("alias_x");\n' }, { plugins: ["@eventra_dev/cli-plugin-vue"] });
  const pkgDir = path.join(dir, "node_modules", "@eventra_dev", "cli-plugin-vue");
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({ name: "other-package", version: "1.0.0", main: "index.js" }));
  const marker = path.join(dir, "RAN");
  fs.writeFileSync(path.join(pkgDir, "index.js"), `require("fs").writeFileSync(${JSON.stringify(marker)}, "1"); module.exports = {};`);
  const r = run(["sync"], dir);
  assert("pluginAlias.refused-with-message", /Refusing to load plugin "@eventra_dev\/cli-plugin-vue": the package installed under that name is "other-package"/.test(r.all), r.all);
  assert("pluginAlias.code-never-ran", !fs.existsSync(marker), "marker file written");
  assert("pluginAlias.non-zero-exit", r.code !== 0, `${r.code}`);
  // the documented limit: a folder that claims the official name is loaded
  fs.writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({ name: "@eventra_dev/cli-plugin-vue", version: "1.0.0", main: "index.js" }));
  run(["sync"], dir);
  info("pluginAlias.same-name-folder", fs.existsSync(marker) ? "loaded (as documented: a folder claiming the official name is imported)" : "not loaded");
  // the real installed plugin still loads
  const ok = project({ "src/a.ts": SDK + 't.track("real_plugin_ok");\n' }, { plugins: ["@eventra_dev/cli-plugin-vue"] });
  const r2 = run(["sync"], ok);
  assert("pluginAlias.real-plugin-still-loads", r2.code === 0 && events(ok).includes("real_plugin_ok"), r2.all);
}

// ---------------------------------------------------------------------------
// 6. send with broken JSON
// ---------------------------------------------------------------------------
{
  const dir = project({ "src/a.ts": SDK });
  fs.writeFileSync(path.join(dir, "eventra.json"), '{ "events": [ "a", }');
  const r = run(["send"], dir);
  assert("send.bad-json.not-called-missing", !/eventra\.json not found/.test(r.all) && /eventra\.json/.test(r.all) && r.code !== 0, `${r.code} ${r.all}`);
  info("send.bad-json", r.all.trim());
  const none = fs.mkdtempSync(path.join(HERE, ".tmp-270-"));
  dirs.push(none);
  const r2 = run(["send"], none);
  assert("send.missing.still-says-run-init", /eventra\.json not found\. Run 'eventra init'/.test(r2.all), r2.all);
}

// ---------------------------------------------------------------------------
// 7. Astro: a broken template expression
// ---------------------------------------------------------------------------
{
  const dir = project(
    {
      "src/t.ts": SDK + "export { t };\n",
      "src/Bad.astro": '---\nimport { t } from "./t";\nt.track("astro_bad_front");\n---\n<button onclick={() => t.track("astro_broken"}>x</button>\n',
      "src/Good.astro": '---\nimport { t } from "./t";\n---\n<button onclick={() => t.track("astro_good")}>x</button>\n',
    },
    { plugins: ["@eventra_dev/cli-plugin-astro"], include: "src/**/*.{ts,astro}" }
  );
  const r = run(["sync"], dir);
  const ev = events(dir);
  assert("astro.broken-expression.reported", /src\/Bad\.astro.*the code built from the template does not parse/.test(r.all), r.all);
  assert("astro.broken-expression.scan-not-clean", /The scan was not clean/.test(r.all), r.all);
  assert("astro.good-file-unaffected", ev.includes("astro_good") && !/Good\.astro.*does not parse/.test(r.all), JSON.stringify(ev) + " | " + r.all);
  const strict = run(["check", "--strict"], dir);
  assert("astro.broken-expression.fails-strict", strict.code !== 0, `${strict.code} ${strict.all}`);
}

// ---------------------------------------------------------------------------
// 8. Angular 1.3.4: line and column for expression errors
// ---------------------------------------------------------------------------
{
  const dir = project(
    {
      "src/t.ts": SDK + "export { t };\n",
      "src/ext.component.ts":
        'import { Component } from "@angular/core";\n@Component({ selector: "x-ext", templateUrl: "./ext.component.html" })\nexport class Ext {}\n',
      "src/ext.component.html": '<div>\n  <p>ok</p>\n  <button (click)="go(">x</button>\n</div>\n',
      "src/inl.component.ts":
        'import { Component } from "@angular/core";\n@Component({ selector: "x-inl", template: `<div>\n  <button (click)="go(">x</button>\n</div>` })\nexport class Inl {}\n',
    },
    { plugins: ["@eventra_dev/cli-plugin-angular"], include: "src/**/*.{ts,html}" }
  );
  const r = run(["sync"], dir);
  const extLine = r.all.split("\n").find((l) => /ext\.component/.test(l) && /column/.test(l)) ?? "";
  const inlLine = r.all.split("\n").find((l) => /inl\.component/.test(l) && /column/.test(l)) ?? "";
  assert("angular.external.line-and-column", /\(line 3, column \d+\)/.test(extLine) && !/template\.html@/.test(r.all), r.all);
  assert("angular.inline.line-and-column-of-the-template", /\(line 2, column \d+ of the template\)/.test(inlLine), r.all);
  info("angular.messages", JSON.stringify([extLine.trim(), inlLine.trim()]));
}

{
  // 1.3.5: the plugin README describes the error the way the plugin prints it
  const readme = fs.readFileSync(path.join(HERE, "..", "..", "examples", "frontend", "angular", "node_modules", "@eventra_dev", "cli-plugin-angular", "README.md"), "utf8");
  const pkg = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", "examples", "frontend", "angular", "node_modules", "@eventra_dev", "cli-plugin-angular", "package.json"), "utf8"));
  assert("angular.plugin-version-1.3.x", /^1\.3\.\d+$/.test(pkg.version), pkg.version);
  assert("angular.readme-says-line-and-column", /\(line N, column M\)/.test(readme) && !/<compiler diagnostic> \(line N\)/.test(readme), "README still says (line N) only");
}

// ---------------------------------------------------------------------------
// 9. a file far over sync.maxFileSize is refused by size
// ---------------------------------------------------------------------------
{
  const big = SDK + 't.track("over_limit");\n' + "//" + "x".repeat(1000) + "\n";
  // under 200 characters but over 200 bytes (the euro sign is 3 bytes in UTF-8): read, since the limit is in characters
  const multi = SDK + 't.track("multibyte_ok");//' + "€".repeat(40) + "\n";
  const dir = project({ "src/big.ts": big, "src/multi.ts": multi }, { extraSync: { maxFileSize: 200 } });
  const r = run(["sync"], dir);
  const ev = events(dir);
  assert("oversize.refused-with-reason", /big\.ts.*larger than 200 characters \(sync\.maxFileSize\)/.test(r.all) && !ev.includes("over_limit"), r.all);
  assert("oversize.fixture-is-right", multi.length <= 200 && Buffer.byteLength(multi) > 200, `${multi.length} chars, ${Buffer.byteLength(multi)} bytes`);
  assert("oversize.multibyte-under-char-limit-still-read", ev.includes("multibyte_ok"), JSON.stringify(ev) + " | " + r.all);
}

// ---------------------------------------------------------------------------
// 10. send: retry progress on stderr
// ---------------------------------------------------------------------------
function runAsync(args, cwd, env = {}, timeout = 60_000) {
  return new Promise((resolve) => {
    const c = spawn(EVENTRA_BIN, args, { cwd, env: { ...process.env, FORCE_COLOR: "0", EVENTRA_API_KEY: "k", ...env } });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => c.kill("SIGKILL"), timeout);
    c.stdout.on("data", (d) => (stdout += d));
    c.stderr.on("data", (d) => (stderr += d));
    c.on("close", (code) => (clearTimeout(timer), resolve({ code: code ?? 124, stdout, stderr, all: stdout + stderr })));
    c.stdin.end("");
  });
}
{
  const PORT = 4597;
  let failNext = 0;
  const server = http.createServer((q, r) => {
    q.resume();
    q.on("end", () => {
      if (failNext > 0) { failNext--; r.writeHead(503).end('{"error":"busy"}'); }
      else r.writeHead(200).end('{"ok":true}');
    });
  });
  await new Promise((res) => server.listen(PORT, "127.0.0.1", res));
  try {
    const dir = project({ "src/a.ts": SDK + 't.track("send_retry");\n' });
    const cfgPath = path.join(dir, "eventra.json");
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    cfg.endpoint = `http://127.0.0.1:${PORT}/api/v1/cli/events`;
    cfg.events = ["send_retry"];
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
    await runAsync(["send", "--trust-endpoint"], dir);
    failNext = 2;
    const r = await runAsync(["send"], dir);
    assert("send.retry.succeeds-after-503", r.code === 0, `${r.code} ${r.all}`);
    assert("send.retry.progress-on-stderr", /Attempt 1\/\d+ failed \(503\)/.test(r.stderr) && !/Attempt/.test(r.stdout), JSON.stringify({ out: r.stdout, err: r.stderr }));
  } finally {
    await new Promise((res) => server.close(res));
  }
}

for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
console.log(`\n=== Summary (2.7.0): ${pass} passed, ${fail} failed ===`);
if (fail) {
  for (const f of failures) console.log(` - ${f.name}: ${f.reason}`);
  process.exit(1);
}
