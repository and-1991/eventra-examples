import { chromium } from "playwright";
import { createMockServer } from "./mock-server.mjs";
import { createStaticServer } from "./browser/static-server.mjs";

const STATIC_PORT = 4504;
const MOCK_PORT = 4503;
const BASE = `http://127.0.0.1:${STATIC_PORT}/browser/index.html`;

let passed = 0;
let failed = 0;
let unverified = 0;

function pass(name, detail = "") {
  passed++;
  console.log(`PASS ${name}${detail ? " — " + detail : ""}`);
}
function fail(name, reason) {
  failed++;
  console.log(`FAIL ${name} — ${reason}`);
}
function unverif(name, reason) {
  unverified++;
  console.log(`UNVERIFIED ${name} — ${reason}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const staticServer = createStaticServer();
  await staticServer.listen(STATIC_PORT);

  // Always-200 mock ingest endpoint (with a small artificial delay so we can
  // observe pre-ack localStorage state deterministically if needed).
  const mock = createMockServer(async () => ({ status: 200, delayMs: 50 }));
  await mock.listen(MOCK_PORT);
  const endpoint = `http://127.0.0.1:${MOCK_PORT}/track`;

  const browser = await chromium.launch({ headless: true });

  try {
    // --- 1: persistQueue: true writes the queue to localStorage on track(), before any flush ---
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(BASE);
      await page.waitForFunction("window.__ready === true");
      await page.evaluate(
        ({ endpoint }) =>
          window.createNamedTracker("t1", { endpoint, persistQueue: true, disableTimer: true, maxBatchSize: 1000 }),
        { endpoint }
      );
      await page.evaluate(() => window.callOnTracker("t1", "track", "persist_test_event"));
      const stored = await page.evaluate(() => window.readQueueStorage());
      if (Array.isArray(stored) && stored.some((e) => e.name === "persist_test_event")) {
        pass("persistQueue-write", `localStorage queue has ${stored.length} event(s) immediately after track(), before flush`);
      } else {
        fail("persistQueue-write", `expected event in localStorage, got: ${JSON.stringify(stored)}`);
      }
      await context.close();
    }

    // --- 2: persistQueue: false never writes to localStorage ---
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(BASE);
      await page.waitForFunction("window.__ready === true");
      await page.evaluate(
        ({ endpoint }) =>
          window.createNamedTracker("t2", { endpoint, persistQueue: false, disableTimer: true, maxBatchSize: 1000 }),
        { endpoint }
      );
      await page.evaluate(() => window.callOnTracker("t2", "track", "no_persist_test_event"));
      const stored = await page.evaluate(() => window.readQueueStorage());
      if (stored === null) {
        pass("persistQueue-false", "localStorage untouched after track() with persistQueue:false");
      } else {
        fail("persistQueue-false", `expected null, got: ${JSON.stringify(stored)}`);
      }
      await context.close();
    }

    // --- 3: reload persistence — a persisted non-flushed queue survives reload and gets picked up ---
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(BASE);
      await page.waitForFunction("window.__ready === true");
      await page.evaluate(
        ({ endpoint }) =>
          window.createNamedTracker("t3", { endpoint, persistQueue: true, disableTimer: true, maxBatchSize: 1000 }),
        { endpoint }
      );
      await page.evaluate(() => window.callOnTracker("t3", "track", "reload_persist_event"));
      // Do NOT flush — simulate a page closing with an undelivered queue.
      const beforeReload = await page.evaluate(() => window.readQueueStorage());

      await page.reload();
      await page.waitForFunction("window.__ready === true");
      await page.evaluate(
        ({ endpoint }) =>
          window.createNamedTracker("t3b", { endpoint, persistQueue: true, disableTimer: true, maxBatchSize: 1000 }),
        { endpoint }
      );
      const lenAfterConstruct = await page.evaluate(() => window.queueLength("t3b"));

      if (
        Array.isArray(beforeReload) &&
        beforeReload.some((e) => e.name === "reload_persist_event") &&
        lenAfterConstruct >= 1
      ) {
        pass(
          "reload-persistence",
          `queue persisted (${beforeReload.length} event) before reload, new instance loaded ${lenAfterConstruct} event(s) from localStorage on construction`
        );
      } else {
        fail(
          "reload-persistence",
          `beforeReload=${JSON.stringify(beforeReload)}, lenAfterConstruct=${lenAfterConstruct}`
        );
      }
      await context.close();
    }

    // --- 4: multiTabMode: "leader" — only the leader tab's flush() actually sends ---
    {
      const context = await browser.newContext();
      const pageA = await context.newPage();
      const pageB = await context.newPage();
      await pageA.goto(BASE);
      await pageA.waitForFunction("window.__ready === true");
      await pageB.goto(BASE);
      await pageB.waitForFunction("window.__ready === true");

      // Construct A first so it wins the lease (first-writer-wins, no existing lease yet).
      await pageA.evaluate(
        ({ endpoint }) =>
          window.createNamedTracker("leaderA", {
            endpoint,
            persistQueue: true,
            multiTabMode: "leader",
            disableTimer: true,
            maxBatchSize: 1000,
          }),
        { endpoint }
      );
      await pageB.evaluate(
        ({ endpoint }) =>
          window.createNamedTracker("leaderB", {
            endpoint,
            persistQueue: true,
            multiTabMode: "leader",
            disableTimer: true,
            maxBatchSize: 1000,
          }),
        { endpoint }
      );

      const isLeaderA = await pageA.evaluate(() => window.isLeader("leaderA"));
      const isLeaderB = await pageB.evaluate(() => window.isLeader("leaderB"));

      await pageA.evaluate(() => window.callOnTracker("leaderA", "track", "leader_evt_a"));
      await pageB.evaluate(() => window.callOnTracker("leaderB", "track", "leader_evt_b"));
      await pageA.evaluate(() => window.callOnTracker("leaderA", "flush"));
      await pageB.evaluate(() => window.callOnTracker("leaderB", "flush"));
      await sleep(300); // let async flush()/fetch settle

      const fetchLogA = await pageA.evaluate(() => window.__fetchLog);
      const fetchLogB = await pageB.evaluate(() => window.__fetchLog);

      const exactlyOneLeader = isLeaderA !== isLeaderB && (isLeaderA || isLeaderB);
      const onlyLeaderSent =
        (isLeaderA && fetchLogA.length > 0 && fetchLogB.length === 0) ||
        (isLeaderB && fetchLogB.length > 0 && fetchLogA.length === 0);

      if (exactlyOneLeader && onlyLeaderSent) {
        pass(
          "multiTabMode-leader-election",
          `exactly one of two tabs elected leader (A=${isLeaderA}, B=${isLeaderB}); only the leader's flush() produced a network call (A sent ${fetchLogA.length}, B sent ${fetchLogB.length})`
        );
      } else {
        fail(
          "multiTabMode-leader-election",
          `isLeaderA=${isLeaderA} isLeaderB=${isLeaderB} fetchLogA.len=${fetchLogA.length} fetchLogB.len=${fetchLogB.length}`
        );
      }
      await context.close();
    }

    // --- 5a: pagehide (a real `window`-level event per spec) while document.visibilityState
    // is "hidden" (as the browser sets it just before firing pagehide on an actual tab
    // close/navigate-away) must flush with keepalive:true.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(BASE);
      await page.waitForFunction("window.__ready === true");
      await page.evaluate(
        ({ endpoint }) =>
          window.createNamedTracker("t5a", { endpoint, persistQueue: false, disableTimer: true, maxBatchSize: 1000 }),
        { endpoint }
      );
      await page.evaluate(() => window.callOnTracker("t5a", "track", "visible_flush_event"));
      await page.evaluate(() => window.callOnTracker("t5a", "flush"));
      await sleep(200);
      const visibleLog = await page.evaluate(() => window.__fetchLog.slice());

      await page.evaluate(() => window.callOnTracker("t5a", "track", "pagehide_hidden_event"));
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        window.dispatchEvent(new Event("pagehide"));
      });
      await sleep(300);
      const fullLog = await page.evaluate(() => window.__fetchLog.slice());
      const pagehideCalls = fullLog.slice(visibleLog.length);

      if (!visibleLog.some((c) => c.keepalive) && pagehideCalls.length > 0 && pagehideCalls.every((c) => c.keepalive)) {
        pass(
          "keepalive-on-pagehide",
          `visible-tab flush used keepalive=false; pagehide-while-hidden flush used keepalive=true (${pagehideCalls.length} call(s))`
        );
      } else {
        fail("keepalive-on-pagehide", `visibleLog=${JSON.stringify(visibleLog)} pagehideCalls=${JSON.stringify(pagehideCalls)}`);
      }
      await context.close();
    }

    // --- 5b: the SDK's OWN `visibilitychange` handler is registered via
    // `window.addEventListener("visibilitychange", ...)` (setupBrowserExit() in
    // dist/index.mjs) — but per the DOM/HTML spec (and confirmed live in this Chromium),
    // the real `visibilitychange` event fires on `document`, not `window`, and does NOT
    // propagate there. So this handler is dead code in a real browser: switching away to
    // another tab (visibility -> hidden, no pagehide) never triggers the flush this handler
    // is meant to provide. This is a REAL bug in the SDK, confirmed independently of any
    // CORS/test-harness issue (verified separately that window vs document dispatch differs
    // in this same Chromium build). This check documents and pins down that gap.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(BASE);
      await page.waitForFunction("window.__ready === true");
      await page.evaluate(
        ({ endpoint }) =>
          window.createNamedTracker("t5b", { endpoint, persistQueue: false, disableTimer: true, maxBatchSize: 1000 }),
        { endpoint }
      );
      await page.evaluate(() => window.callOnTracker("t5b", "track", "visibilitychange_only_event"));
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange")); // the real browser's actual dispatch target
      });
      await sleep(300);
      const log = await page.evaluate(() => window.__fetchLog.slice());

      if (log.length === 0) {
        fail(
          "visibilitychange-handler-flush (KNOWN SDK BUG)",
          "tab-switch-away (visibilitychange->hidden with no pagehide) never flushed — " +
            "setupBrowserExit() listens via window.addEventListener('visibilitychange', ...) but the " +
            "real event only fires on document and does not reach window in this Chromium build; " +
            "confirmed by a separate direct probe (window listener never invoked when document.dispatchEvent " +
            "fires the same event type). Only actual page unload (pagehide, which correctly listens on window) " +
            "triggers a flush in practice — see keepalive-on-pagehide above, which does pass."
        );
      } else {
        pass("visibilitychange-handler-flush", `flushed on visibilitychange (${log.length} call(s)) — bug appears fixed upstream`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await mock.close();
    await staticServer.close();
  }

  console.log("");
  console.log(`=== Summary: ${passed} passed, ${failed} failed, ${unverified} unverified ===`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exitCode = 1;
});
