// Browser items of the SDK 2.0.13 release notes, in real headless Chromium:
//   - a tab closed while a send is in progress loses no events
//   - the saved queue no longer fills the site's storage (capped at about 1 MB of text)
import { chromium } from "playwright";
import { createMockServer } from "./mock-server.mjs";
import { createStaticServer } from "./browser/static-server.mjs";

const STATIC_PORT = 4624;
const MOCK_PORT = 4623;
const BASE = `http://127.0.0.1:${STATIC_PORT}/browser/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0, failed = 0;
const check = (n, ok, d = "") => { ok ? passed++ : failed++; console.log(`${ok ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); };

const staticServer = createStaticServer();
await staticServer.listen(STATIC_PORT);
// the first request of each test hangs for 3 s, so the page is closed while it is in flight
let slowNext = false;
const mock = createMockServer(async () => {
  if (slowNext) { slowNext = false; return { status: 200, delayMs: 3000 }; }
  return { status: 200 };
});
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
async function waitFor(fn, ms = 6000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return true; await sleep(50); }
  return false;
}

try {
  for (const persistQueue of [false, true]) {
    for (const how of ["navigate-away", "page.close()"]) {
      const from = mock.requests.length;
      const tag = `${persistQueue ? "p" : "m"}_${how.replace(/\W+/g, "_")}`;
      const { context, page } = await newPage();
      await page.evaluate(({ endpoint, persistQueue }) => window.createNamedTracker("t", { endpoint, persistQueue, flushInterval: 600000 }), { endpoint, persistQueue });
      slowNext = true;
      await page.evaluate((tag) => {
        for (let i = 0; i < 3; i++) window.__trackers.t.track(`inflight_${tag}_${i}`);
        void window.__trackers.t.flush(); // this request hangs on the server
      }, tag);
      await sleep(300);
      await page.evaluate((tag) => { for (let i = 0; i < 2; i++) window.__trackers.t.track(`after_${tag}_${i}`); }, tag);
      if (how === "navigate-away") await page.goto("about:blank");
      else await page.close();
      const want = [0, 1, 2].map((i) => `inflight_${tag}_${i}`).concat([0, 1].map((i) => `after_${tag}_${i}`));
      const ok = await waitFor(() => want.every((n) => names(from).includes(n)));
      check(`tab closed during a send loses nothing (persistQueue ${persistQueue}, ${how})`, ok, `server received ${JSON.stringify([...new Set(names(from))])}`);
      await context.close();
    }
  }

  // ---- saved queue is capped: 3000 events of ~1 KB would be ~3 MB ----
  {
    const { context, page } = await newPage();
    const bad = await page.evaluate(async () => {
      window.createNamedTracker("t", { endpoint: "http://127.0.0.1:1/never", flushInterval: 600000, maxQueueSize: 10000 });
      const pad = "x".repeat(1000);
      for (let i = 0; i < 3000; i++) window.__trackers.t.track(`cap_${i}`, { properties: { pad } });
      await new Promise((r) => setTimeout(r, 300));
      const raw = localStorage.getItem("__eventra_q__") ?? "";
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch {}
      // storage still usable by the site afterwards
      let siteWrite = true;
      try { localStorage.setItem("site_key", "y".repeat(500000)); } catch { siteWrite = false; }
      return { chars: raw.length, saved: parsed?.length ?? -1, last: parsed?.[parsed.length - 1]?.name, inMemory: window.queueLength("t"), siteWrite };
    });
    check("saved queue is capped near 1 MB of text and stays valid JSON", bad.chars > 0 && bad.chars <= 1_000_000 && bad.saved > 0, JSON.stringify(bad));
    check("the newest events are the ones kept in storage", bad.last === "cap_2999", JSON.stringify(bad));
    check("the in-memory queue keeps all events; the site can still write to storage", bad.inMemory === 3000 && bad.siteWrite, JSON.stringify(bad));
    await context.close();
  }
} finally {
  await browser.close();
  await mock.close();
  await staticServer.close();
}
console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
process.exit(failed ? 1 : 0);
