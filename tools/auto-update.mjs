#!/usr/bin/env node
// Automatic dependency update + release bookkeeping for this repo.
//
//   node tools/auto-update.mjs check                      -> detects newer npm versions of the Eventra packages
//   node tools/auto-update.mjs apply                      -> rewrites package.json files + pnpm-workspace.yaml
//   node tools/auto-update.mjs finalize cli.log sdk.log verify.log
//                                                         -> docs, CHANGELOG, VERSIONS, root version (fails if any test failed)
//
// Output (for GitHub Actions) goes to $GITHUB_OUTPUT when set, and is always printed as JSON.
// Env AUTO_UPDATE_FAKE='{"@eventra_dev/eventra-cli":"9.9.9"}' fakes "latest" for local dry runs.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, appendFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATE = resolve(ROOT, ".auto-update.json");
const PKGS = [
  "@eventra_dev/eventra-cli",
  "@eventra_dev/eventra-sdk",
  "@eventra_dev/cli-plugin-vue",
  "@eventra_dev/cli-plugin-svelte",
  "@eventra_dev/cli-plugin-astro",
  "@eventra_dev/cli-plugin-angular",
];
const rd = (f) => readFileSync(resolve(ROOT, f), "utf8");
const wr = (f, s) => writeFileSync(resolve(ROOT, f), s);
const sh = (c) => execSync(c, { cwd: ROOT, encoding: "utf8" }).trim();
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
const parse = (v) => v.split(".").map(Number);
const cmp = (a, b) => { const x = parse(a), y = parse(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const today = () => new Date().toISOString().slice(0, 10);

const manifests = () => sh("git ls-files '*package.json'").split("\n").filter(Boolean);

function current() {
  const cur = {};
  for (const f of manifests()) {
    const txt = rd(f);
    for (const p of PKGS) {
      const m = txt.match(new RegExp(`"${esc(p)}":\\s*"\\^?(\\d+\\.\\d+\\.\\d+)"`));
      if (m && (!cur[p] || cmp(m[1], cur[p]) > 0)) cur[p] = m[1];
    }
  }
  return cur;
}

function latest() {
  const fake = process.env.AUTO_UPDATE_FAKE ? JSON.parse(process.env.AUTO_UPDATE_FAKE) : {};
  const res = {};
  for (const p of PKGS) res[p] = fake[p] ?? sh(`npm view ${p} version`);
  return res;
}

function diff() {
  const cur = current(), lat = latest();
  return PKGS.filter((p) => cur[p] && cmp(lat[p], cur[p]) > 0).map((p) => ({ pkg: p, from: cur[p], to: lat[p] }));
}

// minor bump when a CLI/SDK minor+ or a plugin minor+ moved, otherwise patch. Never auto-bumps repo major.
function nextRepoVersion(updates) {
  const cur = JSON.parse(rd("package.json")).version;
  const [M, m, p] = parse(cur);
  const minorMove = updates.some((u) => { const a = parse(u.from), b = parse(u.to); return b[0] > a[0] || b[1] > a[1]; });
  return minorMove ? `${M}.${m + 1}.0` : `${M}.${m}.${p + 1}`;
}

const short = (p) => p.replace("@eventra_dev/", "").replace("eventra-", "").replace("cli-plugin-", "");

const mode = process.argv[2];

if (mode === "check") {
  const updates = diff();
  console.log(JSON.stringify({ changed: updates.length > 0, updates }, null, 2));
  out("changed", String(updates.length > 0));
  process.exit(0);
}

if (mode === "apply") {
  const updates = diff();
  if (!updates.length) { console.log("Nothing to update."); out("changed", "false"); process.exit(0); }
  const lat = Object.fromEntries(PKGS.map((p) => [p, null]));
  for (const u of updates) lat[u.pkg] = u.to;
  for (const f of manifests()) {
    let txt = rd(f), orig = txt;
    for (const u of updates) txt = txt.replace(new RegExp(`("${esc(u.pkg)}":\\s*")\\^?\\d+\\.\\d+\\.\\d+(")`, "g"), `$1^${u.to}$2`);
    if (txt !== orig) wr(f, txt);
  }
  // pnpm-workspace.yaml: keep the release-age exclusions in step with the pins
  const now = { ...current() };
  let ws = rd("pnpm-workspace.yaml").split("minimumReleaseAgeExclude:")[0];
  ws += "minimumReleaseAgeExclude:\n" + PKGS.map((p) => `  - '${p}@${now[p]}'`).join("\n") + "\n";
  wr("pnpm-workspace.yaml", ws);
  const next = nextRepoVersion(updates);
  writeFileSync(STATE, JSON.stringify({ updates, next, pins: now, date: today() }, null, 2));
  console.log(JSON.stringify({ updates, next }, null, 2));
  out("changed", "true");
  out("version", next);
  process.exit(0);
}

if (mode === "finalize") {
  const [cliLog, sdkLog, verifyLog] = process.argv.slice(3);
  if (!existsSync(STATE)) { console.error("No .auto-update.json — run apply first"); process.exit(1); }
  const { updates, next, pins, date } = JSON.parse(readFileSync(STATE, "utf8"));

  const summary = (f) => { const m = readFileSync(f, "utf8").match(/Summary:\s*(\d+) passed,\s*(\d+) failed/); if (!m) throw new Error(`no summary in ${f}`); return { pass: +m[1], fail: +m[2] }; };
  const cli = summary(cliLog), sdk = summary(sdkLog);
  const vlog = readFileSync(verifyLog, "utf8");
  const vOk = (vlog.match(/^CLI OK /gm) || []).length, vFail = (vlog.match(/^CLI FAIL /gm) || []).length;
  if (cli.fail || sdk.fail || vFail || !vOk) { console.error("Tests failed — refusing to finalize"); process.exit(1); }

  // package pins in docs
  for (const f of ["README.md", "docs/FINDINGS.md"]) {
    let t = rd(f);
    for (const u of updates) t = t.replace(new RegExp(`(npmjs\\.com/package/${esc(u.pkg)}\\)[\\s|]*\\*\\*)\\d+\\.\\d+\\.\\d+(\\*\\*)`, "g"), `$1${u.to}$2`);
    wr(f, t);
  }
  // test results
  let tr = rd("docs/TEST-RESULTS.md");
  for (const u of updates) tr = tr.replace(new RegExp(`(\\| \`${esc(u.pkg)}\` \\| )\\d+\\.\\d+\\.\\d+( \\|)`), `$1${u.to}$2`);
  tr = tr.replace(/(Last automatic run \(CI:[^)]*\): \*\*)[\d-]+(\*\*)/, `$1${date}$2`);
  tr = tr.replace(/(\| CLI feature tests[^\n]*\*\*)\d+ \/ \d+(\*\*)/, `$1${cli.pass} / ${cli.pass}$2`);
  tr = tr.replace(/(\| SDK feature tests[^\n]*\*\*)\d+ \/ \d+(\*\*)/, `$1${sdk.pass} / ${sdk.pass}$2`);
  tr = tr.replace(/(\| Example matrix: `eventra sync`[^\n]*\*\*)\d+ \/ \d+(\*\*)/, `$1${vOk} / ${vOk}$2`);
  wr("docs/TEST-RESULTS.md", tr);

  // CHANGELOG: new section = package bumps + whatever was under [Unreleased]
  let cl = rd("CHANGELOG.md");
  const m = cl.match(/## \[Unreleased\]\n([\s\S]*?)(?=\n## \[)/);
  const carried = m ? m[1].trim() : "";
  const prev = JSON.parse(rd("package.json")).version;
  const pinLine = PKGS.map((p) => `${short(p)} ${pins[p]}`).join(" · ");
  const bumps = updates.map((u) => `- \`${u.pkg}\` ${u.from} → ${u.to} ([npm](https://www.npmjs.com/package/${u.pkg}/v/${u.to}))`).join("\n");
  const section =
    `## [${next}] — ${date}\n\nPinned: **${pinLine}**\n\n### Changed\n${bumps}\n` +
    (carried ? `\n${carried}\n` : "") +
    `\n### Verified (automatic run)\nCLI feature tests ${cli.pass}/${cli.pass} · SDK feature tests ${sdk.pass}/${sdk.pass} · \`verify:cli\` ${vOk}/${vOk}. Generated by the Auto-update workflow.\n`;
  cl = cl.replace(/## \[Unreleased\]\n[\s\S]*?(?=\n## \[)/, `## [Unreleased]\n\n${section}`.replace(/^## \[Unreleased\]\n\n/, "## [Unreleased]\n\n_Nothing yet._\n\n"));
  cl = cl.replace(/\n\[(\d+\.\d+\.\d+)\]: https:\/\/github\.com\/([^/]+\/[^/]+)\/compare\//, (full, v, repo) => `\n[${next}]: https://github.com/${repo}/compare/v${prev}...v${next}\n[${v}]: https://github.com/${repo}/compare/`);
  wr("CHANGELOG.md", cl);

  // VERSIONS table row (newest first)
  let vs = rd("docs/VERSIONS.md");
  const row = `| **v${next}** | ${date} | ${pins["@eventra_dev/eventra-cli"]} | ${pins["@eventra_dev/eventra-sdk"]} | ${pins["@eventra_dev/cli-plugin-vue"]} | ${pins["@eventra_dev/cli-plugin-svelte"]} | ${pins["@eventra_dev/cli-plugin-astro"]} | ${pins["@eventra_dev/cli-plugin-angular"]} | automatic update |`;
  vs = vs.replace(/(\|---\|[^\n]*\n)\| \*\*v/, (a, h) => `${h}${row}\n| v`).replace(/\| \*\*v(\d+\.\d+\.\d+)\*\*/g, (a, v) => (v === next ? a : `| v${v}`));
  vs = vs.replace(/\| v(\d+\.\d+\.\d+)\*\*/, "| v$1");
  wr("docs/VERSIONS.md", vs);

  // root version
  wr("package.json", rd("package.json").replace(/"version":\s*"[^"]+"/, `"version": "${next}"`));
  rmSync(STATE);
  const msg = `eventra-examples v${next}: ${pinLine.replace(/ · /g, ", ")}`;
  console.log(JSON.stringify({ next, msg }));
  out("version", next);
  out("tag_message", msg);
  process.exit(0);
}

console.error("usage: auto-update.mjs check | apply | finalize <cli.log> <sdk.log> <verify.log>");
process.exit(2);
