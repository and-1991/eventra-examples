// Exhaustive live regression suite for @eventra_dev/eventra-cli's CORE (non-plugin)
// detection rules and the `send` command, verified against the official README claims.
// Plugin-specific (Vue/Astro/Svelte template-attribute) coverage lives elsewhere.
//
// Every scenario runs against a fresh temp copy of its fixture under fixtures/<name>/,
// so this script is safe to re-run any number of times and never mutates the checked-in
// fixtures.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const EVENTRA_BIN = path.join(REPO_ROOT, "node_modules", ".bin", "eventra");
const FIXTURES = path.join(__dirname, "fixtures");

let pass = 0;
let fail = 0;
const failures = [];

function ok(name) {
  pass++;
  console.log(`PASS ${name}`);
}
function bad(name, reason) {
  fail++;
  failures.push({ name, reason });
  console.log(`FAIL ${name} (${reason})`);
}
function assert(name, cond, reason) {
  if (cond) ok(name);
  else bad(name, reason ?? "assertion failed");
}

function tmpCopy(fixtureName) {
  const src = path.join(FIXTURES, fixtureName);
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), `eventra-cli-test-${fixtureName}-`));
  fs.cpSync(src, dst, { recursive: true, filter: (p) => !p.includes("node_modules") });
  return dst;
}

function runEventra(args, { cwd, env, input } = {}) {
  try {
    const out = execFileSync(EVENTRA_BIN, args, {
      cwd,
      env: { ...process.env, ...env },
      input: input ?? "",
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { code: 0, stdout: out, stderr: "" };
  } catch (e) {
    return {
      code: e.status ?? 1,
      stdout: e.stdout?.toString() ?? "",
      stderr: e.stderr?.toString() ?? "",
    };
  }
}

// `execFileSync`-based runEventra blocks this process's event loop for the whole
// child lifetime. That's fine for pure static-analysis scenarios above, but `send`
// scenarios also run an in-process mock HTTP server that needs the event loop free
// to accept/respond to the CLI's own outgoing requests — use a real async spawn there.
function runEventraAsync(args, { cwd, env, input } = {}) {
  return new Promise((resolve) => {
    const child = spawn(EVENTRA_BIN, args, { cwd, env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.stdin.end(input ?? "");
  });
}

function readConfig(cwd) {
  return JSON.parse(fs.readFileSync(path.join(cwd, "eventra.json"), "utf8"));
}

// ---------------------------------------------------------------------------
// 1,2,4,5,7,8: core-detection fixture
// ---------------------------------------------------------------------------
function testCoreDetection() {
  const cwd = tmpCopy("core-detection");
  const { code, stdout } = runEventra(["sync"], { cwd });
  const cfg = readConfig(cwd);
  const events = new Set(cfg.events);
  const wrappers = new Set(cfg.functionWrappers.map((w) => w.name));

  assert("core.sync-exit-0", code === 0, `exit ${code}`);

  // 1. direct calls
  for (const e of ["direct_basic", "direct_with_userid", "direct_optional_chain"]) {
    assert(`core.direct.${e}`, events.has(e), "not found");
  }

  // 2. wrapper property propagation
  for (const [wrapperName, eventName] of [
    ["trackFeature", "wrapper_plain_call"],
    ["trackPayload", "wrapper_prop_plain"],
    ["trackPayloadOptional", "wrapper_prop_optional"],
    ["trackPayloadElement", "wrapper_prop_element"],
    ["trackDestructured", "wrapper_prop_destructured"],
    ["trackDestructuredAliased", "wrapper_prop_aliased"],
    ["trackNestedDestructured", "wrapper_prop_nested"],
  ]) {
    assert(`core.wrapper-propagation.${eventName}`, events.has(eventName), "not found");
    assert(`core.wrapper-registered.${wrapperName}`, wrappers.has(wrapperName), "wrapper not registered");
  }

  // 4. object-literal payload ignored
  assert(
    "core.ignored.object-literal-payload",
    !events.has("should_be_ignored_object_literal"),
    "object-literal payload was NOT ignored (false positive)"
  );

  // 5. variables / templates / ternaries
  for (const e of ["var_event_const", "template_feature_abc", "ternary_path_a", "ternary_path_b"]) {
    assert(`core.dynamic-resolved.${e}`, events.has(e), "not found");
  }

  // 7. ignored non-SDK track() calls
  for (const e of ["legacy_should_be_ignored", "ga_should_be_ignored", "segment_should_be_ignored"]) {
    assert(`core.ignored.non-sdk.${e}`, !events.has(e), "false positive — non-SDK track() call was recorded");
  }

  // 8. invalid event names (too long / bad chars) are silently dropped, no trace
  const raw = fs.readFileSync(path.join(cwd, "eventra.json"), "utf8");
  assert(
    "core.invalid-names.dropped-silently",
    !raw.includes("this-name-is-way-too-long") && !raw.includes("bad chars"),
    "an invalid event name leaked into eventra.json verbatim"
  );
  assert(
    "core.invalid-names.no-diagnostic-in-stdout",
    !stdout.includes("too long") && !stdout.includes("invalid character"),
    "expected no diagnostic for invalid names (documenting observed silent-drop behavior)"
  );

  fs.rmSync(cwd, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 3: cast / non-null assertion fixture
// ---------------------------------------------------------------------------
function testCastAssertion() {
  const cwd = tmpCopy("cast-assertion");
  runEventra(["sync"], { cwd });
  const cfg = readConfig(cwd);
  const events = new Set(cfg.events);

  // Survives: cast/non-null used INSIDE a wrapper body between the sdk ref and .track(),
  // and a typed (non-`any`) cast or bare non-null directly at a .track() call site.
  for (const e of [
    "cast_internal_body_cast_only",
    "cast_internal_body_nonnull_only",
    "cast_internal_body_cast_and_nonnull",
    "cast_typed_instance_track",
    "nonnull_only_instance_track",
  ]) {
    assert(`cast.survives.${e}`, events.has(e), "expected this cast/non-null shape to still be detected");
  }

  // Does NOT survive: casting the instance to `any`, or casting/aliasing/asserting a
  // WRAPPER FUNCTION REFERENCE at its invocation site (in any form).
  for (const e of [
    "cast_any_instance_track",
    "cast_any_nonnull_instance_track",
    "cast_typed_wrapper_invoke",
    "nonnull_only_wrapper_invoke",
    "cast_any_wrapper_invoke",
    "bare_nonnull_wrapper_call",
  ]) {
    assert(
      `cast.known-gap.${e}`,
      !events.has(e),
      "this previously-confirmed gap now detects the event — behavior changed, re-check the README claim"
    );
  }

  fs.rmSync(cwd, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 6: cross-file (barrel re-export, default-export wrapper, tsconfig paths)
// ---------------------------------------------------------------------------
function testCrossFile() {
  const cwd = tmpCopy("cross-file");
  runEventra(["sync"], { cwd });
  const cfg = readConfig(cwd);
  const events = new Set(cfg.events);
  const wrappers = new Set(cfg.functionWrappers.map((w) => w.name));

  assert("cross-file.default-export-wrapper", wrappers.has("default"), "default-export wrapper not registered");
  assert(
    "cross-file.path-alias-default-export",
    events.has("cross_file_default_export_path_alias"),
    "not found (tsconfig `paths` alias + default-export wrapper)"
  );
  assert(
    "cross-file.barrel-reexport",
    events.has("cross_file_barrel_reexport"),
    "not found (export * from barrel re-export)"
  );
  assert("cross-file.barrel-wrapper-registered", wrappers.has("trackBarrel"), "barrel-exported wrapper not registered");

  fs.rmSync(cwd, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 9: eventra check exit codes
// ---------------------------------------------------------------------------
function testCheckExitCodes() {
  const cwd = tmpCopy("check-exit-codes");

  runEventra(["sync"], { cwd });
  const noDrift = runEventra(["check"], { cwd });
  assert("check.no-drift-exit-0", noDrift.code === 0, `exit ${noDrift.code}`);

  fs.appendFileSync(path.join(cwd, "src.ts"), `\ntracker.track("check_exit_event_two_drift");\n`);
  const drift = runEventra(["check"], { cwd });
  assert("check.drift-exit-1", drift.code === 1, `exit ${drift.code}`);

  const fixed = runEventra(["check", "--fix"], { cwd });
  assert("check.fix-exit-0", fixed.code === 0, `exit ${fixed.code}`);
  const cfgAfterFix = readConfig(cwd);
  assert(
    "check.fix-writes-scan",
    cfgAfterFix.events.includes("check_exit_event_two_drift"),
    "--fix did not write the new event into eventra.json"
  );

  const parity = runEventra(["check"], { cwd });
  assert("check.parity-after-fix-exit-0", parity.code === 0, `exit ${parity.code}`);

  fs.rmSync(cwd, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 10: eventra watch across a sequence of edits
// ---------------------------------------------------------------------------
async function testWatchSequence() {
  const cwd = tmpCopy("watch-seq");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const child = spawn(EVENTRA_BIN, ["watch"], { cwd, stdio: ["ignore", "pipe", "pipe"] });
  let watchOutput = "";
  child.stdout.on("data", (d) => (watchOutput += d.toString()));
  child.stderr.on("data", (d) => (watchOutput += d.toString()));

  try {
    await sleep(3000);
    let cfg = readConfig(cwd);
    assert("watch.initial", cfg.events.includes("watch_seq_initial"), "initial event missing after watch startup");

    // Step 1: add a wrapper call
    fs.appendFileSync(
      path.join(cwd, "main.ts"),
      `\nexport function trackWrapper(name: string) {\n  tracker.track(name);\n}\n\ntrackWrapper("watch_seq_step1_wrapper_added");\n`
    );
    await sleep(4000);
    cfg = readConfig(cwd);
    assert(
      "watch.step1-wrapper-added",
      cfg.events.includes("watch_seq_step1_wrapper_added"),
      "wrapper call added mid-watch was not picked up"
    );

    // Step 2: add a new file with a cross-file import of that wrapper
    fs.writeFileSync(
      path.join(cwd, "step2-consumer.ts"),
      `import { trackWrapper } from "./main";\n\ntrackWrapper("watch_seq_step2_cross_file_import_added");\n`
    );
    await sleep(4000);
    cfg = readConfig(cwd);
    assert(
      "watch.step2-new-cross-file-import",
      cfg.events.includes("watch_seq_step2_cross_file_import_added"),
      "new cross-file consumer added mid-watch was not picked up"
    );

    // Step 3: delete that file — its event should be removed
    fs.rmSync(path.join(cwd, "step2-consumer.ts"));
    await sleep(4000);
    cfg = readConfig(cwd);
    assert(
      "watch.step3-file-deletion-removes-event",
      !cfg.events.includes("watch_seq_step2_cross_file_import_added"),
      "event from a deleted file was NOT removed from eventra.json"
    );
    assert(
      "watch.step3-other-events-survive",
      cfg.events.includes("watch_seq_initial") && cfg.events.includes("watch_seq_step1_wrapper_added"),
      "unrelated events were lost after a file deletion"
    );
  } finally {
    child.kill("SIGTERM");
    await sleep(300);
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// 11: eventra send — API key/endpoint trust + network resilience
// ---------------------------------------------------------------------------
function startMockServer(mode, port) {
  return new Promise((resolve) => {
    const requestLog = [];
    let count = 0;
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        count++;
        requestLog.push({ n: count, url: req.url, apiKey: req.headers["x-api-key"] || req.headers["authorization"] });
        if (mode === "hang") return; // never respond
        if (mode === "success") return void res.writeHead(200).end('{"ok":true}');
        if (mode === "fail-429-2")
          return void (count <= 2 ? res.writeHead(429).end("{}") : res.writeHead(200).end('{"ok":true}'));
        if (mode === "fail-500-2")
          return void (count <= 2 ? res.writeHead(500).end("{}") : res.writeHead(200).end('{"ok":true}'));
        if (mode === "permanent-401") return void res.writeHead(401).end('{"error":"unauthorized"}');
        if (mode === "always-429") return void res.writeHead(429).end("{}");
        res.writeHead(500).end("unknown mode");
      });
    });
    server.listen(port, () => resolve({ server, requestLog: requestLog, count: () => count }));
  });
}

function writeSendFixture(cwd, { endpoint }) {
  const cfg = JSON.parse(fs.readFileSync(path.join(cwd, "eventra.json"), "utf8"));
  cfg.endpoint = endpoint;
  fs.writeFileSync(path.join(cwd, "eventra.json"), JSON.stringify(cfg, null, 2));
  fs.rmSync(path.join(cwd, "eventra.local.json"), { force: true });
}

async function testSend() {
  const PORT = 4512; // dedicated port for this automated run — distinct from any manual/ad-hoc server
  const endpoint = `http://localhost:${PORT}/api/v1/cli/events`;

  // --- 11a: endpoint TOFU gate blocks until approved; api-key gate fires after ---
  {
    const cwd = tmpCopy("send");
    writeSendFixture(cwd, { endpoint });
    const { server } = await startMockServer("success", PORT);
    try {
      const blocked = await runEventraAsync(["send"], { cwd, input: "" });
      assert("send.endpoint-blocked-until-approved", blocked.code === 1 && /not locally approved/i.test(blocked.stdout + blocked.stderr), "expected an unapproved-endpoint block");

      const approved = await runEventraAsync(["send", "--trust-endpoint"], { cwd, input: "" });
      assert(
        "send.trust-endpoint-approves-and-persists",
        fs.existsSync(path.join(cwd, "eventra.local.json")) &&
          JSON.parse(fs.readFileSync(path.join(cwd, "eventra.local.json"), "utf8")).trustedEndpoint === endpoint,
        "--trust-endpoint did not persist the approval to eventra.local.json"
      );
      assert(
        "send.no-api-key-fails-fast-mentions-env-var",
        approved.code === 1 && /EVENTRA_API_KEY/.test(approved.stdout + approved.stderr),
        "expected a fast failure pointing at EVENTRA_API_KEY once the endpoint is approved but no key is set"
      );

      const sent = await runEventraAsync(["send"], { cwd, env: { EVENTRA_API_KEY: "env-key" }, input: "" });
      assert("send.env-api-key-succeeds", sent.code === 0, `exit ${sent.code}: ${sent.stdout}${sent.stderr}`);
    } finally {
      server.close();
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  }

  // --- 11b: api key resolution priority — EVENTRA_API_KEY > eventra.local.json > legacy inline ---
  {
    const cwd = tmpCopy("send");
    writeSendFixture(cwd, { endpoint });
    const { server, requestLog } = await startMockServer("success", PORT);
    try {
      await runEventraAsync(["send", "--trust-endpoint"], { cwd, input: "" });
      const cfg = JSON.parse(fs.readFileSync(path.join(cwd, "eventra.json"), "utf8"));
      cfg.apiKey = "legacy-inline-key";
      fs.writeFileSync(path.join(cwd, "eventra.json"), JSON.stringify(cfg, null, 2));
      const local = JSON.parse(fs.readFileSync(path.join(cwd, "eventra.local.json"), "utf8"));
      local.apiKey = "local-json-key";
      fs.writeFileSync(path.join(cwd, "eventra.local.json"), JSON.stringify(local, null, 2));

      await runEventraAsync(["send"], { cwd, env: { EVENTRA_API_KEY: "env-key-priority" }, input: "" });
      await runEventraAsync(["send"], { cwd, input: "" }); // no env var -> should use local.json's key
      const local2 = JSON.parse(fs.readFileSync(path.join(cwd, "eventra.local.json"), "utf8"));
      delete local2.apiKey;
      fs.writeFileSync(path.join(cwd, "eventra.local.json"), JSON.stringify(local2, null, 2));
      await runEventraAsync(["send"], { cwd, input: "" }); // no env var, no local key -> should use legacy inline

      const keys = requestLog.map((r) => r.apiKey);
      assert("send.api-key-priority.env-first", keys[0] === "env-key-priority", `got ${keys[0]}`);
      assert("send.api-key-priority.local-json-second", keys[1] === "local-json-key", `got ${keys[1]}`);
      assert("send.api-key-priority.legacy-inline-last", keys[2] === "legacy-inline-key", `got ${keys[2]}`);
    } finally {
      server.close();
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  }

  // --- 11c: endpoint re-blocks on change; EVENTRA_ENDPOINT env var bypasses approval
  //          (but — confirmed live — does NOT actually redirect the request target;
  //          the request still goes to eventra.json's configured `endpoint`) ---
  {
    const cwd = tmpCopy("send");
    writeSendFixture(cwd, { endpoint });
    const { server, requestLog } = await startMockServer("success", PORT);
    try {
      await runEventraAsync(["send", "--trust-endpoint"], { cwd, env: { EVENTRA_API_KEY: "x" }, input: "" });
      const cfg = JSON.parse(fs.readFileSync(path.join(cwd, "eventra.json"), "utf8"));
      cfg.endpoint = endpoint + "-CHANGED";
      fs.writeFileSync(path.join(cwd, "eventra.json"), JSON.stringify(cfg, null, 2));

      const reblocked = await runEventraAsync(["send"], { cwd, env: { EVENTRA_API_KEY: "x" }, input: "" });
      assert(
        "send.endpoint-rebocks-on-change",
        reblocked.code === 1 && /not locally approved/i.test(reblocked.stdout + reblocked.stderr),
        "changing eventra.json's endpoint should re-block send until re-approved"
      );

      const bypassed = await runEventraAsync(["send"], {
        cwd,
        env: { EVENTRA_API_KEY: "x", EVENTRA_ENDPOINT: `http://localhost:${PORT}/totally-different-path` },
        input: "",
      });
      assert(
        "send.EVENTRA_ENDPOINT-bypasses-trust-gate",
        bypassed.code === 0,
        `expected EVENTRA_ENDPOINT to bypass the approval gate, got exit ${bypassed.code}`
      );
      const lastReq = requestLog[requestLog.length - 1];
      assert(
        "send.EVENTRA_ENDPOINT-does-NOT-override-target-url [confirmed quirk, not a crash]",
        lastReq && lastReq.url.includes("-CHANGED"),
        "EVENTRA_ENDPOINT's own value was actually used as the request target — if this now fails, the documented behavior changed (re-verify against the README's wording)"
      );
    } finally {
      server.close();
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  }

  // --- 11d: retry on 429 / 500, no retry on permanent 4xx, 4-attempt cap ---
  {
    const cwd = tmpCopy("send");
    writeSendFixture(cwd, { endpoint });
    await runEventraAsync(["send", "--trust-endpoint"], { cwd, env: { EVENTRA_API_KEY: "x" }, input: "" });

    for (const [mode, expectCode, label] of [
      ["fail-429-2", 0, "send.retry.429-then-success"],
      ["fail-500-2", 0, "send.retry.500-then-success"],
      ["permanent-401", 1, "send.no-retry-on-permanent-4xx"],
      ["always-429", 1, "send.retry.gives-up-after-max-attempts"],
    ]) {
      const { server, count } = await startMockServer(mode, PORT);
      try {
        const res = await runEventraAsync(["send"], { cwd, env: { EVENTRA_API_KEY: "x" }, input: "" });
        assert(label, res.code === expectCode, `exit ${res.code}, requests seen: ${count()}`);
        if (mode === "permanent-401") {
          assert("send.no-retry-on-permanent-4xx.single-attempt", count() === 1, `expected exactly 1 attempt, got ${count()}`);
        }
        if (mode === "always-429") {
          assert("send.retry.max-4-attempts-total", count() === 4, `expected exactly 4 attempts, got ${count()}`);
        }
      } finally {
        server.close();
      }
    }
    fs.rmSync(cwd, { recursive: true, force: true });
  }

  // --- 11e: 10s-per-attempt timeout (slow — ~42s: 4 attempts x ~10s + backoff) ---
  {
    const cwd = tmpCopy("send");
    writeSendFixture(cwd, { endpoint });
    await runEventraAsync(["send", "--trust-endpoint"], { cwd, env: { EVENTRA_API_KEY: "x" }, input: "" });
    const { server } = await startMockServer("hang", PORT);
    try {
      const start = Date.now();
      const res = await runEventraAsync(["send"], { cwd, env: { EVENTRA_API_KEY: "x" }, input: "" });
      const elapsedS = (Date.now() - start) / 1000;
      // 4 attempts * ~10s timeout + backoff delays (~2-3s total) ≈ 40-46s
      assert(
        "send.per-attempt-timeout-fires-around-10s-times-4-attempts",
        res.code === 1 && elapsedS > 35 && elapsedS < 55,
        `exit ${res.code}, elapsed ${elapsedS.toFixed(1)}s (expected ~40-46s)`
      );
    } finally {
      server.close();
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  }
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("=== eventra-cli core detection + send — exhaustive feature suite ===\n");

  testCoreDetection();
  testCastAssertion();
  testCrossFile();
  testCheckExitCodes();
  await testWatchSequence();
  await testSend();

  console.log(`\n=== Summary: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f.name}: ${f.reason}`);
    process.exitCode = 1;
  }
}

main();
