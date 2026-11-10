// Plugin items from the cli 2.6.5 / plugins 1.3.1 release notes, each checked live:
//   Astro  - very large pages are read in part (warning names the page, page listed as partly read)
//   Angular - several components in one file, template pairing, many-component folders scale
//   Svelte 5 - {@attach}, {@render}, snippet defaults
//   Vue    - <script lang="tsx">
//   all four - errors in plugin files name the line
// Fixtures are generated into temp dirs INSIDE this package, so the SDK import resolves.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVENTRA_BIN = path.join(HERE, "..", "..", "node_modules", ".bin", "eventra");
const dirs = [];
let pass = 0;
let fail = 0;
const failures = [];

// No known gaps left: Vue and Angular template errors name the line since 1.3.2.
const KNOWN_GAPS = [];
function assert(name, cond, reason) {
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
    console.log(`FAIL ${name} (${reason ?? "assertion failed"})`);
  }
}

function project(plugin, files, { include = "**/*.{ts,astro,vue,svelte,html}", wrappers = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(HERE, ".tmp-265-"));
  dirs.push(dir);
  fs.writeFileSync(
    path.join(dir, "eventra.json"),
    JSON.stringify({
      apiKey: "",
      endpoint: "http://localhost:1/x",
      events: [],
      functionWrappers: wrappers,
      plugins: [`@eventra_dev/cli-plugin-${plugin}`],
      sync: { include: [include], exclude: ["node_modules"] },
    })
  );
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "src", "t.ts"),
    `import { Eventra } from "@eventra_dev/eventra-sdk";\nexport const tracker = new Eventra({ apiKey: "t" });\nexport function trackFeature(name: string) { tracker.track(name); }\n`
  );
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

function eventra(args, cwd, timeout = 120000) {
  const t0 = Date.now();
  const r = spawnSync(EVENTRA_BIN, args, { cwd, encoding: "utf8", timeout, env: { ...process.env, EVENTRA_API_KEY: "test" } });
  return { code: r.status ?? -1, out: (r.stdout ?? "") + (r.stderr ?? ""), ms: Date.now() - t0, timedOut: r.error?.code === "ETIMEDOUT" };
}
const eventsOf = (dir) => new Set(JSON.parse(fs.readFileSync(path.join(dir, "eventra.json"), "utf8")).events);

// ---------------------------------------------------------------- Astro: huge pages read in part
{
  const row = "<li>row</li>\n";
  const wide = (name, kb) =>
    `---\nimport { trackFeature } from "./t";\ntrackFeature("fm_${name}");\n---\n<button event="first_${name}">x</button>\n` +
    row.repeat(Math.floor((kb * 1024) / row.length)) +
    `<button event="last_${name}">y</button>\n`;
  const dir = project("astro", {
    "src/wide.astro": wide("wide", 1500),
    "src/deep.astro": `---\nimport { trackFeature } from "./t";\ntrackFeature("fm_deep");\n---\n` + "<div>".repeat(5000) + `<button event="deep_ev">x</button>` + "</div>".repeat(5000),
    "src/small.astro": `<button event="small_page_ev">ok</button>\n`,
  });
  const r = eventra(["sync"], dir);
  assert("astro.large.no-crash (exit 0, not timed out)", r.code === 0 && !r.timedOut && !/at .*\.js:\d+/.test(r.out), `code=${r.code} out=${r.out.slice(0, 300)}`);
  assert("astro.large.scan-goes-on (small page still found)", eventsOf(dir).has("small_page_ev"), "small page event missing");
  assert("astro.large.warning-names-wide-page", /src\/wide\.astro/.test(r.out) && /in part|partly|partial/i.test(r.out), r.out.slice(0, 400));
  assert("astro.large.warning-names-deep-page", /src\/deep\.astro/.test(r.out), r.out.slice(0, 400));
  assert("astro.large.listed-as-partly-read (summary line)", /read only in part/i.test(r.out), r.out.slice(0, 400));
  assert("astro.large.frontmatter-still-read", eventsOf(dir).has("fm_wide") && eventsOf(dir).has("fm_deep"), `events=${[...eventsOf(dir)]}`);
  const s = eventra(["check", "--strict"], dir);
  assert("astro.large.check-strict-fails-and-names-page", s.code !== 0 && /src\/wide\.astro/.test(s.out), `code=${s.code}`);
}

// ---------------------------------------------------------------- Angular
{
  const files = {
    "src/multi.ts": `import { Component } from "@angular/core";
import { trackFeature } from "./t";
@Component({ selector: "a-one", templateUrl: "./one.html" })
export class One { go() { trackFeature("ng_one_ts"); } }
@Component({ selector: "a-two", template: '<button event="ng_two_inline">x</button>' })
export class Two { go() { trackFeature("ng_two_ts"); } }
@Component({ selector: "a-three", templateUrl: "./differently-named.html" })
export class Three { go() { trackFeature("ng_three_ts"); } }
`,
    "src/one.html": `<button event="ng_one_tpl">1</button>\n`,
    "src/differently-named.html": `<button event="ng_three_tpl">3</button>\n`,
  };
  const dir = project("angular", files);
  const r = eventra(["sync"], dir);
  const ev = eventsOf(dir);
  for (const e of ["ng_one_ts", "ng_two_ts", "ng_three_ts"]) assert(`angular.multi.class-code-read-in-full.${e}`, ev.has(e), `events=${[...ev]}`);
  assert("angular.multi.templateUrl-pairing.one", ev.has("ng_one_tpl"), `events=${[...ev]}`);
  assert("angular.multi.templateUrl-pairing.name-differs-from-file (named by templateUrl)", ev.has("ng_three_tpl"), `events=${[...ev]}`);
  assert("angular.multi.inline-template", ev.has("ng_two_inline"), `events=${[...ev]}`);
  assert("angular.multi.clean-exit", r.code === 0, r.out.slice(0, 200));

  // template must not leak to a component that does not name it
  const dir2 = project("angular", {
    "src/a.component.ts": `import { Component } from "@angular/core";\n@Component({ selector: "a", templateUrl: "./a.component.html" })\nexport class A {}\n@Component({ selector: "b", template: "<p>no events</p>" })\nexport class B {}\n`,
    "src/a.component.html": `<button event="only_a_tpl">a</button>\n`,
  });
  eventra(["sync"], dir2);
  assert("angular.multi.pairing-single-event", eventsOf(dir2).has("only_a_tpl") && eventsOf(dir2).size === 1, `events=${[...eventsOf(dir2)]}`);

  // speed: many components. Generous absolute bound, and (near) linear growth: 4x the files must not cost >8x the time.
  const gen = (n) => {
    const f = {};
    for (let i = 1; i <= n; i++) {
      f[`src/many/c${i}.component.ts`] = `import { Component } from "@angular/core";\n@Component({ selector: "c${i}", templateUrl: "./c${i}.component.html" })\nexport class C${i} {}\n`;
      f[`src/many/c${i}.component.html`] = `<button event="many_${i}">x</button>\n`;
    }
    return f;
  };
  const small = project("angular", gen(150));
  const big = project("angular", gen(600));
  const t1 = eventra(["sync"], small);
  const t2 = eventra(["sync"], big);
  assert("angular.speed.600-components-all-found", eventsOf(big).size === 600, `found ${eventsOf(big).size}`);
  assert("angular.speed.600-components-under-30s", !t2.timedOut && t2.ms < 30000, `${t2.ms}ms`);
  assert("angular.speed.scales-roughly-linearly (4x files <= 8x time)", t2.ms <= Math.max(8 * t1.ms, 3000), `150 files ${t1.ms}ms, 600 files ${t2.ms}ms`);
  console.log(`INFO angular 150 components ${t1.ms}ms, 600 components ${t2.ms}ms`);
}

// ---------------------------------------------------------------- Svelte 5
{
  const dir = project("svelte", {
    "src/S5.svelte": `<script lang="ts">
  import { trackFeature } from "./t";
  const handler = (node) => { trackFeature("attach_fn_call"); };
</script>
{#snippet row(label = trackFeature("snip_default_call"))}
  <button event="snip_row_lit">x</button>
{/snippet}
{#snippet other(n = 5)}<span onclick={() => trackFeature("snip_inline_call")}>y</span>{/snippet}
<div {@attach handler}></div>
<div {@attach (n) => trackFeature("attach_inline_call")}></div>
<div {@attach (n) => { trackFeature("attach_block_call"); }} event="attach_div_lit"></div>
{@render row(trackFeature("render_arg_call"))}
{@render other()}
`,
  });
  const r = eventra(["sync"], dir);
  const ev = eventsOf(dir);
  for (const e of ["attach_fn_call", "attach_inline_call", "attach_block_call", "attach_div_lit"]) assert(`svelte5.attach.${e}`, ev.has(e), `events=${[...ev]}`);
  for (const e of ["render_arg_call", "snip_inline_call", "snip_row_lit"]) assert(`svelte5.render-and-snippet.${e}`, ev.has(e), `events=${[...ev]}`);
  assert("svelte5.snippet-default-value-call-read", ev.has("snip_default_call"), `events=${[...ev]}`);
  assert("svelte5.no-skipped-file", !/Skipped|syntax error/i.test(r.out) && r.code === 0, r.out.slice(0, 300));
}

// ---------------------------------------------------------------- Vue tsx
{
  const dir = project("vue", {
    "src/T.vue": `<script lang="tsx">
import { defineComponent } from "vue";
import { trackFeature } from "./t";
export default defineComponent({
  render() { return <button event="vue_tsx_jsx" onClick={() => trackFeature("vue_tsx_call")}>x</button>; },
});
</script>
<template><div event="vue_tsx_tpl_attr"/></template>
`,
  });
  const r = eventra(["sync"], dir);
  const ev = eventsOf(dir);
  assert("vue.tsx.call-in-tsx-script", ev.has("vue_tsx_call"), `events=${[...ev]} out=${r.out.slice(0, 200)}`);
  assert("vue.tsx.template-attribute", ev.has("vue_tsx_tpl_attr"), `events=${[...ev]}`);
  assert("vue.tsx.jsx-event-attribute", ev.has("vue_tsx_jsx"), `events=${[...ev]}`);
  assert("vue.tsx.no-skipped-file", !/Skipped|syntax error/i.test(r.out), r.out.slice(0, 300));
}

// ---------------------------------------------------------------- errors name the line
{
  const cases = [
    ["vue", "src/Bad.vue", `<template><div event="a"/></template>\n<script setup lang="ts">\nconst x = 1;\nconst a = ;\n</script>\n`, /Bad\.vue:\s*line 4|Bad\.vue.*\(line 4\)/],
    ["vue", "src/BadTpl.vue", `<template>\n<div>\n</template>\n`, /BadTpl\.vue.*line \d+/],
    ["svelte", "src/Bad.svelte", `<script>\n let a = ;\n</script>\n<div event="x"></div>\n`, /Bad\.svelte.*line 2/],
    ["astro", "src/Bad.astro", `---\nconst a = ;\n---\n<div event="x"/>\n`, /Bad\.astro.*line 2/],
    ["angular", "src/bad.html", `<div>\n<span event="a">\n@if (x {\n</div>\n`, /bad\.html.*line \d+/, { "src/bad.component.ts": `import { Component } from "@angular/core";\n@Component({ selector: "c", templateUrl: "./bad.html" })\nexport class C {}\n` }],
  ];
  for (const [plugin, rel, content, re, extra] of cases) {
    const dir = project(plugin, { [rel]: content, ...(extra ?? {}) });
    const r = eventra(["sync"], dir);
    assert(`errors-name-line.${plugin}.${path.basename(rel)}`, re.test(r.out), `output: ${r.out.replace(/\n/g, " | ").slice(0, 300)}`);
  }
}

for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
console.log(`\n=== Summary (2.6.5 plugins): ${pass} passed, ${fail} failed ===`);
if (fail) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f.name}: ${f.reason}`);
  process.exit(1);
}
