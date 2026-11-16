// Browser items of the SDK 2.1.0 release notes, in real headless Chromium:
//   - identify() once after sign-in: every following event carries the user, also after a reload and in other tabs
//   - reset() forgets the user (all tabs, storage); the user is kept per API key; persistQueue: false keeps it in memory
//   - which user wins in a browser: track({ userId }) > withUser() > identify(); null sends without a user
//   - the development hint in a real Vite dev server, not in a Vite production build
// History: on 2.0.13 and 2.1.0 the saved queue was shared by every API key on the site, so an event of one project
// could be sent with another project's key (pinned here as known gaps). Fixed in 2.1.1: these are ordinary checks now.
import { chromium } from "playwright";
import { createMockServer } from "./mock-server.mjs";
import { createStaticServer } from "./browser/static-server.mjs";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import http from "node:http";
import { spawnSync } from "node:child_process";
import path from "node:path";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const STATIC_PORT = 4784;
const MOCK_PORT = 4783;
const VITE_PORT = 4785;
const PREVIEW_PORT = 4786;
const BASE = `http://127.0.0.1:${STATIC_PORT}/browser/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0, failed = 0;
const KNOWN_GAPS = [];
const check = (n, ok, d = "") => {
  if (KNOWN_GAPS.some((re) => re.test(n))) {
    if (ok) { failed++; console.log(`FAIL ${n} [known gap closed upstream: remove it from KNOWN_GAPS and document it]`); }
    else { passed++; console.log(`GAP  ${n}${d ? " — " + d : ""}`); }
    return;
  }
  ok ? passed++ : failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`);
};

const staticServer = createStaticServer();
await staticServer.listen(STATIC_PORT);
const mock = createMockServer(() => ({ status: 200 }));
await mock.listen(MOCK_PORT);
const endpoint = `http://127.0.0.1:${MOCK_PORT}/track`;
// key: only requests sent with that API key (another key on the page may resend shared events, see the gap below)
const users = (from = 0, key) => Object.fromEntries(mock.requests.slice(from).filter((r) => !key || r.headers["x-api-key"] === key).flatMap((r) => r.body?.events ?? []).map((e) => [e.name, e.userId ?? "<none>"]));
const browser = await chromium.launch({ headless: true });
async function openPage(context) {
  const page = await context.newPage();
  const warns = [];
  page.on("console", (m) => { if (m.type() === "warning") warns.push(m.text()); });
  await page.goto(BASE);
  await page.waitForFunction("window.__ready === true");
  return { page, warns };
}
const opts = (extra = {}) => ({ endpoint, flushInterval: 600000, ...extra });
async function waitFor(fn, ms = 4000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await sleep(50); }
  return false;
}

try {
  // ---- identify, reload, storage ----
  {
    const context = await browser.newContext();
    const { page } = await openPage(context);
    const from = mock.requests.length;
    const r = await page.evaluate(async (o) => {
      window.createNamedTracker("t", o);
      const t = window.__trackers.t;
      t.track("br.before_identify");
      t.identify("u1");
      t.track("br.after_identify");
      await t.flush();
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("__eventra_u__"));
      return { user: t.getUserId(), keys, stored: keys.map((k) => localStorage.getItem(k)) };
    }, opts());
    let u = users(from);
    check("identify(): the following events carry the user, the earlier one does not", u["br.before_identify"] === "<none>" && u["br.after_identify"] === "u1", JSON.stringify(u));
    check("identify(): the user is kept in localStorage under a key of its own", r.user === "u1" && r.keys.length === 1 && r.stored[0].includes("u1"), JSON.stringify(r));

    await page.reload();
    await page.waitForFunction("window.__ready === true");
    const from2 = mock.requests.length;
    const r2 = await page.evaluate(async (o) => {
      window.createNamedTracker("t", o);
      const t = window.__trackers.t;
      const user = t.getUserId();
      t.track("br.first_after_reload");
      await t.flush();
      return { user };
    }, opts());
    u = users(from2);
    check("after a reload getUserId() is the user and the first event carries it", r2.user === "u1" && u["br.first_after_reload"] === "u1", JSON.stringify({ r2, u }));

    // the user is fixed when track() is called
    const from3 = mock.requests.length;
    const r3 = await page.evaluate(async () => {
      const t = window.__trackers.t;
      t.track("br.just_before_reset");
      t.reset();
      t.track("br.after_reset");
      await t.flush();
      return { user: t.getUserId() ?? null, keys: Object.keys(localStorage).filter((k) => k.startsWith("__eventra_u__")) };
    });
    u = users(from3);
    check("an event tracked just before reset() keeps its user; after reset() none", u["br.just_before_reset"] === "u1" && u["br.after_reset"] === "<none>", JSON.stringify(u));
    check("reset() removes the user from localStorage", r3.user === null && r3.keys.length === 0, JSON.stringify(r3));
    await page.reload();
    await page.waitForFunction("window.__ready === true");
    const r4 = await page.evaluate((o) => { window.createNamedTracker("t", o); return window.__trackers.t.getUserId() ?? null; }, opts());
    check("after reset() and a reload there is no user", r4 === null, String(r4));
    await context.close();
  }

  // ---- other open tabs ----
  {
    const context = await browser.newContext();
    const A = await openPage(context);
    const B = await openPage(context);
    for (const p of [A.page, B.page]) await p.evaluate((o) => window.createNamedTracker("t", o), opts());
    await A.page.evaluate(() => window.__trackers.t.identify("tab_user"));
    const got = await waitFor(async () => (await B.page.evaluate(() => window.__trackers.t.getUserId())) === "tab_user");
    const from = mock.requests.length;
    await B.page.evaluate(async () => { window.__trackers.t.track("br.tab_b_after_identify"); await window.__trackers.t.flush(); });
    check("identify() in one tab reaches another open tab", got && users(from)["br.tab_b_after_identify"] === "tab_user", JSON.stringify(users(from)));
    // a third tab opened afterwards
    const C = await openPage(context);
    const c = await C.page.evaluate((o) => { window.createNamedTracker("t", o); return window.__trackers.t.getUserId() ?? null; }, opts());
    check("a tab opened later starts with the user", c === "tab_user", String(c));
    await B.page.evaluate(() => window.__trackers.t.reset());
    const goneA = await waitFor(async () => (await A.page.evaluate(() => window.__trackers.t.getUserId() ?? null)) === null);
    const goneC = await waitFor(async () => (await C.page.evaluate(() => window.__trackers.t.getUserId() ?? null)) === null);
    check("reset() in one tab reaches every open tab", goneA && goneC, `A=${goneA} C=${goneC}`);
    // a user changed in another tab
    await C.page.evaluate(() => window.__trackers.t.identify("second_user"));
    const swapped = await waitFor(async () => (await A.page.evaluate(() => window.__trackers.t.getUserId())) === "second_user");
    check("signing in as another user in one tab switches the other tabs", swapped, "");
    await context.close();
  }

  // ---- per API key, persistQueue: false, invalid ids, precedence ----
  {
    const context = await browser.newContext();
    const { page, warns } = await openPage(context);
    const from = mock.requests.length;
    const r = await page.evaluate(async (o) => {
      window.createNamedTracker("mine", { ...o, apiKey: "key_mine" });
      window.createNamedTracker("widget", { ...o, apiKey: "key_widget" });
      const mine = window.__trackers.mine, widget = window.__trackers.widget;
      mine.identify("app_user");
      await new Promise((r) => setTimeout(r, 200));
      const widgetSees = widget.getUserId() ?? null;
      widget.track("br.widget_event");
      widget.reset();
      await new Promise((r) => setTimeout(r, 200));
      const mineAfterWidgetReset = mine.getUserId() ?? null;
      await widget.flush();
      return { widgetSees, mineAfterWidgetReset, keys: Object.keys(localStorage).filter((k) => k.startsWith("__eventra_u__")).length };
    }, opts());
    check("another API key on the same site never sees the user", r.widgetSees === null && users(from)["br.widget_event"] === "<none>", JSON.stringify(r));
    check("reset() of another API key does not sign the user out", r.mineAfterWidgetReset === "app_user", JSON.stringify(r));

    const from2 = mock.requests.length;
    const p = await page.evaluate(async (o) => {
      window.createNamedTracker("t", { ...o, apiKey: "key_prec" });
      const t = window.__trackers.t;
      t.identify("ident");
      t.identify(42);
      const numeric = t.getUserId();
      t.identify("ident");
      const s = t.withUser("scope");
      t.track("p.ident");
      s.track("p.scope");
      s.track("p.own", { userId: "own" });
      t.track("p.own_over_identify", { userId: "own2" });
      t.track("p.null_over_identify", { userId: null });
      s.track("p.null_over_scope", { userId: null });
      t.withUser(null).track("p.scope_null_not_identify");
      t.withUser(undefined).track("p.scope_undef_not_identify");
      t.withUser("undefined").track("p.scope_text_undefined");
      t.track("p.blank_falls_back", { userId: "  " });
      for (const bad of ["undefined", "null", "", "   ", NaN]) t.identify(bad);
      const afterBad = t.getUserId();
      await t.flush();
      return { numeric, afterBad };
    }, opts());
    const u = Object.fromEntries(Object.entries(users(from2, "key_prec")).filter(([n]) => n.startsWith("p.")));
    const want = {
      "p.ident": "ident", "p.scope": "scope", "p.own": "own", "p.own_over_identify": "own2", "p.null_over_identify": "<none>",
      "p.null_over_scope": "<none>", "p.scope_null_not_identify": "<none>", "p.scope_undef_not_identify": "<none>",
      "p.scope_text_undefined": "<none>", "p.blank_falls_back": "ident",
    };
    check("which user wins: track userId > withUser > identify; null = none; withUser(null/undefined) never uses identify", JSON.stringify(u) === JSON.stringify(want), JSON.stringify(u));
    check("identify(42) stores the number as text", p.numeric === "42", JSON.stringify(p));
    check("identify() with ids that name nobody keeps the current user, with one warning", p.afterBad === "ident" && warns.filter((w) => w.includes("identify() needs a user id")).length === 1, JSON.stringify({ p, warns }));
    await context.close();
  }
  {
    const context = await browser.newContext();
    const { page } = await openPage(context);
    const r = await page.evaluate(async (o) => {
      window.createNamedTracker("p", o);
      window.__trackers.p.identify("stored_before");
      window.__trackers.p.destroy();
      const before = Object.keys(localStorage).filter((k) => k.startsWith("__eventra_u__")).length;
      window.createNamedTracker("m", { ...o, persistQueue: false });
      const m = window.__trackers.m;
      const startUser = m.getUserId() ?? null;
      const after = Object.keys(localStorage).filter((k) => k.startsWith("__eventra_u__")).length;
      m.identify("mem_user");
      const afterIdentify = Object.keys(localStorage).filter((k) => k.startsWith("__eventra_u__")).length;
      m.track("br.mem");
      await m.flush();
      return { before, startUser, after, afterIdentify, user: m.getUserId() };
    }, opts());
    check("persistQueue: false removes a user stored earlier and keeps the new one in memory only",
      r.before === 1 && r.startUser === null && r.after === 0 && r.afterIdentify === 0 && r.user === "mem_user" && users()["br.mem"] === "mem_user", JSON.stringify(r));
    await context.close();
  }

  // ---- README 2.1.0: destroy() in a browser; an event announced by another tab is left to it ----
  {
    const context = await browser.newContext();
    const { page } = await openPage(context);
    const r = await page.evaluate(async (o) => {
      let droppedP = 0, droppedM = 0;
      window.createNamedTracker("p", { ...o, onEventsDropped: (n) => (droppedP += n) });
      window.__trackers.p.track("d.kept1");
      window.__trackers.p.track("d.kept2");
      window.__trackers.p.destroy();
      const saved = Object.keys(localStorage).filter((k) => k.startsWith("__eventra_q__")).flatMap((k) => JSON.parse(localStorage.getItem(k) || "[]") || []).map((e) => e.name);
      window.createNamedTracker("m", { ...o, apiKey: "mem", persistQueue: false, onEventsDropped: (n) => (droppedM += n) });
      window.__trackers.m.track("d.mem1");
      window.__trackers.m.track("d.mem2");
      window.__trackers.m.destroy();
      return { droppedP, droppedM, saved };
    }, opts());
    check("destroy() in a browser keeps the queue in localStorage and drops nothing", r.droppedP === 0 && r.saved.includes("d.kept1") && r.saved.includes("d.kept2"), JSON.stringify(r));
    check("destroy() with persistQueue: false reports the queued events to onEventsDropped", r.droppedM === 2, JSON.stringify(r));
    await context.close();
  }
  {
    const context = await browser.newContext();
    const A = await openPage(context);
    const B = await openPage(context);
    for (const p of [A.page, B.page]) await p.evaluate((o) => window.createNamedTracker("t", { ...o, apiKey: "same" }), opts());
    const from = mock.requests.length;
    await A.page.evaluate(() => window.__trackers.t.track("same.announced_by_a"));
    await sleep(500);
    await B.page.evaluate(() => window.__trackers.t.flush());
    await sleep(300);
    const byB = mock.requests.slice(from).flatMap((r) => r.body?.events ?? []).map((e) => e.name);
    check("an event another open tab announced is left to that tab (same key)", !byB.includes("same.announced_by_a"), JSON.stringify(byB));
    await A.page.evaluate(() => window.__trackers.t.flush());
    await sleep(300);
    const all = mock.requests.slice(from).flatMap((r) => r.body?.events ?? []).filter((e) => e.name === "same.announced_by_a");
    check("the owning tab sends it, once", all.length === 1, `sent ${all.length} times`);
    await context.close();
  }

  // ---- 2.1.1 README: queue, leader and diagnostics belong to the API key; a legacy queue is taken once ----
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BASE.replace("index.html", "plain.html"));
    await page.waitForFunction("window.__ready === true");
    const r = await page.evaluate(async (o) => {
      window.mk("a", { ...o, apiKey: "own_a" });
      window.mk("b", { ...o, apiKey: "own_b", multiTabMode: "leader" });
      window.__trackers.a.track("own.a1");
      window.__trackers.b.track("own.b1");
      await new Promise((r) => setTimeout(r, 200));
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("__eventra_"));
      const queueOf = (suffix) => (JSON.parse(localStorage.getItem("__eventra_q__" + suffix) || "[]") || []).map((e) => e.name);
      const qKeys = keys.filter((k) => k.startsWith("__eventra_q__") && k !== "__eventra_q__");
      const out = { keys, perKey: qKeys.map((k) => [k, queueOf(k.slice("__eventra_q__".length))]), legacyPresent: localStorage.getItem("__eventra_q__") !== null };
      await window.__trackers.a.flush();
      const afterA = qKeys.map((k) => [k, (JSON.parse(localStorage.getItem(k) || "[]") || []).map((e) => e.name)]);
      return { ...out, afterA };
    }, opts());
    const queues = r.perKey.map(([, names]) => names.join(","));
    check("each API key has its own saved queue key, holding only its own events", r.perKey.length === 2 && queues.includes("own.a1") && queues.includes("own.b1") && !queues.some((q) => q.includes(",")) && !r.legacyPresent, JSON.stringify(r));
    check("leader and diagnostics keys are per API key too (no bare __eventra_leader__ / __eventra_d__)", !r.keys.includes("__eventra_leader__") && !r.keys.includes("__eventra_d__"), JSON.stringify(r.keys));
    check("await flush() has already removed what it delivered from localStorage", r.afterA.every(([, names]) => !names.includes("own.a1")) && r.afterA.some(([, names]) => names.includes("own.b1")), JSON.stringify(r.afterA));
    await context.close();
  }
  {
    // a queue left by SDK 2.1.0 or older (one key for everybody) is taken once, by the first tracker that loads
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BASE.replace("index.html", "plain.html"));
    await page.waitForFunction("window.__ready === true");
    const from = mock.requests.length;
    const r = await page.evaluate(async (o) => {
      const mkEvent = (n) => ({ idempotencyKey: crypto.randomUUID(), name: n, timestamp: new Date().toISOString(), properties: {} });
      localStorage.setItem("__eventra_q__", JSON.stringify([mkEvent("legacy.one"), mkEvent("legacy.two")]));
      localStorage.setItem("__eventra_d__", JSON.stringify({}));
      window.mk("first", { ...o, apiKey: "leg_first" });
      window.mk("second", { ...o, apiKey: "leg_second" });
      await window.__trackers.second.flush();
      await window.__trackers.first.flush();
      return { legacyLeft: localStorage.getItem("__eventra_q__"), diagLeft: localStorage.getItem("__eventra_d__") };
    }, opts());
    await sleep(300);
    const by = (key) => mock.requests.slice(from).filter((x) => x.headers["x-api-key"] === key).flatMap((x) => x.body?.events ?? []).map((e) => e.name);
    check("a legacy shared queue is sent once, by the first tracker that loaded", JSON.stringify(by("leg_first").sort()) === '["legacy.one","legacy.two"]' && by("leg_second").length === 0, JSON.stringify({ first: by("leg_first"), second: by("leg_second") }));
    check("the legacy queue and diagnostics keys are removed after being taken", r.legacyLeft === null && r.diagLeft === null, JSON.stringify(r));
    await context.close();
  }

  // ---- the saved queue belongs to the API key (2.1.1; shared by every key before) ----
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BASE.replace("index.html", "plain.html"));
    await page.waitForFunction("window.__ready === true");
    const from = mock.requests.length;
    // the site's tracker and a widget of another Eventra project on one page; the site's tracker delivers an
    // event, and a third instance (another widget, or one created on a route change) starts at that moment
    await page.evaluate(async (o) => {
      window.mk("app", { ...o, apiKey: "gap_app" });
      window.mk("other", { ...o, apiKey: "gap_other" });
      window.__trackers.app.track("gap.delivered_by_app", { userId: "app_user" });
      await new Promise((r) => setTimeout(r, 200)); // the queue is saved to localStorage meanwhile
      await window.__trackers.app.flush();
      window.mk("widget", { ...o, apiKey: "gap_widget" });
      await window.__trackers.widget.flush();
    }, opts());
    await sleep(300);
    const foreign = mock.requests.slice(from).filter((r) => r.headers["x-api-key"] === "gap_widget").flatMap((r) => r.body?.events ?? []);
    check("keys: an instance with another API key never sends an event it did not track (started right after a delivery)",
      foreign.length === 0, `sent with gap_widget: ${JSON.stringify(foreign.map((e) => `${e.name}/${e.userId}`))}`);
    await context.close();
  }
  {
    const context = await browser.newContext();
    const A = await openPage(context);
    const B = await openPage(context);
    const from = mock.requests.length;
    await A.page.evaluate((o) => { window.createNamedTracker("a", { ...o, apiKey: "gap_a" }); window.__trackers.a.identify("user_of_a"); }, opts());
    await B.page.evaluate((o) => window.createNamedTracker("b", { ...o, apiKey: "gap_b" }), opts());
    await A.page.evaluate(() => window.__trackers.a.track("gap.event_of_a"));
    await A.page.close(); // closed before its next flush; pagehide sends with keepalive, but B already holds a copy
    await sleep(16000);
    await B.page.evaluate(() => window.__trackers.b.flush());
    await sleep(300);
    const foreign = mock.requests.slice(from).filter((r) => r.headers["x-api-key"] === "gap_b").flatMap((r) => r.body?.events ?? []);
    check("keys: another API key in another tab does not send the event of a closed tab 15 s later",
      foreign.length === 0, `sent with gap_b: ${JSON.stringify(foreign.map((e) => `${e.name}/${e.userId}`))}`);
    await context.close();
  }

  // ---- the hint in the plain page (no bundler: process is not defined) ----
  {
    const context = await browser.newContext();
    const { page, warns } = await openPage(context);
    await page.evaluate((o) => { window.createNamedTracker("h", { ...o, apiKey: "hint" }); for (let i = 0; i < 60; i++) window.__trackers.h.track("h" + i); }, opts());
    await sleep(100);
    check("no hint in a page loaded without a bundler (nothing says it is a development build)", !warns.some((w) => w.includes("none of the first 50 events")), JSON.stringify(warns));
    await context.close();
  }

  // ---- the hint with a real Vite dev server and a real Vite production build ----
  {
    const viteEntry = path.resolve(HERE, "../../examples/frontend/vanilla/node_modules/vite/dist/node/index.js");
    const vite = await import(pathToFileURL(viteEntry).href);
    const root = fs.mkdtempSync(path.join(HERE, ".tmp-vite-210-"));
    fs.writeFileSync(path.join(root, "index.html"), '<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>');
    fs.writeFileSync(path.join(root, "main.js"), `import { Eventra } from "@eventra_dev/eventra-sdk";
const t = new Eventra({ apiKey: "vite", endpoint: ${JSON.stringify(endpoint)}, disableTimer: true });
for (let i = 0; i < 50; i++) t.track("vite_" + i);
window.__done = true;
`);
    async function hintIn(url) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const warns = [];
      page.on("console", (m) => { if (m.type() === "warning") warns.push(m.text()); });
      await page.goto(url);
      await page.waitForFunction("window.__done === true", null, { timeout: 30000 });
      await sleep(200);
      await context.close();
      return warns.filter((w) => w.includes("none of the first 50 events"));
    }
    try {
      // build in a child process without NODE_ENV: Vite's dev server sets NODE_ENV=development in this process
      const env = { ...process.env };
      delete env.NODE_ENV;
      const built = spawnSync(process.execPath, ["--input-type=module", "-e",
        `const v = await import(${JSON.stringify(pathToFileURL(viteEntry).href)}); await v.build({ root: ${JSON.stringify(root)}, configFile: false, logLevel: "silent", build: { outDir: ${JSON.stringify(path.join(root, "dist"))} } });`],
        { env, encoding: "utf8" });
      if (built.status !== 0) throw new Error("vite build failed: " + built.stderr);
      const server = await vite.createServer({ root, configFile: false, logLevel: "silent", server: { port: VITE_PORT, strictPort: true, host: "127.0.0.1" }, cacheDir: path.join(root, ".vite") });
      await server.listen();
      const dev = await hintIn(`http://127.0.0.1:${VITE_PORT}/`);
      await server.close();
      check("Vite dev server: one hint after 50 events without a user, naming identify()", dev.length === 1 && /identify\(userId\) after sign-in/.test(dev[0]), JSON.stringify(dev));

      const dist = path.join(root, "dist");
      const preview = http.createServer((req, res) => {
        const f = path.join(dist, req.url === "/" ? "index.html" : req.url.split("?")[0]);
        if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html" });
        res.end(fs.readFileSync(f));
      });
      await new Promise((r) => preview.listen(PREVIEW_PORT, "127.0.0.1", r));
      const prod = await hintIn(`http://127.0.0.1:${PREVIEW_PORT}/`);
      await new Promise((r) => preview.close(r));
      check("Vite production build: no hint", prod.length === 0, JSON.stringify(prod));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
} finally {
  await browser.close();
  await mock.close();
  await staticServer.close();
}
console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
process.exit(failed ? 1 : 0);
