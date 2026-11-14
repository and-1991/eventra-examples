// Tests for the SDK items of the 2.0.13 release notes (Node side). Browser items are in browser-run-2.0.13.mjs.
// Each item has a real assertion; nothing is taken from the release notes on trust.
//   A  exitOnSignal defaults to true: SIGTERM/SIGINT end the process after the flush (also as PID 1, `docker stop`)
//   B  maxBatchSize is capped at 500 with a warning
//   C  names made only of characters that cannot be stored do not spoil the batch
//   D  track() with a very large properties object returns fast and drops the event
//   E  the SDK starts in React Native and Deno (window without document / without addEventListener)
import { Eventra } from "@eventra_dev/eventra-sdk";
import { createMockServer } from "./mock-server.mjs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const HERE = fileURLToPath(new URL(".", import.meta.url));
process.setMaxListeners(100);

const origWarn = console.warn.bind(console);
let warnSink = null;
console.warn = (...a) => {
  if (String(a[0]).includes("multiple SDK instances detected")) return;
  if (warnSink) { warnSink.push(a.map(String).join(" ")); return; }
  origWarn(...a);
};

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok === null ? "UNVERIFIED" : ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
}
async function step(name, fn) {
  try { await fn(); } catch (e) { record(name, false, "threw: " + (e?.stack ?? e)); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let PORT = 4661;
async function withMock(behavior, fn) {
  const port = PORT++;
  const mock = createMockServer(behavior);
  await mock.listen(port);
  try { return await fn(mock, `http://127.0.0.1:${port}/ingest`); } finally { await mock.close(); }
}
// async: the mock server lives in this process and must keep answering while a child runs (spawnSync would block it)
function spawnAsync(cmd, args, timeout = 30000) {
  return new Promise((resolve) => {
    const c = spawn(cmd, args, { cwd: HERE });
    let stdout = "", stderr = "";
    c.stdout.on("data", (d) => (stdout += d));
    c.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => c.kill("SIGKILL"), timeout);
    c.on("close", (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
  });
}
const sentNames = (mock) => mock.requests.flatMap((r) => r.body?.events ?? []).map((e) => e.name);

// A child script in this folder (so the SDK import resolves). It stays alive (an interval), tracks one event,
// prints READY, and has a 5 s safety exit with code 99 ("still alive", i.e. the signal did not end it).
function childScript(label, endpoint, opts, extra = "") {
  const f = path.join(HERE, `.tmp-213-${label}-${process.pid}.mjs`);
  fs.writeFileSync(f, `
import { Eventra } from "@eventra_dev/eventra-sdk";
const t = new Eventra({ apiKey: "k", endpoint: ${JSON.stringify(endpoint)}, disableTimer: true ${opts} });
${extra}
setTimeout(() => { console.log("STILL_ALIVE"); process.exit(99); }, 5000).unref();
setInterval(() => {}, 1000);
t.track("sig.${label}");
console.log("READY");
`);
  return f;
}
function runAndSignal(file, signal, wrap = []) {
  return new Promise((resolve) => {
    const cmd = wrap.length ? wrap[0] : process.execPath;
    const args = wrap.length ? [...wrap.slice(1), process.execPath, file] : [file];
    const c = spawn(cmd, args, { cwd: HERE });
    let out = "";
    let sent = false;
    c.stdout.on("data", (d) => {
      out += d;
      if (!sent && out.includes("READY")) { sent = true; setTimeout(() => c.kill(signal), 200); }
    });
    c.stderr.on("data", (d) => (out += d));
    const hard = setTimeout(() => c.kill("SIGKILL"), 15000);
    const t0 = Date.now();
    c.on("close", (code, sig) => { clearTimeout(hard); resolve({ code, sig, out, ms: Date.now() - t0 }); });
  });
}

// ---------------------------------------------------------------------------
// A. signals
// ---------------------------------------------------------------------------
for (const signal of ["SIGTERM", "SIGINT"]) {
  await step(`A1 default: ${signal} ends a process that only has the SDK's handler, after sending`, async () => {
    await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
      const f = childScript(`default-${signal}`, endpoint, "");
      const r = await runAndSignal(f, signal);
      fs.rmSync(f, { force: true });
      record(`A1 default: ${signal} ends a process that only has the SDK's handler, after sending`,
        r.sig === signal && !r.out.includes("STILL_ALIVE") && sentNames(mock).includes(`sig.default-${signal}`),
        `exit=${r.code} signal=${r.sig} in ${r.ms} ms, sent=${JSON.stringify(sentNames(mock))}`);
    });
  });
}

await step("A2 the app's own SIGTERM listener keeps control: SDK flushes, does not end the process", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const f = childScript("own-handler", endpoint, "", 'process.on("SIGTERM", () => console.log("APP_HANDLER"));');
    const r = await runAndSignal(f, "SIGTERM");
    fs.rmSync(f, { force: true });
    record("A2 the app's own SIGTERM listener keeps control: SDK flushes, does not end the process",
      r.out.includes("APP_HANDLER") && r.out.includes("STILL_ALIVE") && r.code === 99 && sentNames(mock).includes("sig.own-handler"),
      `exit=${r.code} signal=${r.sig}, sent=${JSON.stringify(sentNames(mock))}`);
  });
});

await step("A3 exitOnSignal: false keeps the old flush-only behaviour", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const f = childScript("opt-out", endpoint, ", exitOnSignal: false");
    const r = await runAndSignal(f, "SIGTERM");
    fs.rmSync(f, { force: true });
    record("A3 exitOnSignal: false keeps the old flush-only behaviour",
      r.out.includes("STILL_ALIVE") && r.code === 99 && sentNames(mock).includes("sig.opt-out"),
      `exit=${r.code} signal=${r.sig}, sent=${JSON.stringify(sentNames(mock))}`);
  });
});

await step("A4 as PID 1 (docker stop): SIGTERM ends the process with 143 after sending", async () => {
  // a new PID namespace makes node PID 1, as in a container; the kernel ignores a re-raised signal there,
  // so the SDK must exit itself. The child signals itself, as `docker stop` signals PID 1.
  const probe = spawnSync("unshare", ["-Urpf", "--mount-proc", "true"], { encoding: "utf8" });
  if (probe.status !== 0) { record("A4 as PID 1 (docker stop)", null, "unshare with user namespaces not available here"); return; }
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const f = childScript("pid1", endpoint, "", "");
    fs.appendFileSync(f, 'console.log("PID=" + process.pid);\nprocess.kill(process.pid, "SIGTERM");\n');
    const r = await spawnAsync("timeout", ["-s", "KILL", "20", "unshare", "-Urpf", "--mount-proc", process.execPath, f]);
    fs.rmSync(f, { force: true });
    record("A4 as PID 1 (docker stop): SIGTERM ends the process with 143 after sending",
      /PID=1\b/.test(r.stdout) && r.status === 143 && !r.stdout.includes("STILL_ALIVE") && sentNames(mock).includes("sig.pid1"),
      `exit=${r.status} out=${JSON.stringify(r.stdout.trim())} sent=${JSON.stringify(sentNames(mock))}`);
  });
});

// ---------------------------------------------------------------------------
// B. maxBatchSize cap
// ---------------------------------------------------------------------------
await step("B1 maxBatchSize above 500 warns and sends at most 500 events per request", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    warnSink = [];
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 2000, autoFlushOnExit: false });
    const warns = warnSink; warnSink = null;
    for (let i = 0; i < 1200; i++) t.track(`b.e${i}`);
    await t.flush();
    await sleep(100);
    await t.flush();
    const sizes = mock.requests.map((r) => r.body?.events?.length ?? 0);
    t.destroy();
    record("B1 maxBatchSize above 500 warns and sends at most 500 events per request",
      warns.some((w) => /maxBatchSize/.test(w) && /500/.test(w)) && Math.max(...sizes) <= 500 && sizes.reduce((a, b) => a + b, 0) === 1200,
      `warnings=${JSON.stringify(warns)} batches=${JSON.stringify(sizes)}`);
  });
});

await step("B2 maxBatchSize 500 and below: no warning", async () => {
  warnSink = [];
  for (const n of [1, 50, 500]) new Eventra({ apiKey: "k", endpoint: "http://127.0.0.1:1/x", disableTimer: true, maxBatchSize: n, autoFlushOnExit: false }).destroy();
  const warns = warnSink; warnSink = null;
  record("B2 maxBatchSize 500 and below: no warning", warns.length === 0, JSON.stringify(warns));
});

// ---------------------------------------------------------------------------
// C. names that cannot be stored
// ---------------------------------------------------------------------------
await step("C1 a name of only NUL / line breaks / lone surrogates is dropped; the rest of the batch is sent", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    let dropped = 0;
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, autoFlushOnExit: false, onEventsDropped: (n) => (dropped += n) });
    for (const n of ["c.ok1", "\u0000\n", "\r\n\u0000", "\uD800", "c.ok2"]) t.track(n);
    await t.flush();
    t.destroy();
    const names = sentNames(mock);
    record("C1 a name of only NUL / line breaks / lone surrogates is dropped; the rest of the batch is sent",
      JSON.stringify(names) === '["c.ok1","c.ok2"]' && dropped === 3 && mock.requests.length === 1,
      `sent=${JSON.stringify(names)} dropped=${dropped} requests=${mock.requests.length}`);
  });
});

await step("C2 such characters inside a name are removed, the name is kept", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, autoFlushOnExit: false });
    for (const n of ["c.line\nbreak", "c.nul\u0000x", "c.lone\uD800y", "c.pair\u{1F600}ok"]) t.track(n);
    await t.flush();
    t.destroy();
    const names = sentNames(mock);
    const expect = ["c.linebreak", "c.nulx", "c.loney", "c.pair\u{1F600}ok"];
    record("C2 such characters inside a name are removed, the name is kept", JSON.stringify(names) === JSON.stringify(expect), JSON.stringify(names));
  });
});

// ---------------------------------------------------------------------------
// D. very large properties
// ---------------------------------------------------------------------------
await step("D1 track() with very large properties returns fast and drops the event", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    let dropped = 0;
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, autoFlushOnExit: false, onEventsDropped: (n) => (dropped += n) });
    const big = {};
    for (let i = 0; i < 1_000_000; i++) big["k" + i] = i;
    const arr = new Array(5_000_000).fill(1);
    const wide = Array.from({ length: 200_000 }, (_, i) => ({ a: i, b: [i] }));
    const times = [];
    for (const properties of [big, { arr }, { wide }]) {
      const s = performance.now();
      t.track("d.big", { properties });
      times.push(Math.round(performance.now() - s));
    }
    t.track("d.small", { properties: { ok: true } });
    await t.flush();
    t.destroy();
    record("D1 track() with very large properties returns fast and drops the event",
      dropped === 3 && JSON.stringify(sentNames(mock)) === '["d.small"]' && times[1] < 50 && times[2] < 50 && times[0] < 2000,
      `ms=${JSON.stringify(times)} (1M keys, 5M array, 200k nested) dropped=${dropped} sent=${JSON.stringify(sentNames(mock))}`);
  });
});

// ---------------------------------------------------------------------------
// E. React Native and Deno globals
// ---------------------------------------------------------------------------
for (const [label, setup] of [
  ["React Native (window = global, no addEventListener, no document)", "globalThis.window = globalThis;"],
  ["Deno (window with addEventListener, no document)", "globalThis.window = globalThis; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};"],
]) {
  await step(`E starts and sends under ${label}`, async () => {
    await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
      const f = path.join(HERE, `.tmp-213-rt-${process.pid}.mjs`);
      fs.writeFileSync(f, `${setup}
const { Eventra } = await import("@eventra_dev/eventra-sdk");
try {
  const t = new Eventra({ apiKey: "k", endpoint: ${JSON.stringify(endpoint)}, disableTimer: true, autoFlushOnExit: false, persistQueue: false });
  t.track("e.runtime");
  await t.flush();
  t.destroy();
  console.log("STARTED");
} catch (e) { console.log("FAILED " + e.message); }
`);
      const r = await spawnAsync(process.execPath, [f]);
      fs.rmSync(f, { force: true });
      record(`E starts and sends under ${label}`, /STARTED/.test(r.stdout) && sentNames(mock).includes("e.runtime"),
        `${r.stdout.trim()} ${r.stderr.trim().slice(0, 200)} sent=${JSON.stringify(sentNames(mock))}`);
    });
  });
}

const failed = results.filter((r) => r.ok === false);
const unverified = results.filter((r) => r.ok === null);
console.log("");
console.log(`=== Summary: ${results.length - failed.length - unverified.length} passed, ${failed.length} failed, ${unverified.length} unverified === (2.0.13, node ${process.version})`);
process.exit(failed.length ? 1 : 0);
