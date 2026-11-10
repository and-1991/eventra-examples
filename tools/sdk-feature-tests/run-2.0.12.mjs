// Tests for the SDK items of the 2.0.12 release notes (Node side). Browser items are in browser-run-2.0.12.mjs.
// Each item has a real assertion; nothing is taken from the release notes on trust.
import { Eventra } from "@eventra_dev/eventra-sdk";
import { createMockServer } from "./mock-server.mjs";
import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const IS_NODE18_CHILD = process.env.EVENTRA_NODE18_CHILD === "1";
process.setMaxListeners(100);

let multi = 0;
const origWarn = console.warn.bind(console);
let warnSink = null;
console.warn = (...a) => {
  if (String(a[0]).includes("multiple SDK instances detected")) { multi++; return; }
  if (warnSink) { warnSink.push(a.map(String).join(" ")); return; }
  origWarn(...a);
};
function captureWarnings() {
  const sink = [];
  warnSink = sink;
  return { sink, stop: () => { warnSink = null; return sink; } };
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok === null ? "UNVERIFIED" : ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
}
async function step(name, fn) {
  try { await fn(); } catch (e) { record(name, false, "threw: " + (e?.stack ?? e)); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let PORT = 4601;
const nextPort = () => PORT++;
async function withMock(behavior, fn) {
  const port = nextPort();
  const mock = createMockServer(behavior);
  await mock.listen(port);
  try { return await fn(mock, `http://127.0.0.1:${port}/ingest`); } finally { await mock.close(); }
}
const sentEvents = (mock) => mock.requests.flatMap((r) => r.body?.events ?? []);

// ---------------------------------------------------------------------------
// A. flush() waits for events already being sent
// ---------------------------------------------------------------------------
await step("A1 flush() waits for a batch already in flight", async () => {
  await withMock(() => ({ status: 200, delayMs: 400 }), async (mock, endpoint) => {
    let fetchDone = false;
    const fetchImpl = async (u, i) => { const r = await fetch(u, i); fetchDone = true; return r; };
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1, fetchImpl, autoFlushOnExit: false });
    t.track("a1.first"); // reaches maxBatchSize -> send starts now, response arrives in ~400 ms
    await sleep(50);
    const started = mock.requests.length === 1;
    let flushedBeforeResponse = null;
    await t.flush();
    flushedBeforeResponse = !fetchDone;
    t.destroy();
    record("A1 flush() waits for a batch already in flight", started && fetchDone && !flushedBeforeResponse && mock.requests.length === 1,
      `requestStarted=${started} responseSeenWhenFlushReturned=${fetchDone} requests=${mock.requests.length}`);
  });
});

await step("A2 flush() while in flight also delivers an event tracked meanwhile, no duplicates", async () => {
  await withMock(() => ({ status: 200, delayMs: 300 }), async (mock, endpoint) => {
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1, autoFlushOnExit: false });
    t.track("a2.one");
    await sleep(40);
    t.track("a2.two"); // maxBatchSize 1 would send it, but a send is in flight
    await t.flush();
    await sleep(100);
    const names = sentEvents(mock).map((e) => e.name);
    const keys = sentEvents(mock).map((e) => e.idempotencyKey);
    t.destroy();
    record("A2 flush() while in flight also delivers an event tracked meanwhile, no duplicates",
      names.includes("a2.one") && names.includes("a2.two") && new Set(keys).size === keys.length && names.length === 2,
      `names=${JSON.stringify(names)}`);
  });
});

await step("A3 two parallel flush() calls both resolve after delivery, one copy sent", async () => {
  await withMock(() => ({ status: 200, delayMs: 250 }), async (mock, endpoint) => {
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1000, autoFlushOnExit: false });
    t.track("a3.evt");
    const p1 = t.flush();
    const p2 = t.flush();
    await Promise.all([p1, p2]);
    const n = sentEvents(mock).filter((e) => e.name === "a3.evt").length;
    t.destroy();
    record("A3 two parallel flush() calls both resolve after delivery, one copy sent", n === 1, `copies=${n}`);
  });
});

// ---------------------------------------------------------------------------
// B. a script ends within the shutdown limit when the server fails
// ---------------------------------------------------------------------------
function childScript(body) {
  const f = path.join(os.tmpdir(), `eventra-shutdown-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(f, body);
  return f;
}
function spawnAsync(cmd, args, opts) {
  return new Promise((resolve) => {
    const c = spawn(cmd, args, opts);
    let stdout = "", stderr = "";
    c.stdout.on("data", (d) => (stdout += d));
    c.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => c.kill("SIGKILL"), opts?.timeout ?? 60000);
    c.on("close", (status, signal) => { clearTimeout(timer); resolve({ status, signal, stdout, stderr }); });
  });
}
async function runShutdownChild(behavior, trackerOpts, label) {
  return withMock(behavior, async (mock, endpoint) => {
    // the child must resolve the SDK from this folder
    const f = path.join(HERE, `.tmp-shutdown-${label}-${process.pid}.mjs`);
    fs.writeFileSync(f, `
import { Eventra } from "@eventra_dev/eventra-sdk";
const t = new Eventra({ apiKey: "k", endpoint: ${JSON.stringify(endpoint)}, disableTimer: true, ${trackerOpts} });
t.track("b.evt");
const s = Date.now();
await t.shutdown();
console.log("SHUTDOWN_MS=" + (Date.now() - s));
// no process.exit(): the process must end by itself
`);
    // async spawn: the mock server lives in this process and must keep answering while the child runs
    const start = Date.now();
    const r = await spawnAsync(process.execPath, [f], { cwd: HERE, timeout: 40000 });
    const wall = Date.now() - start;
    fs.rmSync(f, { force: true });
    const m = /SHUTDOWN_MS=(\d+)/.exec(r.stdout || "");
    return { wall, shutdownMs: m ? Number(m[1]) : null, status: r.status, signal: r.signal, requests: mock.requests.length, stderr: r.stderr };
  });
}

await step("B1 script ends within shutdownTimeoutMs when the server answers 500", async () => {
  const r = await runShutdownChild(() => ({ status: 500 }), "shutdownTimeoutMs: 1500, maxRetries: 10, retryBaseDelayMs: 2000", "500");
  record("B1 script ends within shutdownTimeoutMs when the server answers 500",
    r.status === 0 && r.requests >= 1 && r.shutdownMs !== null && r.shutdownMs <= 2500 && r.wall < 6000,
    `shutdown=${r.shutdownMs}ms wall=${r.wall}ms exit=${r.status} requests=${r.requests}`);
});

await step("B2 script ends within shutdownTimeoutMs when the server answers 429 Retry-After: 60", async () => {
  const r = await runShutdownChild(() => ({ status: 429, headers: { "retry-after": "60" } }), "shutdownTimeoutMs: 1500", "429");
  record("B2 script ends within shutdownTimeoutMs when the server answers 429 Retry-After: 60",
    r.status === 0 && r.requests >= 1 && r.shutdownMs !== null && r.shutdownMs <= 2500 && r.wall < 6000,
    `shutdown=${r.shutdownMs}ms wall=${r.wall}ms exit=${r.status} requests=${r.requests}`);
});

await step("B3 script ends within shutdownTimeoutMs when the server hangs", async () => {
  const r = await runShutdownChild(() => ({ status: 200, delayMs: 30000 }), "shutdownTimeoutMs: 1500", "hang");
  record("B3 script ends within shutdownTimeoutMs when the server hangs",
    r.status === 0 && r.requests >= 1 && r.shutdownMs !== null && r.shutdownMs <= 3000 && r.wall < 8000,
    `shutdown=${r.shutdownMs}ms wall=${r.wall}ms exit=${r.status} requests=${r.requests}`);
});

await step("B4 script ends within shutdownTimeoutMs when the connection is refused", async () => {
  // nothing listens on this port
  const f = path.join(HERE, `.tmp-shutdown-refused-${process.pid}.mjs`);
  fs.writeFileSync(f, `
import { Eventra } from "@eventra_dev/eventra-sdk";
const t = new Eventra({ apiKey: "k", endpoint: "http://127.0.0.1:1/ingest", disableTimer: true, shutdownTimeoutMs: 1500, retryBaseDelayMs: 2000, maxRetries: 10 });
t.track("b.evt");
const s = Date.now();
await t.shutdown();
console.log("SHUTDOWN_MS=" + (Date.now() - s));
`);
  const start = Date.now();
  const r = spawnSync(process.execPath, [f], { cwd: HERE, encoding: "utf8", timeout: 40000 });
  const wall = Date.now() - start;
  fs.rmSync(f, { force: true });
  const m = /SHUTDOWN_MS=(\d+)/.exec(r.stdout || "");
  record("B4 script ends within shutdownTimeoutMs when the connection is refused",
    r.status === 0 && m && Number(m[1]) <= 2500 && wall < 6000, `shutdown=${m?.[1]}ms wall=${wall}ms exit=${r.status}`);
});

await step("B5 default shutdown limit (10 s) bounds a failing server", async () => {
  const r = await runShutdownChild(() => ({ status: 500 }), "maxRetries: 20, retryBaseDelayMs: 5000", "default");
  record("B5 default shutdown limit (10 s) bounds a failing server",
    r.status === 0 && r.requests >= 1 && r.shutdownMs !== null && r.shutdownMs <= 12000, `shutdown=${r.shutdownMs}ms wall=${r.wall}ms exit=${r.status} requests=${r.requests}`);
});

// ---------------------------------------------------------------------------
// C. Invalid option values are ignored with a warning
// ---------------------------------------------------------------------------
await step("C1 invalid numeric options warn (naming the option) and fall back", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const bad = {
      flushInterval: -5, maxBatchSize: "ten", maxQueueSize: 0, maxRetries: NaN, retryBaseDelayMs: -1,
      maxPayloadBytes: 0, shutdownTimeoutMs: Infinity,
    };
    const cap = captureWarnings();
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, autoFlushOnExit: false, ...bad });
    const warnings = cap.stop();
    const missing = Object.keys(bad).filter((k) => !warnings.some((w) => w.includes(`"${k}"`)));
    t.track("c1.evt");
    await t.flush();
    const delivered = sentEvents(mock).some((e) => e.name === "c1.evt");
    t.destroy();
    record("C1 invalid numeric options warn (naming the option) and fall back", missing.length === 0 && delivered,
      `missingWarnings=${JSON.stringify(missing)} delivered=${delivered} warnings=${warnings.length}`);
  });
});

await step("C2 valid options give no warning", async () => {
  const cap = captureWarnings();
  const t = new Eventra({ apiKey: "k", endpoint: "http://127.0.0.1:1/x", disableTimer: true, autoFlushOnExit: false,
    flushInterval: 1000, maxBatchSize: 10, maxQueueSize: 100, maxRetries: 0, retryBaseDelayMs: 0, maxPayloadBytes: 1000, shutdownTimeoutMs: 0 });
  const w = cap.stop();
  t.destroy();
  record("C2 valid options give no warning", w.length === 0, `warnings=${JSON.stringify(w)}`);
});

await step("C3 flushInterval above the timer maximum is rejected, not turned into a 1 ms loop", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const cap = captureWarnings();
    const t = new Eventra({ apiKey: "k", endpoint, flushInterval: 2 ** 40, autoFlushOnExit: false });
    const w = cap.stop();
    t.track("c3.evt");
    await sleep(300);
    const early = mock.requests.length; // Node would run a 2^31+ timer as 1 ms; the SDK must not
    t.destroy();
    record("C3 flushInterval above the timer maximum is rejected, not turned into a 1 ms loop",
      w.some((x) => x.includes('"flushInterval"')) && early === 0, `warnings=${w.length} requestsWithin300ms=${early}`);
  });
});

await step("C4 invalid options on a never-throwing path: constructor does not throw", async () => {
  const cap = captureWarnings();
  let threw = null;
  try {
    const t = new Eventra({ apiKey: "k", endpoint: "http://127.0.0.1:1/x", disableTimer: true, autoFlushOnExit: false,
      maxBatchSize: null, maxRetries: "3", flushInterval: {}, retryBaseDelayMs: [] });
    t.destroy();
  } catch (e) { threw = e; }
  const w = cap.stop();
  record("C4 invalid options on a never-throwing path: constructor does not throw", threw === null && w.length >= 4,
    `threw=${threw?.message} warnings=${w.length}`);
});

// ---------------------------------------------------------------------------
// D. Changes made to an object after track() do not reach the queue
// ---------------------------------------------------------------------------
await step("D1 mutating properties after track() does not change what is sent", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1000, autoFlushOnExit: false });
    const props = { plan: "free", nested: { seats: 1, tags: ["a"] }, list: [1, 2] };
    const opts = { userId: "u1", properties: props };
    t.track("d1.evt", opts);
    props.plan = "MUTATED";
    props.nested.seats = 999;
    props.nested.tags.push("b");
    props.list.length = 0;
    props.added = true;
    opts.userId = "MUTATED";
    opts.properties = { other: 1 };
    await t.flush();
    const e = sentEvents(mock)[0];
    t.destroy();
    const ok = e && e.userId === "u1" && e.properties.plan === "free" && e.properties.nested.seats === 1
      && JSON.stringify(e.properties.nested.tags) === '["a"]' && JSON.stringify(e.properties.list) === "[1,2]" && !("added" in e.properties);
    record("D1 mutating properties after track() does not change what is sent", !!ok, `sent=${JSON.stringify(e)}`);
  });
});

await step("D2 properties with a throwing getter / toJSON / circular reference: no throw, SDK keeps working", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const dropped = [];
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1000, autoFlushOnExit: false, onEventsDropped: (n) => dropped.push(n) });
    const circ = { a: 1 }; circ.self = circ;
    const getter = { get boom() { throw new Error("getter"); } };
    const toJson = { toJSON() { throw new Error("toJSON"); } };
    let threw = null;
    try {
      t.track("d2.circ", { properties: circ });
      t.track("d2.getter", { properties: getter });
      t.track("d2.tojson", { properties: toJson });
      t.track("d2.ok", { properties: { fine: 1 } });
    } catch (e) { threw = e; }
    await t.flush();
    const names = sentEvents(mock).map((e) => e.name);
    t.destroy();
    record("D2 properties with a throwing getter / toJSON / circular reference: no throw, SDK keeps working",
      threw === null && names.includes("d2.ok") && !names.some((n) => ["d2.circ", "d2.getter", "d2.tojson"].includes(n)) && dropped.length === 3,
      `threw=${threw?.message} sent=${JSON.stringify(names)} dropped=${JSON.stringify(dropped)}`);
  });
});

await step("D3 an event object queued is not shared: a retry resends the original content", async () => {
  let n = 0;
  await withMock(() => (n++ === 0 ? { status: 500 } : { status: 200 }), async (mock, endpoint) => {
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1000, retryBaseDelayMs: 10, autoFlushOnExit: false });
    const props = { v: 1 };
    t.track("d3.evt", { properties: props });
    const p = t.flush();
    props.v = 2; // mutated while the first attempt is failing
    await p;
    const bodies = mock.requests.map((r) => r.body?.events?.[0]?.properties?.v);
    t.destroy();
    record("D3 an event object queued is not shared: a retry resends the original content",
      mock.requests.length >= 2 && bodies.every((v) => v === 1), `valuesPerAttempt=${JSON.stringify(bodies)}`);
  });
});

// ---------------------------------------------------------------------------
// E. Throwing callbacks
// ---------------------------------------------------------------------------
await step("E1 throwing callbacks (sync and async) never break the SDK", async () => {
  await withMock((i) => (i === 0 ? { status: 401 } : { status: 200 }), async (mock, endpoint) => {
    const unhandled = [];
    const onUnhandled = (e) => unhandled.push(e);
    process.on("unhandledRejection", onUnhandled);
    const t = new Eventra({
      apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1000, autoFlushOnExit: false, maxQueueSize: 2,
      onEventsDropped: () => { throw new Error("dropped boom"); },
      onDeliveryFailed: async () => { throw new Error("failed boom (async)"); },
    });
    let threw = null;
    try {
      t.track("e1.a"); t.track("e1.b");
      t.track("e1.overflow"); // queue full -> onEventsDropped throws
      t.track("   "); // invalid -> onEventsDropped throws again
      await t.flush(); // 401 -> async onDeliveryFailed rejects
      t.track("e1.after");
      await t.flush();
    } catch (e) { threw = e; }
    await sleep(100);
    process.off("unhandledRejection", onUnhandled);
    const names = sentEvents(mock).map((e) => e.name);
    t.destroy();
    record("E1 throwing callbacks (sync and async) never break the SDK",
      threw === null && unhandled.length === 0 && names.includes("e1.after"),
      `threw=${threw?.message} unhandled=${unhandled.length} sent=${JSON.stringify(names)}`);
  });
});

await step("E2 throwing onDeliveryFailed during shutdown(): shutdown still resolves", async () => {
  await withMock(() => ({ status: 400 }), async (mock, endpoint) => {
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, autoFlushOnExit: false, onDeliveryFailed: () => { throw new Error("boom"); } });
    t.track("e2.evt");
    let threw = null;
    await t.shutdown().catch((e) => { threw = e; });
    record("E2 throwing onDeliveryFailed during shutdown(): shutdown still resolves", threw === null, `threw=${threw?.message}`);
  });
});

// ---------------------------------------------------------------------------
// F. Names and user ids: cut without splitting an emoji, same as the CLI catalog; numbers and null as user id
// ---------------------------------------------------------------------------
const hasLoneSurrogate = (s) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);
let cliNormalize = null;
{
  const candidates = [
    path.join(HERE, "..", "cli-feature-tests", "node_modules", "@eventra_dev", "eventra-cli", "dist", "analysis", "sdk", "eventraSdk.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { try { cliNormalize = (await import(c)).default?.normalizeEventName ?? (await import(c)).normalizeEventName; } catch {} }
  }
}

await step("F1 name cut at 64 does not split an astral character", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1000, autoFlushOnExit: false });
    const cases = {
      astralAtBoundary: "a".repeat(63) + "\u{1D49C}" + "tail", // high surrogate would be unit 64
      astralFits: "a".repeat(62) + "\u{1D49C}" + "tail",       // pair occupies units 63-64
      emojiAtBoundary: "a".repeat(63) + "😀" + "tail",
      spaceBeforeCut: "a".repeat(62) + " " + "\u{1D49C}",       // cut leaves a trailing space that must be trimmed
    };
    for (const v of Object.values(cases)) t.track(v);
    await t.flush();
    const sent = sentEvents(mock).map((e) => e.name);
    t.destroy();
    const allClean = sent.every((n) => !hasLoneSurrogate(n) && n.length <= 64 && n === n.trimEnd());
    const expect = [
      "a".repeat(63),
      "a".repeat(62) + "\u{1D49C}",
      "a".repeat(63),
      "a".repeat(62),
    ];
    record("F1 name cut at 64 does not split an astral character", allClean && JSON.stringify(sent) === JSON.stringify(expect),
      `lengths=${JSON.stringify(sent.map((n) => n.length))} clean=${allClean}`);
  });
});

await step("F2 SDK name equals the CLI catalog name for the same text", async () => {
  if (!cliNormalize) { record("F2 SDK name equals the CLI catalog name for the same text", null, "CLI package not found next to this suite"); return; }
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1000, autoFlushOnExit: false });
    // names the CLI accepts (letters of any plane, digits, space): the SDK output must be what the CLI stores
    const inputs = [
      "a".repeat(63) + "\u{1D49C}x",
      "a".repeat(62) + "\u{1D49C}x",
      "  padded name  ",
      "b".repeat(62) + " " + "\u{1D49C}",
      "\u{1D49C}".repeat(40), // 80 UTF-16 units of astral letters
      "Заказ ".repeat(20),
      "x".repeat(200),
    ];
    for (const v of inputs) t.track(v);
    await t.flush();
    const sent = sentEvents(mock).map((e) => e.name);
    t.destroy();
    const cli = inputs.map((v) => cliNormalize(v));
    const same = sent.length === inputs.length && sent.every((n, i) => n === cli[i]);
    record("F2 SDK name equals the CLI catalog name for the same text", same,
      same ? `${inputs.length} inputs identical` : `sdk=${JSON.stringify(sent.map((s) => s.length))} cli=${JSON.stringify(cli.map((s) => s?.length))}`);
  });
});

await step("F3 user id cut at 120 does not split an astral character; limits match", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1000, autoFlushOnExit: false });
    t.track("f3.boundary", { userId: "u".repeat(119) + "😀" + "tail" });
    t.track("f3.fits", { userId: "u".repeat(118) + "😀" + "tail" });
    t.track("f3.plain", { userId: "u".repeat(300) });
    await t.flush();
    const by = Object.fromEntries(sentEvents(mock).map((e) => [e.name, e.userId]));
    t.destroy();
    const ok = by["f3.boundary"] === "u".repeat(119) && by["f3.fits"] === "u".repeat(118) + "😀" && by["f3.plain"]?.length === 120
      && Object.values(by).every((u) => !hasLoneSurrogate(u));
    record("F3 user id cut at 120 does not split an astral character; limits match", ok, `lengths=${JSON.stringify(Object.values(by).map((u) => u.length))}`);
  });
});

await step("F4 a number as user id is accepted (written out as text)", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1000, autoFlushOnExit: false });
    t.track("f4.int", { userId: 42 });
    t.track("f4.zero", { userId: 0 });
    t.track("f4.neg", { userId: -7 });
    t.track("f4.float", { userId: 1.5 });
    t.track("f4.big", { userId: 12345678901234 });
    t.track("f4.nan", { userId: NaN });
    t.track("f4.inf", { userId: Infinity });
    await t.flush();
    const by = Object.fromEntries(sentEvents(mock).map((e) => [e.name, e.userId]));
    t.destroy();
    const ok = by["f4.int"] === "42" && by["f4.zero"] === "0" && by["f4.neg"] === "-7" && by["f4.float"] === "1.5"
      && by["f4.big"] === "12345678901234" && by["f4.nan"] === undefined && by["f4.inf"] === undefined;
    record("F4 a number as user id is accepted (written out as text)", ok, JSON.stringify(by));
  });
});

await step("F5 null / undefined user id is accepted: event sent without userId", async () => {
  await withMock(() => ({ status: 200 }), async (mock, endpoint) => {
    const dropped = [];
    const t = new Eventra({ apiKey: "k", endpoint, disableTimer: true, maxBatchSize: 1000, autoFlushOnExit: false, onEventsDropped: (n) => dropped.push(n) });
    t.track("f5.null", { userId: null });
    t.track("f5.undef", { userId: undefined });
    t.track("f5.empty", { userId: "" });
    await t.flush();
    const evs = sentEvents(mock);
    t.destroy();
    const ok = evs.length === 3 && dropped.length === 0 && evs.every((e) => e.userId === undefined || e.userId === null || e.userId === "");
    record("F5 null / undefined user id is accepted: event sent without userId", ok, `sent=${evs.length} dropped=${dropped.length} userIds=${JSON.stringify(evs.map((e) => e.userId ?? null))}`);
  });
});

// ---------------------------------------------------------------------------
// G. TypeScript projects that use require under node16 get the right types
// ---------------------------------------------------------------------------
await step("G1 tsc under module/moduleResolution node16: require side (.cts) resolves index.d.cts", async () => {
  const dir = path.join(HERE, "ts-node16");
  const tsc = path.join(HERE, "node_modules", ".bin", "tsc");
  if (!fs.existsSync(tsc)) { record("G1 tsc node16", null, "typescript not installed"); return; }
  const run = (extra = []) => spawnSync(tsc, ["-p", dir, "--noEmit", ...extra], { encoding: "utf8" });
  const good = run();
  record("G1 tsc under node16: .cts (require) and .mts (import) files typecheck, number userId allowed",
    good.status === 0, good.status === 0 ? "tsc exit 0" : (good.stdout + good.stderr).slice(0, 500));

  // negative control: a wrong type must still be rejected, proving the types are real and not `any`
  const bad = spawnSync(tsc, ["-p", path.join(dir, "tsconfig.negative.json"), "--noEmit"], { encoding: "utf8" });
  const out = bad.stdout + bad.stderr;
  record("G2 tsc under node16: wrong types are rejected (types are real, not any)",
    bad.status !== 0 && /TS2322/.test(out) && /string \| number \| undefined/.test(out), `exit=${bad.status} ${out.split("\n")[0]?.slice(0, 160)}`);

  // the actual CJS runtime path through require() must work too
  const r = spawnSync(process.execPath, ["-e", `const m=require("@eventra_dev/eventra-sdk");const t=new m.Eventra({apiKey:"k",endpoint:"http://127.0.0.1:1/x",disableTimer:true,autoFlushOnExit:false});t.track("g.evt",{userId:1});t.destroy();console.log(typeof m.Eventra)`], { cwd: HERE, encoding: "utf8" });
  record("G3 require() of the CJS build works at runtime", r.status === 0 && r.stdout.trim() === "function", `exit=${r.status} out=${r.stdout.trim()} ${r.stderr.slice(0, 120)}`);
});

// ---------------------------------------------------------------------------
// H. Node 18
// ---------------------------------------------------------------------------
if (!IS_NODE18_CHILD) {
  await step("H1 the whole 2.0.12 suite and the CJS build work on Node 18", async () => {
    const node18 = ["v18.18.0", "v18.15.0"].map((v) => path.join(os.homedir(), ".nvm", "versions", "node", v, "bin", "node")).find((p) => fs.existsSync(p));
    if (!node18) { record("H1 Node 18", null, "no Node 18 binary found under ~/.nvm"); return; }
    const ver = spawnSync(node18, ["-v"], { encoding: "utf8" }).stdout.trim();
    const r = spawnSync(node18, [path.join(HERE, "run-2.0.12.mjs")], { cwd: HERE, encoding: "utf8", env: { ...process.env, EVENTRA_NODE18_CHILD: "1" }, timeout: 300000 });
    const summary = /=== Summary: (\d+) passed, (\d+) failed, (\d+) unverified/.exec(r.stdout);
    const fails = (r.stdout.match(/^FAIL .*/gm) || []).slice(0, 5);
    record(`H1 the whole 2.0.12 suite runs on Node ${ver}`, r.status === 0 && !!summary && summary[2] === "0",
      summary ? `${summary[1]} passed, ${summary[2]} failed${fails.length ? " :: " + fails.join(" | ") : ""}` : (r.stderr || r.stdout).slice(0, 300));
    // the first run.mjs suite (older checks) on Node 18 as well
    const r2 = spawnSync(node18, [path.join(HERE, "run.mjs")], { cwd: HERE, encoding: "utf8", timeout: 400000 });
    const s2 = /=== Summary: (\d+) passed, (\d+) failed/.exec(r2.stdout);
    record(`H2 run.mjs (28 older checks) on Node ${ver}`, r2.status === 0 && !!s2 && s2[2] === "0", s2 ? `${s2[1]} passed, ${s2[2]} failed` : (r2.stderr || r2.stdout).slice(0, 300));
  });
}

const failed = results.filter((r) => r.ok === false);
const unverified = results.filter((r) => r.ok === null);
console.log("");
console.log(`=== Summary: ${results.length - failed.length - unverified.length} passed, ${failed.length} failed, ${unverified.length} unverified === (node ${process.version})`);
process.exit(failed.length > 0 ? 1 : 0);
