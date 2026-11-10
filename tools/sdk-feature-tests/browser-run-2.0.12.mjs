// Browser items of the SDK 2.0.12 release notes, in real headless Chromium:
// leftover events are sent when the page is closed, and a damaged saved queue is tolerated.
import { chromium } from "playwright";
import { createMockServer } from "./mock-server.mjs";
import { createStaticServer } from "./browser/static-server.mjs";

const STATIC_PORT = 4614;
const MOCK_PORT = 4613;
const BASE = `http://127.0.0.1:${STATIC_PORT}/browser/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0, failed = 0;
const pass = (n, d = "") => { passed++; console.log(`PASS ${n}${d ? " — " + d : ""}`); };
const fail = (n, d = "") => { failed++; console.log(`FAIL ${n}${d ? " — " + d : ""}`); };
const check = (n, ok, d) => (ok ? pass(n, d) : fail(n, d));

const staticServer = createStaticServer();
await staticServer.listen(STATIC_PORT);
const mock = createMockServer(async () => ({ status: 200 }));
await mock.listen(MOCK_PORT);
const endpoint = `http://127.0.0.1:${MOCK_PORT}/track`;
const names = (from = 0) => mock.requests.slice(from).flatMap((r) => r.body?.events ?? []).map((e) => e.name);
const browser = await chromium.launch({ headless: true });

async function newPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForFunction("window.__ready === true");
  return { context, page };
}
async function waitFor(fn, ms = 4000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return true; await sleep(50); }
  return false;
}

try {
  // ---- page closed: leftovers are sent (in memory only, persistQueue false, so only a real send can deliver) ----
  for (const how of ["navigate-away", "page.close()", "page.close(runBeforeUnload)"]) {
    const from = mock.requests.length;
    const tag = how.replace(/\W+/g, "_");
    const { context, page } = await newPage();
    await page.evaluate(({ endpoint }) => window.createNamedTracker("t", { endpoint, persistQueue: false, flushInterval: 600000 }), { endpoint });
    await page.evaluate((tag) => { for (let i = 0; i < 3; i++) window.__trackers.t.track(`close_${tag}_${i}`); }, tag);
    await sleep(100);
    if (how === "navigate-away") await page.goto("about:blank");
    else if (how === "page.close()") await page.close();
    else await page.close({ runBeforeUnload: true });
    const got = await waitFor(() => names(from).filter((n) => n.startsWith(`close_${tag}_`)).length === 3);
    check(`close-sends-leftovers (${how})`, got, `server received ${JSON.stringify(names(from))}`);
    await context.close();
  }

  // ---- the same with the default persistQueue: nothing is lost AND nothing arrives twice ----
  {
    const from = mock.requests.length;
    const { context, page } = await newPage();
    await page.evaluate(({ endpoint }) => window.createNamedTracker("t", { endpoint, flushInterval: 600000 }), { endpoint });
    await page.evaluate(() => { for (let i = 0; i < 3; i++) window.__trackers.t.track(`closep_${i}`); });
    await page.goto("about:blank");
    await waitFor(() => names(from).length >= 3);
    await sleep(500);
    const got = names(from).filter((n) => n.startsWith("closep_"));
    check("close-sends-leftovers (persistQueue true): once each", got.length === 3 && new Set(got).size === 3, JSON.stringify(got));
    await context.close();
  }

  // ---- damaged saved queue ----
  const stamp = () => new Date().toISOString();
  const seeds = {
    "invalid JSON": () => "not json{{[",
    "object instead of array": () => '{"a":1}',
    "a bare string": () => '"hello"',
    "a number": () => "42",
    "empty string": () => "",
    "array of junk": () => JSON.stringify([null, 1, "x", [], {}, { name: 5 }, { idempotencyKey: "", name: "n", timestamp: stamp() }]),
    "mix: junk plus two valid events": () => JSON.stringify([
      null, 7,
      { idempotencyKey: "good-1", name: "damaged_ok_valid", timestamp: stamp() },
      { idempotencyKey: "bad-long-name", name: "x".repeat(500), timestamp: stamp() },
      { idempotencyKey: "bad-props", name: "damaged_bad_props", timestamp: stamp(), properties: [1, 2] },
      { idempotencyKey: "bad-user", name: "damaged_bad_user", timestamp: stamp(), userId: 12345 },
      { idempotencyKey: "good-2", name: "damaged_ok_badts", timestamp: "garbage" },
    ]),
  };
  for (const [label, make] of Object.entries(seeds)) {
    const from = mock.requests.length;
    const { context, page } = await newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.evaluate((raw) => localStorage.setItem("__eventra_q__", raw), make());
    const result = await page.evaluate(async ({ endpoint }) => {
      try {
        window.createNamedTracker("t", { endpoint, disableTimer: true });
        window.__trackers.t.track("damaged_fresh");
        await window.__trackers.t.flush();
        return { threw: null };
      } catch (e) { return { threw: String(e) }; }
    }, { endpoint });
    await sleep(150);
    const sent = names(from);
    const junkSent = sent.some((n) => ["damaged_bad_props", "damaged_bad_user"].includes(n) || n.length > 64);
    const base = !result.threw && errors.length === 0 && sent.includes("damaged_fresh") && !junkSent;
    if (label.startsWith("mix")) {
      check(`damaged-queue (${label})`, base && sent.includes("damaged_ok_valid") && sent.includes("damaged_ok_badts"), `sent=${JSON.stringify(sent)} threw=${result.threw}`);
    } else {
      check(`damaged-queue (${label})`, base, `sent=${JSON.stringify(sent)} threw=${result.threw} pageerrors=${errors.length}`);
    }
    await context.close();
  }

  // ---- localStorage unusable: the SDK still works ----
  {
    const from = mock.requests.length;
    const { context, page } = await newPage();
    const r = await page.evaluate(async ({ endpoint }) => {
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { throw new DOMException("quota", "QuotaExceededError"); };
      Storage.prototype.getItem = function () { throw new DOMException("denied", "SecurityError"); };
      try {
        window.createNamedTracker("t", { endpoint, disableTimer: true });
        window.__trackers.t.track("storage_broken");
        await window.__trackers.t.flush();
        return null;
      } catch (e) { return String(e); } finally { Storage.prototype.setItem = orig; }
    }, { endpoint });
    await sleep(100);
    check("damaged-queue (storage throws on every call)", r === null && names(from).includes("storage_broken"), `threw=${r} sent=${JSON.stringify(names(from))}`);
    await context.close();
  }

  // ---- user id as number and null in the real browser build ----
  {
    const from = mock.requests.length;
    const { context, page } = await newPage();
    await page.evaluate(async ({ endpoint }) => {
      window.createNamedTracker("t", { endpoint, disableTimer: true, persistQueue: false });
      const t = window.__trackers.t;
      t.track("uid_num", { userId: 99 });
      t.track("uid_null", { userId: null });
      await t.flush();
    }, { endpoint });
    await sleep(100);
    const evs = mock.requests.slice(from).flatMap((r) => r.body?.events ?? []);
    const num = evs.find((e) => e.name === "uid_num"), nul = evs.find((e) => e.name === "uid_null");
    check("browser: number and null user id accepted", num?.userId === "99" && nul && (nul.userId ?? null) === null, JSON.stringify(evs.map((e) => [e.name, e.userId])));
    await context.close();
  }
} finally {
  await browser.close();
  await mock.close();
  staticServer.server.close();
}
console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
process.exit(failed ? 1 : 0);
