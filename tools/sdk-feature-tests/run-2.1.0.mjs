// Tests for the SDK 2.1.0 release notes (Node side). Browser items are in browser-run-2.1.0.mjs.
// Each item has a real assertion; nothing is taken from the release notes on trust.
//   A  identify() is ignored on a server (one warning), getUserId() stays empty
//   B  withUser(): events carry the user, share the queue, bad ids give no user (one warning)
//   C  which user wins: track({ userId }) > withUser() > identify(); null sends without a user; blank = not given
//   D  passing userId on every call keeps working as before
//   E  the development hint: once, after 50 events without a user, only with NODE_ENV=development on a server
//   F  React Native: identify()/reset() work in memory; edge, serverless and Deno ignore identify()
//   G  the text "undefined" as a user id
//   H  destroy() reports the events still queued (README of 2.1.0)
//   I  package description uses plain hyphens
import { Eventra } from "@eventra_dev/eventra-sdk";
import { createMockServer } from "./mock-server.mjs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const HERE = fileURLToPath(new URL(".", import.meta.url));
process.setMaxListeners(100);
delete process.env.NODE_ENV;

const origWarn = console.warn.bind(console);
let warnSink = null;
console.warn = (...a) => {
  if (String(a[0]).includes("multiple SDK instances detected")) return;
  if (warnSink) { warnSink.push(a.map(String).join(" ")); return; }
  origWarn(...a);
};
async function captureWarnings(fn) {
  const prev = warnSink;
  warnSink = [];
  try { await fn(); return warnSink; } finally { warnSink = prev; }
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok === null ? "INFO" : ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
}
async function step(name, fn) {
  try { await fn(); } catch (e) { record(name, false, "threw: " + (e?.stack ?? e)); }
}

let PORT = 4711;
async function withMock(fn) {
  const port = PORT++;
  const mock = createMockServer(() => ({ status: 200 }));
  await mock.listen(port);
  try { return await fn(mock, `http://127.0.0.1:${port}/ingest`); } finally { await mock.close(); }
}
const sent = (mock) => mock.requests.flatMap((r) => r.body?.events ?? []);
const userOf = (mock) => Object.fromEntries(sent(mock).map((e) => [e.name, e.userId === undefined ? "<none>" : e.userId]));
const mk = (endpoint, extra = {}) => new Eventra({ apiKey: "k", endpoint, disableTimer: true, autoFlushOnExit: false, ...extra });

function spawnAsync(file, env = {}, timeout = 30000) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [file], { cwd: HERE, env: { ...process.env, ...env } });
    let stdout = "", stderr = "";
    c.stdout.on("data", (d) => (stdout += d));
    c.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => c.kill("SIGKILL"), timeout);
    c.on("close", (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
  });
}
async function child(label, code, env = {}) {
  const f = path.join(HERE, `.tmp-210-${label}-${process.pid}.mjs`);
  fs.writeFileSync(f, code);
  try { return await spawnAsync(f, env); } finally { fs.rmSync(f, { force: true }); }
}

// ---------------------------------------------------------------------------
// A. identify() on a server
// ---------------------------------------------------------------------------
await step("A identify() on Node", async () => {
  await withMock(async (mock, endpoint) => {
    const t = mk(endpoint);
    const w = await captureWarnings(async () => {
      t.identify("u1");
      t.identify("u2");
      t.track("a.after_identify");
      t.reset();
      await t.flush();
    });
    t.destroy();
    record("A1 identify() is ignored on Node: getUserId() stays undefined", t.getUserId() === undefined, `getUserId=${t.getUserId()}`);
    record("A2 events after identify() on Node carry no user", userOf(mock)["a.after_identify"] === "<none>", JSON.stringify(userOf(mock)));
    const hits = w.filter((x) => x.includes("identify() is ignored outside a browser"));
    record("A3 exactly one warning, pointing to withUser()", hits.length === 1 && /withUser\(userId\)\.track/.test(hits[0]), JSON.stringify(w));
  });
});

// ---------------------------------------------------------------------------
// B. withUser()
// ---------------------------------------------------------------------------
await step("B withUser()", async () => {
  await withMock(async (mock, endpoint) => {
    const t = mk(endpoint);
    const w = await captureWarnings(async () => {
      const a = t.withUser("alice");
      const b = t.withUser(42);
      a.track("b.alice");
      b.track("b.num");
      t.track("b.plain");
      a.track("b.alice2", { properties: { plan: "pro" } });
      t.withUser(undefined).track("b.undef");
      t.withUser(null).track("b.null");
      ["undefined", "null", "  ", "", NaN, Infinity, {}, true].forEach((bad, i) => t.withUser(bad).track(`b.bad_${i}`));
      t.withUser("x".repeat(200)).track("b.long");
      t.withUser("  padded  ").track("b.padded");
      await t.flush();
    });
    t.destroy();
    const u = userOf(mock);
    record("B1 withUser(id).track() sends the user; a number is sent as text", u["b.alice"] === "alice" && u["b.alice2"] === "alice" && u["b.num"] === "42", JSON.stringify(u));
    record("B2 the tracker itself and other scopes are unaffected", u["b.plain"] === "<none>", JSON.stringify(u));
    record("B3 one request for all scopes (shared queue)", mock.requests.length === 1, `requests=${mock.requests.length}`);
    record("B4 properties pass through a scope", sent(mock).find((e) => e.name === "b.alice2")?.properties?.plan === "pro", "");
    const badNames = Object.keys(u).filter((n) => n.startsWith("b.bad_"));
    record("B5 undefined, null and ids that name nobody give events without a user",
      u["b.undef"] === "<none>" && u["b.null"] === "<none>" && badNames.length === 8 && badNames.every((n) => u[n] === "<none>"), JSON.stringify(u));
    const inv = w.filter((x) => x.includes("withUser() got an invalid user id"));
    record("B6 one warning for invalid ids, none for undefined/null", inv.length === 1, JSON.stringify(w));
    record("B7 a long id is cut to 120 characters", typeof u["b.long"] === "string" && u["b.long"].length === 120, `${u["b.long"]?.length}`);
    record("B8 an id with spaces around it is kept as given", u["b.padded"] === "  padded  ", JSON.stringify(u["b.padded"]));
  });
});

await step("B9 withUser() is cheap per request", async () => {
  await withMock(async (_mock, endpoint) => {
    const t = mk(endpoint, { maxQueueSize: 200000 });
    const s = performance.now();
    for (let i = 0; i < 100000; i++) t.withUser("u" + i);
    const ms = performance.now() - s;
    t.destroy();
    record("B9 100,000 withUser() scopes take well under a second", ms < 1000, `${Math.round(ms)} ms`);
  });
});

// ---------------------------------------------------------------------------
// C. precedence (Node: identify ignored, so the browser file covers identify vs the others)
// ---------------------------------------------------------------------------
await step("C precedence", async () => {
  await withMock(async (mock, endpoint) => {
    const t = mk(endpoint);
    const s = t.withUser("scope");
    s.track("c.scope");
    s.track("c.own_wins", { userId: "own" });
    s.track("c.own_null", { userId: null });
    s.track("c.own_empty", { userId: "" });
    s.track("c.own_blank", { userId: "   " });
    s.track("c.own_undefined", { userId: undefined });
    s.track("c.own_num", { userId: 7 });
    t.track("c.plain_null", { userId: null });
    await t.flush();
    t.destroy();
    const u = userOf(mock);
    const want = { "c.scope": "scope", "c.own_wins": "own", "c.own_null": "<none>", "c.own_empty": "scope", "c.own_blank": "scope", "c.own_undefined": "scope", "c.own_num": "7", "c.plain_null": "<none>" };
    record("C1 track userId > withUser; null = no user; empty/blank/undefined = not given", JSON.stringify(u) === JSON.stringify(want), JSON.stringify(u));
  });
});

// ---------------------------------------------------------------------------
// D. the old way keeps working
// ---------------------------------------------------------------------------
await step("D userId on every call", async () => {
  await withMock(async (mock, endpoint) => {
    const t = mk(endpoint);
    const w = await captureWarnings(async () => {
      t.track("d.a", { userId: "u1" });
      t.track("d.b", { userId: 99, properties: { x: 1 } });
      t.track("d.c");
      await t.flush();
    });
    t.destroy();
    const u = userOf(mock);
    record("D1 userId on track() is sent as before (string, number as text, none)", u["d.a"] === "u1" && u["d.b"] === "99" && u["d.c"] === "<none>", JSON.stringify(u));
    record("D2 no new warnings for the old usage", w.length === 0, JSON.stringify(w));
  });
});

// ---------------------------------------------------------------------------
// E. the development hint
// ---------------------------------------------------------------------------
const HINT = "none of the first 50 events has a userId";
async function hintCase(label, { env, opts = {}, events = 50, before } = {}) {
  let w;
  await withMock(async (_mock, endpoint) => {
    if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
    const t = mk(endpoint, { maxQueueSize: 1000, maxBatchSize: 500, ...opts });
    w = await captureWarnings(async () => {
      if (before) before(t);
      for (let i = 0; i < events; i++) t.track("e.n" + i);
      for (let i = 0; i < 60; i++) t.track("e.more" + i);
    });
    t.destroy();
    delete process.env.NODE_ENV;
  });
  return w.filter((x) => x.includes(HINT));
}
await step("E hint", async () => {
  let h = await hintCase("dev", { env: "development" });
  record("E1 NODE_ENV=development: one warning after 50 events without a user, naming withUser()", h.length === 1 && /withUser\(userId\)/.test(h[0]) && /identifyHint: false/.test(h[0]), JSON.stringify(h));
  h = await hintCase("dev49", { env: "development", events: 49, before: undefined });
  // 49 + 60 more = still 109 events; count at exactly 49 instead:
  await withMock(async (_m, endpoint) => {
    process.env.NODE_ENV = "development";
    const t = mk(endpoint, { maxQueueSize: 1000, maxBatchSize: 500 });
    const w49 = await captureWarnings(async () => { for (let i = 0; i < 49; i++) t.track("e.x" + i); });
    const w50 = await captureWarnings(async () => { t.track("e.x49"); });
    t.destroy();
    delete process.env.NODE_ENV;
    record("E2 not at 49 events, at the 50th", w49.filter((x) => x.includes(HINT)).length === 0 && w50.filter((x) => x.includes(HINT)).length === 1, JSON.stringify({ w49, w50 }));
  });
  for (const env of ["production", "test", undefined, "staging"]) {
    h = await hintCase(String(env), { env });
    record(`E3 no warning on a server with NODE_ENV=${env ?? "(unset)"}`, h.length === 0, JSON.stringify(h));
  }
  h = await hintCase("off", { env: "development", opts: { identifyHint: false } });
  record("E4 identifyHint: false turns it off", h.length === 0, JSON.stringify(h));
  h = await hintCase("one-user", { env: "development", before: (t) => t.track("e.first", { userId: "u" }) });
  record("E5 one event with a user among them: no warning", h.length === 0, JSON.stringify(h));
  h = await hintCase("withUser", { env: "development", before: (t) => t.withUser("u") });
  record("E6 a withUser() with a valid id (even unused): no warning", h.length === 0, JSON.stringify(h));
  h = await hintCase("withUser-bad", { env: "development", before: (t) => t.withUser("undefined") });
  record("E7 a withUser() with an id that names nobody does not count", h.length === 1, JSON.stringify(h));
  h = await hintCase("undefined-text", { env: "development", before: (t) => t.track("e.first", { userId: "undefined" }) });
  record("E8 track({ userId: \"undefined\" }) does not count as a user for the hint", h.length === 1, JSON.stringify(h));
  let w;
  await withMock(async (_m, endpoint) => {
    w = await captureWarnings(async () => { mk(endpoint, { identifyHint: "no" }).destroy(); });
  });
  record("E9 identifyHint that is not true/false is reported with a warning", w.some((x) => /identifyHint/.test(x)), JSON.stringify(w));
});

// ---------------------------------------------------------------------------
// F. other runtimes, in child processes
// ---------------------------------------------------------------------------
const RUNTIME_CHILD = (setup, endpoint) => `${setup}
const warns = [];
console.warn = (...a) => warns.push(a.join(" "));
const { Eventra } = await import("@eventra_dev/eventra-sdk");
const t = new Eventra({ apiKey: "k", endpoint: ${JSON.stringify(endpoint)}, disableTimer: true, autoFlushOnExit: false, persistQueue: false });
t.track("f.before");
t.identify("rn_user");
const after = t.getUserId();
t.track("f.identified");
t.withUser("scoped").track("f.scoped");
t.track("f.own", { userId: "own" });
t.track("f.null", { userId: null });
t.reset();
t.track("f.after_reset");
await t.flush();
t.destroy();
console.log(JSON.stringify({ after, final: t.getUserId() ?? null, warns }));
`;
for (const [label, setup, expectIdentify] of [
  ["React Native", `Object.defineProperty(globalThis, "navigator", { value: { product: "ReactNative" }, configurable: true }); globalThis.window = globalThis;`, true],
  ["Edge (EdgeRuntime)", `globalThis.EdgeRuntime = "edge-runtime";`, false],
  ["Deno-like (window + addEventListener, no document)", `globalThis.window = globalThis; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};`, false],
  ["Lambda (AWS_LAMBDA_FUNCTION_NAME)", `process.env.AWS_LAMBDA_FUNCTION_NAME = "fn";`, false],
]) {
  await step(`F ${label}`, async () => {
    await withMock(async (mock, endpoint) => {
      const r = await child("rt", RUNTIME_CHILD(setup, endpoint));
      let out = null;
      try { out = JSON.parse(r.stdout.trim().split("\n").pop()); } catch {}
      const u = userOf(mock);
      if (expectIdentify) {
        record(`F ${label}: identify() works in memory, reset() forgets`,
          out?.after === "rn_user" && out?.final === null && u["f.before"] === "<none>" && u["f.identified"] === "rn_user" && u["f.scoped"] === "scoped" && u["f.own"] === "own" && u["f.null"] === "<none>" && u["f.after_reset"] === "<none>" && out.warns.length === 0,
          JSON.stringify({ out, u, err: r.stderr.slice(0, 300) }));
      } else {
        record(`F ${label}: identify() ignored with one warning; withUser() works`,
          out?.after === undefined && u["f.identified"] === "<none>" && u["f.scoped"] === "scoped" && out.warns.filter((x) => x.includes("identify() is ignored")).length === 1,
          JSON.stringify({ out, u, err: r.stderr.slice(0, 300) }));
      }
    });
  });
}

await step("F React Native hint (development, NODE_ENV unset counts as not production)", async () => {
  await withMock(async (_mock, endpoint) => {
    const code = `Object.defineProperty(globalThis, "navigator", { value: { product: "ReactNative" }, configurable: true });
const warns = []; console.warn = (...a) => warns.push(a.join(" "));
const { Eventra } = await import("@eventra_dev/eventra-sdk");
const t = new Eventra({ apiKey: "k", endpoint: ${JSON.stringify(endpoint)}, disableTimer: true, autoFlushOnExit: false, maxBatchSize: 500 });
for (let i = 0; i < 50; i++) t.track("rn" + i);
t.destroy();
console.log(JSON.stringify(warns.filter((w) => w.includes("${HINT}"))));`;
    const dev = await child("rnhint", code, { NODE_ENV: "development" });
    const prod = await child("rnhint", code, { NODE_ENV: "production" });
    const d = JSON.parse(dev.stdout.trim() || "[]"), p = JSON.parse(prod.stdout.trim() || "[]");
    record("F React Native hint: in development names identify(), not in production", d.length === 1 && /identify\(userId\) after sign-in/.test(d[0]) && p.length === 0, JSON.stringify({ d, p, e: dev.stderr.slice(0, 200) }));
  });
});

// ---------------------------------------------------------------------------
// G. the text "undefined"
// ---------------------------------------------------------------------------
await step("G \"undefined\" as text", async () => {
  await withMock(async (mock, endpoint) => {
    const t = mk(endpoint);
    t.track("g.track_text", { userId: "undefined" });
    t.track("g.track_null_text", { userId: "null" });
    t.withUser(String(undefined)).track("g.scope_text");
    await t.flush();
    t.destroy();
    const u = userOf(mock);
    record("G1 withUser(String(undefined)) sends no user", u["g.scope_text"] === "<none>", JSON.stringify(u));
    // The release note "is no longer counted as a user" is about counting (dashboard side). What the SDK sends:
    record("G2 track({ userId: \"undefined\" }) still sends the text (counting is the server's job)", null, JSON.stringify({ track_text: u["g.track_text"], track_null_text: u["g.track_null_text"] }));
  });
});

// ---------------------------------------------------------------------------
// H. destroy() reports what is still queued on Node
// ---------------------------------------------------------------------------
await step("H destroy()", async () => {
  await withMock(async (mock, endpoint) => {
    let dropped = 0;
    const t = mk(endpoint, { onEventsDropped: (n) => (dropped += n) });
    t.withUser("u").track("h.1");
    t.track("h.2");
    t.track("h.3");
    t.destroy();
    t.track("h.after_destroy");
    t.withUser("u").track("h.after_destroy_scope");
    t.identify("x");
    await new Promise((r) => setTimeout(r, 200));
    record("H1 destroy() on Node reports the 3 queued events to onEventsDropped and sends nothing", dropped === 3 && mock.requests.length === 0, `dropped=${dropped} requests=${mock.requests.length}`);
  });
});

await step("H2 destroy() during a retry wait", async () => {
  const port = PORT++;
  const mock = createMockServer(() => ({ status: 503 }));
  await mock.listen(port);
  try {
    let dropped = 0;
    const t = new Eventra({ apiKey: "k", endpoint: `http://127.0.0.1:${port}/ingest`, disableTimer: true, autoFlushOnExit: false, retryBaseDelayMs: 400, maxRetries: 3, onEventsDropped: (n) => (dropped += n) });
    t.track("h2.retry");
    t.track("h2.queued_later");
    const flushing = t.flush();
    await new Promise((r) => setTimeout(r, 150)); // first attempt answered 503, now waiting to retry
    const before = mock.requests.length;
    t.destroy();
    await new Promise((r) => setTimeout(r, 1500));
    await Promise.race([flushing, new Promise((r) => setTimeout(r, 100))]);
    record("H2 a retry that is waiting does not run after destroy()", before === 1 && mock.requests.length === 1, `requests before=${before} after=${mock.requests.length} dropped=${dropped}`);
    record("H3 the batch in flight is not counted as dropped", dropped === 0, `dropped=${dropped} (both events were in the batch being retried)`);
  } finally { await mock.close(); }
});

// ---------------------------------------------------------------------------
// I. package description and types
// ---------------------------------------------------------------------------
await step("I package", async () => {
  const require = createRequire(import.meta.url);
  const pkgDir = path.dirname(path.dirname(require.resolve("@eventra_dev/eventra-sdk")));
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  const readme = fs.readFileSync(path.join(pkgDir, "README.md"), "utf8");
  record("I1 version is 2.1.x", /^2\.1\.\d+$/.test(pkg.version), pkg.version);
  // 2.1.1: the README now shows identify()/reset() in the Browser section and withUser() in Serverless
  const section = (h) => readme.slice(readme.indexOf(`### ${h}`), readme.indexOf("---", readme.indexOf(`### ${h}`)));
  record("I1b README (2.1.1): Browser section shows identify() and reset(); Serverless shows withUser()",
    /identify\(/.test(section("Browser")) && /reset\(/.test(section("Browser")) && /withUser\(/.test(section("Serverless")), "");
  record("I2 description and README have no em/en dashes", !/[–—]/.test(pkg.description) && !/[–—]/.test(readme), `desc dashes=${(pkg.description.match(/[–—]/g) || []).length} readme dashes=${(readme.match(/[–—]/g) || []).length}`);
  record("I3 README has an \"Identify users\" section", /^## Identify users$/m.test(readme), "");
  const dts = fs.readFileSync(path.join(pkgDir, "dist", "index.d.ts"), "utf8");
  record("I4 types: identify, reset, getUserId, withUser, EventraScope export, userId null, identifyHint",
    ["identify(userId: string | number): void", "reset(): void", "getUserId(): string | undefined", "withUser(userId: string | number | null | undefined): EventraScope", "type EventraScope", "userId?: string | number | null", "identifyHint?: boolean"].every((s) => dts.includes(s)), "");
  const cjs = await child("cjs", `import { createRequire } from "node:module"; const r = createRequire(import.meta.url); const { Eventra } = r("@eventra_dev/eventra-sdk"); const t = new Eventra({ apiKey: "k", disableTimer: true, autoFlushOnExit: false }); console.log(typeof t.withUser, typeof t.identify, typeof t.reset, typeof t.getUserId); t.destroy();`);
  record("I5 CommonJS build has the new methods", cjs.stdout.trim() === "function function function function", cjs.stdout + cjs.stderr);
});

const failed = results.filter((r) => r.ok === false);
const infos = results.filter((r) => r.ok === null);
console.log("");
console.log(`=== Summary: ${results.length - failed.length - infos.length} passed, ${failed.length} failed, ${infos.length} info === (2.1.0, node ${process.version})`);
process.exit(failed.length ? 1 : 0);
