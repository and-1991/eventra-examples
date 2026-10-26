<p align="center">
  <img src="./assets/eventra-icon-animated.svg" width="120" />
</p>

<h1 align="center">Eventra Examples</h1>

<p align="center">
  Production-grade examples of <b>Eventra SDK</b> and <b>Eventra CLI</b> across frontend, backend, and edge runtimes.
</p>

<p align="center">
  <a href="#quick-start"><b>Quick Start</b></a> •
  <a href="#eventra-cli"><b>Eventra CLI</b></a> •
  <a href="#vue--nuxt-via-eventra_devcli-plugin-vue"><b>Vue / Nuxt</b></a> •
  <a href="#svelte--astro-via-cli-plugins"><b>Svelte / Astro</b></a> •
  <a href="#angular-via-eventra_devcli-plugin-angular"><b>Angular</b></a> •
  <a href="#examples"><b>Examples</b></a> •
  <a href="https://eventra.dev/docs"><b>Docs</b></a>
</p>

---

## What is this?

This repository demonstrates:

- **Eventra SDK** ([@eventra_dev/eventra-sdk](https://www.npmjs.com/package/@eventra_dev/eventra-sdk) **2.0.6**) — send analytics events from browser, Node.js, and edge runtimes
- **Eventra CLI** ([@eventra_dev/eventra-cli](https://www.npmjs.com/package/@eventra_dev/eventra-cli) **2.4.0**) — statically discover event names in TypeScript/JavaScript, with cross-file wrapper propagation. As of 2.0.8, the core also natively detects a declarative `event="..."`/`event={expr}` **JSX attribute** in `.tsx`/`.jsx` files — no plugin needed (verified live in the [React example](./examples/frontend/react); undocumented in the package's own README as of this version)
- **@eventra_dev/cli-plugin-vue** ([npm](https://www.npmjs.com/package/@eventra_dev/cli-plugin-vue) **1.0.7**) — teaches the CLI to parse `.vue` SFCs directly (used by the Vue and Nuxt examples)
- **@eventra_dev/cli-plugin-astro** ([npm](https://www.npmjs.com/package/@eventra_dev/cli-plugin-astro) **1.0.4**) — teaches the CLI to parse the frontmatter script fence of `.astro` files (used by the Astro example)
- **@eventra_dev/cli-plugin-svelte** ([npm](https://www.npmjs.com/package/@eventra_dev/cli-plugin-svelte) **1.0.5**) — required for the declarative `event="..."` template attribute in `.svelte` files (plain `track()`/`trackFeature()` calls are scanned by the CLI core even without it — see note below)
- **@eventra_dev/cli-plugin-angular** ([npm](https://www.npmjs.com/package/@eventra_dev/cli-plugin-angular) **1.0.3**) — teaches the CLI to parse Angular component templates (`.html`), detecting literal `event="..."` and dynamic `[attr.event]="expr"`/`[event]="expr"` bindings the same way the other plugins do for their own templates (used by the Angular example)

As of CLI 2.1.0 the CLI can also read events from **third-party analytics** (PostHog, Segment, Amplitude, Google Analytics 4) via `sinks` — see [Third-party analytics](#third-party-analytics-sinks) and [examples/analytics](./examples/analytics).

Each example includes `eventra.json`, runnable app code, and a **TypeScript-first** tracking pattern where needed.

---

## Quick Start

```bash
pnpm install
pnpm dev:react
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| Mock ingestion API (SDK) | http://localhost:4000/track |
| Mock CLI endpoint | http://localhost:4000/cli/events |

---

## Eventra CLI

### Per-example workflow

```bash
cd examples/frontend/react   # or any example

eventra init                 # creates eventra.json

# Edit only mock fields:
#   "apiKey": "test"
#   "endpoint": "http://localhost:4000/cli/events"

eventra sync                 # scan and update events list
eventra check                # validate config vs codebase (optional, exit 1 on drift)
eventra watch                # live updates to eventra.json on save, including new files
eventra send                 # register discovered events with the Eventra backend
```

### What the CLI scans

After `eventra init`, `sync.include` is:

```json
"**/*.{ts,tsx,js,jsx}"
```

| Scanned natively | Scanned via plugin | Not scanned |
|---------|--------------------|-------------|
| `.ts`, `.tsx`, `.js`, `.jsx`, `.svelte`*, Angular component `.ts`† | `.vue` (via `@eventra_dev/cli-plugin-vue`), `.astro` frontmatter (via `@eventra_dev/cli-plugin-astro`), Angular templates `.html` (via `@eventra_dev/cli-plugin-angular`) | inline `<script>` tags inside `.astro` body markup, Angular **inline** `template: "..."` (no separate `.html` file) |

The CLI uses the **TypeScript compiler API** on plain source files. Framework dialects it doesn't understand natively (Vue SFCs, Astro frontmatter, Angular templates) need a plugin. As of `eventra-cli@2.0.8`, the JSX/TSX AST the core already walks natively also gets a declarative `event="..."`/`event={expr}` **attribute** check for free (see [React example](./examples/frontend/react)) — this is not a plugin, it's core behavior, and (as of this writing) isn't mentioned in the CLI's own README.

\* As of `eventra-cli@2.0.7`, plain `track()`/`trackFeature()` **JS calls** in `.svelte` files (both the `<script>` block and inline event-handler expressions in the markup, e.g. `on:click={() => trackFeature(...)}`) are scanned out of the box, with or without `@eventra_dev/cli-plugin-svelte` registered — verified live in this repo's [Svelte example](./examples/frontend/svelte). But the plugin's own headline feature — a declarative `event="..."` template attribute, same convention as Vue's `TrackedButton` — is genuinely plugin-exclusive: an A/B test (removing the plugin from `plugins` while leaving the package installed) drops `sync` from 15 detected events straight back to those same 4 script-call-based ones. `@eventra_dev/cli-plugin-astro` is similarly required for Astro, but for its *only* detection path: a `trackFeature(...)` call in the frontmatter fence (`---`) is only picked up with the plugin registered — it is not found with the plugin package installed but left out of `eventra.json`'s `plugins` array. Also verified: the Astro plugin only parses the frontmatter fence, not arbitrary `<script>` tags placed in the `.astro` file's body markup (those stay invisible to `sync` either way — use the `events.ts` pattern below for client-side handlers).

† An Angular component's own class body (`.ts`, including direct SDK calls and wrapper propagation) was already scanned natively with no plugin at all, even before `@eventra_dev/cli-plugin-angular` existed — see the [Angular section](#angular-via-eventra_devcli-plugin-angular) below for what the plugin adds on top of that (the template).

### What gets detected

- Direct calls: `tracker.track("event.name")` on `Eventra` from `@eventra_dev/eventra-sdk` — cross-file, including calling `.track()` on an instance imported from another file
- Function wrappers: `trackFeature("event.name")` (often auto-added to `functionWrappers` by `sync`) — wrappers are resolved cross-file too, regardless of which file they're defined in
- Variables, template literals, ternaries: `tracker.track(EVENT)`, `` tracker.track(`feature_${x}`) ``, `tracker.track(flag ? "a" : "b")`

---

## Vue & Nuxt via `@eventra_dev/cli-plugin-vue`

Install the plugin and list it in `eventra.json` — no other config needed, it registers `**/*.vue` on top of `sync.include` automatically:

```json
{
  "plugins": ["@eventra_dev/cli-plugin-vue"]
}
```

With the plugin enabled, `.vue` SFCs are parsed with the real Vue compiler and behave exactly like `.ts` files for detection purposes:

```vue
<script setup lang="ts">
import { trackFeature } from "./tracker";

onMounted(() => {
  trackFeature("page_view"); // ✅ detected directly, no indirection needed
});
</script>

<template>
  <!-- literal and dynamic event="..." template attributes are also detected -->
  <TrackedButton event="click" />
  <TrackedButton :event="SECONDARY_EVENT" />
</template>
```

See [examples/frontend/vue](./examples/frontend/vue) and [examples/frontend/nuxt](./examples/frontend/nuxt) for the full pattern, including the `TrackedButton` convention for template-level event declarations.

**Still not detected, plugin or not:** events fired through runtime dependency injection (e.g. Nuxt's `useNuxtApp().$trackFeature(...)`) — the CLI does static analysis, so anything resolved only at runtime (not through a statically traceable import/wrapper chain) stays invisible to `sync`.

---

## Svelte & Astro via CLI plugins

Both frameworks moved out of "no plugin" status. Current state, verified live in this repo:

- **Svelte** — `@eventra_dev/cli-plugin-svelte` is installed and registered in [examples/frontend/svelte](./examples/frontend/svelte)'s `eventra.json`, and it **is required** for the plugin's actual headline feature: a declarative `event="..."` template attribute (`<button event="svelte_button_click">`, the same convention as Vue's `TrackedButton`), including inside `{#if}/{:else if}/{:else}`, `{#each}`, `{#await}/{:then}/{:catch}`, `{#key}`, and slots. Confirmed with an A/B test — removing `@eventra_dev/cli-plugin-svelte` from `plugins` (package still installed) drops `sync` straight from 15 detected events back down to 4. Those remaining 4 are plain `trackFeature(...)` **JS calls**, and those *are* scanned by `eventra-cli@2.0.7` natively, with or without the plugin — a direct call in `App.svelte`'s `<script>` block and an inline handler in the markup (`on:click={() => trackFeature("svelte_inline_markup_click")}`) are both found either way. So: for plain script calls the plugin is redundant (core already covers it); for the `event="..."` attribute mechanism it is the only thing that makes it work at all. One gap found relative to Vue/Astro: the interpolated string form `event="a-{b}"` and the `{event}` shorthand (both work in Astro's plugin) are silently ignored here — not a broken promise (Svelte's own README never claims shorthand support), just a real capability difference worth knowing about.
- **Astro** — `@eventra_dev/cli-plugin-astro` is installed and registered in [examples/frontend/astro](./examples/frontend/astro)'s `eventra.json`, and it is **required**: a `trackFeature("astro_frontmatter_view")` call placed directly in the frontmatter fence (`---`) of `src/pages/index.astro` is only picked up by `sync` with the plugin registered — removing it from `plugins` (while leaving the package installed) makes the CLI silently drop back to 2 events. The plugin's coverage stops at the frontmatter fence, though: a `trackFeature(...)` call placed in a `<script>` tag inside the `.astro` file's *body* markup is not detected either way — that's still genuinely unscanned, same as plain `.html`.

```astro
---
import { trackFeature } from "../lib/tracker";

trackFeature("astro_frontmatter_view"); // ✅ detected — cli-plugin-astro parses the frontmatter fence
---

<script type="module">
  import { trackFeature } from "../lib/tracker";
  trackFeature("astro_body_script_click"); // ❌ not detected — body <script> tags are not part of the frontmatter
</script>
```

---

## Angular via `@eventra_dev/cli-plugin-angular`

Angular is the odd one out among the plugin-backed frameworks: the CLI core already scans a component's `.ts` class body natively (direct calls, wrappers, propagation — no plugin needed for that part at all). What it can't see is the **template**, which Angular keeps in a separate `.html` file (`templateUrl`). `@eventra_dev/cli-plugin-angular` (installed and registered in [examples/frontend/angular](./examples/frontend/angular)'s `eventra.json`) teaches the CLI that file, parsing it with the real Angular compiler and pairing it back to its component class by the standard `foo.component.html` ↔ `foo.component.ts` naming convention. Confirmed with an A/B test: removing the plugin from `plugins` (package still installed) drops `sync` from 8 detected events straight back down to the 2 that come from the `.ts` class alone.

```html
<!-- literal — always detected, plugin or not the attribute itself is just HTML -->
<button event="checkout.cta">Pay</button>

<!-- dynamic — resolves through the same class-field/getter scope as the component's own .ts,
     via [attr.event] (see the compile-error note below for why NOT [event]) -->
<button [attr.event]="computedEventName">Pay</button>
```

`event`/`[attr.event]` is recognized on any tag, including inside `*ngIf`/`*ngFor` and the newer `@if`/`@else`/`@for` control-flow block syntax — all verified live in the example's `app.component.html`.

**Known limitation confirmed here, not just from the README:** only `templateUrl`-based components are covered — an **inline** `template: "..."` (no separate `.html` file) is invisible either way, same as before this plugin existed.

**One thing worth knowing that goes beyond what the plugin's own README used to say (now fixed and documented upstream):**

1. **The README's headline example didn't compile in a real Angular app, up through 1.0.1.** It showed `<button [event]="computedEventName">Pay</button>` as the dynamic-binding convention. Tried verbatim in this repo's Angular example: `ng build` fails with `NG8002: Can't bind to 'event' since it isn't a known property of 'button'` — Angular's own template type checker rejects a property binding (`[event]`) to a name that isn't a real DOM property or a declared `@Input()`, and this fires regardless of `strictTemplates` (tested both `true` and `false`). The plugin itself still *detects* the `[event]="..."` syntax fine (it's a static text scan, not a real compile), so `eventra sync` reports events that your actual app can never build. **Fixed in `1.0.2`**: the plugin's own README now recommends Angular's attribute-binding form, `[attr.event]="expr"` (and `attr.event="{{ expr }}"` for the interpolated form), documents the `NG8002` failure mode explicitly, and calls out `[event]` as still valid only on a custom component that declares a real `@Input() event` — the plugin resolves `[event]`/`[attr.event]` identically either way (confirmed independently against the published `1.0.2` readme on npm, not just taken on faith), only the `attr.`-prefixed form actually builds on a plain element. This repo's example uses `[attr.event]`/`attr.event="{{ }}"` throughout for exactly this reason.
2. **A stray `@if`/`@else`/`@for`/`@switch`-like word at the start of a text node silently deletes every event in the whole file, with zero warning.** Angular's template parser treats leading `@` as a control-flow block opener and correctly raises a diagnostic for genuinely ambiguous text (confirmed directly against `@angular/compiler`'s `parseTemplate` — this is standard, expected Angular behavior, not a bug in Angular itself: e.g. a button labeled `@if control-flow event` needs escaping as `&#64;if control-flow event`). The bug is what the plugin does with that diagnostic: it doesn't surface it anywhere — `transform()` resolves successfully with an empty module (`export {}`), so `eventra sync` prints no warning or error at all and just silently reports **2 events instead of 8** for the whole file, as if the plugin weren't registered. Found by accident: an early draft of this repo's demo template used exactly that kind of button label and every previously-detected event vanished with no explanation until the template text was traced back as the cause. Anything that looks like `@word` at the start of a text node is worth a second look if `sync`'s count drops unexpectedly.

### Recommended pattern (still used in this repo)

Even where a plugin (or native support) now covers direct calls, this repo keeps centralizing event names for consistency across examples:

```
my-app/
├── eventra.json
├── tracker.ts          # Eventra SDK + trackFeature(name)
├── events.ts           # event name literals + small helpers
└── Page.svelte         # import { trackPageView } from "./events" — no string literals here
```

**Rules:**

1. Put every **event name string** in a `.ts` file (`events.ts`, `lib/events.ts`, `utils/events.ts`).
2. Export named functions (`trackPageView`, `trackClick`) that call `trackFeature("…")`.
3. In `.svelte` / `.astro` pages — prefer calling those functions over inlining `"event_name"` literals, for consistency (both are detected by `sync` either way, per above).
4. Keep `import { Eventra } from "@eventra_dev/eventra-sdk"` in `.ts` (not CDN URLs).
5. Run `eventra sync` from the example root (where `eventra.json` lives).

### By framework (this repository)

| Framework | UI files | Where events live for CLI |
|-----------|--------------------------|---------------------------|
| **Svelte** | `App.svelte` — JS calls scanned natively; `event="..."` attributes need `cli-plugin-svelte` (see above) | `src/lib/events.ts` (+ direct/inline calls and `event="..."` attributes in `App.svelte`, both demonstrated) |
| **Astro** | `*.astro` frontmatter *(scanned via `cli-plugin-astro`)*, body `<script>` tags *(not scanned)* | `src/events.ts` (+ `client.ts` imports helpers; frontmatter has one direct demo call) |
| **React** | `App.tsx` *(tsx is scanned, and as of `eventra-cli@2.0.8` its `event="..."` JSX attributes are too — see above)* | `src/events.ts` |
| **Next.js** | `app/page.tsx` | `lib/events.ts` |
| **Vanilla** | `index.html` | `src/events.ts`, `src/client.ts` |
| Express, Hono, … | — | `services/tracker.ts`, routes, middleware |

Vue, Nuxt, and Angular are no longer in this table — see the [Vue/Nuxt](#vue--nuxt-via-eventra_devcli-plugin-vue) and [Angular](#angular-via-eventra_devcli-plugin-angular) plugin sections above.

### Anti-patterns (CLI will miss events)

```vue
<!-- Runtime dependency injection — NOT discovered, even with cli-plugin-vue -->
<script setup>
import { useNuxtApp } from '#app'
const { $trackFeature } = useNuxtApp()
$trackFeature('nuxt_click')   // ❌ not a statically traceable import/wrapper
</script>
```

```ts
// ✅ utils/tracker.ts
export function trackNuxtClick() {
  trackFeature('nuxt_click')
}
```

```vue
<script setup>
import { trackNuxtClick } from '../utils/tracker'
trackNuxtClick()   // ✅ detected — traceable import chain
</script>
```

Other pitfalls:

- `import { Eventra } from "https://esm.sh/..."` — breaks static resolution
- Dynamic `import("./plugin.js")` — file may be outside analysis graph (see Fastify example: use static imports)
- `trackFeature(app, name)` with event as **second** argument — wrapper expects name first

### Runtime vs CLI endpoints

| Purpose | URL |
|---------|-----|
| SDK sends events | `http://localhost:4000/track` |
| CLI mock / config | `http://localhost:4000/cli/events` |

---

## Examples

### Frontend

| Framework | Example | CLI note |
|-----------|---------|----------|
| React | [./examples/frontend/react](./examples/frontend/react) | Events in `src/events.ts` |
| Vue | [./examples/frontend/vue](./examples/frontend/vue) | **Scanned via `@eventra_dev/cli-plugin-vue`** — tracked directly in `App.vue` |
| Svelte | [./examples/frontend/svelte](./examples/frontend/svelte) | JS calls scanned natively; **`event="..."` attributes scanned via `@eventra_dev/cli-plugin-svelte`** — `src/lib/events.ts` + direct/inline calls and `event="..."` attributes in `App.svelte` |
| Vanilla (TS + Vite) | [./examples/frontend/vanilla](./examples/frontend/vanilla) | All in `src/*.ts` |
| Next.js | [./examples/frontend/next](./examples/frontend/next) | Events in `lib/events.ts` |
| Nuxt | [./examples/frontend/nuxt](./examples/frontend/nuxt) | **Scanned via `@eventra_dev/cli-plugin-vue`** — tracked directly in `pages/index.vue` |
| Astro | [./examples/frontend/astro](./examples/frontend/astro) | **Scanned via `@eventra_dev/cli-plugin-astro`** (frontmatter only) — `src/events.ts` + a direct call in `index.astro`'s frontmatter |
| Angular | [./examples/frontend/angular](./examples/frontend/angular) | `.ts` class body scanned natively; **template `event="..."`/`[attr.event]="expr"` scanned via `@eventra_dev/cli-plugin-angular`** — `src/app/events.ts` + literal/dynamic/`@if`-`@else`/`@for`/`*ngIf`/`*ngFor` bindings in `app.component.html` |

### Backend

| Framework | Example |
|-----------|---------|
| Node.js | [./examples/backend/node](./examples/backend/node) |
| Express | [./examples/backend/express](./examples/backend/express) |
| Fastify | [./examples/backend/fastify](./examples/backend/fastify) |
| Hono | [./examples/backend/hono](./examples/backend/hono) |
| NestJS | [./examples/backend/nestjs](./examples/backend/nestjs) |

### Third-party analytics

Since `eventra-cli@2.1.0` the CLI is no longer limited to the Eventra SDK: declare your existing analytics in `eventra.json` under `sinks` and its calls become event sources too, with no SDK swap. Wrappers, constants and cross-file imports resolve exactly as they do for `Eventra.track()`.

```json
{
  "sinks": [{ "preset": "posthog" }]
}
```

Built-in presets: `posthog`, `segment`, `amplitude`, `ga4`. Anything else can be described with a custom rule, e.g. `{ "callee": "analytics.track", "nameArg": 0 }`. `eventra init` also detects these packages in `package.json` and pre-selects the matching presets. Event names follow the SDK rules (≤ 64 chars, `a-zA-Z0-9:_./-` plus space); names such as PostHog's `$pageview` are excluded.

| Platform | App | Stack | Run |
|----------|-----|-------|-----|
| PostHog | [./examples/analytics/posthog](./examples/analytics/posthog) | Next.js + `posthog-js` (`usePostHog()`) + `posthog-node` route handler | `pnpm dev:posthog` |
| Segment | [./examples/analytics/segment](./examples/analytics/segment) | Vite + React + `@segment/analytics-next` | `pnpm dev:segment` |
| Amplitude | [./examples/analytics/amplitude](./examples/analytics/amplitude) | Express + `@amplitude/analytics-node` | `pnpm dev:amplitude` |
| Google Analytics 4 | [./examples/analytics/ga4](./examples/analytics/ga4) | Vite + React + `react-ga4` | `pnpm dev:ga4` |

Each app is a small, realistic project: one analytics library, one thin `trackEvent` wrapper, event names in constants. Run `eventra sync` inside it (and `eventra init`, which detects the package and pre-selects the preset).

Every other call shape the presets understand (browser + server clients, `usePostHog()` re-exports, `amplitude-js`, `gtag`, `@next/third-parties`, `vue-gtag`, wrappers of every form, custom `sinks` rules, excluded names) lives in four detector fixtures: [`tools/analytics-fixture-posthog`](./tools/analytics-fixture-posthog), [`-segment`](./tools/analytics-fixture-segment), [`-amplitude`](./tools/analytics-fixture-amplitude) and [`-ga4`](./tools/analytics-fixture-ga4). They are deliberately not realistic apps - they type-check and are scanned, never run.

### Edge / Runtimes

| Runtime | Example |
|---------|---------|
| Vercel Edge | [./examples/runtimes/vercel](./examples/runtimes/vercel) |
| Cloudflare Workers | [./examples/runtimes/cloudflare](./examples/runtimes/cloudflare) |

---

## Run Any Example

```bash
pnpm dev:react
pnpm dev:vue
pnpm dev:nuxt
pnpm dev:astro
pnpm dev:svelte
pnpm dev:vanilla
pnpm dev:angular
pnpm dev:next

pnpm dev:node
pnpm dev:express
pnpm dev:fastify
pnpm dev:hono
pnpm dev:nest

pnpm dev:vercel
pnpm test:cf
```

---

## Event flow (runtime)

```
Component / route → trackFeature() → tracker.track()
                 → Eventra SDK → POST http://localhost:4000/track
```

For frameworks with no `.tsx`/`.jsx`-equivalent core scanning (Vanilla, and — for the object-literal-payload/complex-expression cases their plugins don't cover — Svelte/Astro), `trackFeature()` is centralized in a dedicated `events.ts` rather than called from the component directly (see [Svelte & Astro via CLI plugins](#svelte--astro-via-cli-plugins)).

---

## Why this repo exists

- Validate SDK across environments
- Show **copy-paste** integrations for frameworks CLI does not parse natively
- Test `sync` / `check` / `watch` / `send` on real codebases

---

## Test coverage & known issues

Beyond the example apps themselves, this repo carries two standalone, re-runnable diagnostic suites that exercise every claim in the SDK/CLI/plugin READMEs against live code (`node run.mjs` in each, no build step):

- **`tools/sdk-feature-tests/`** — `@eventra_dev/eventra-sdk` reliability internals: batching, retry+backoff, circuit breaker, idempotency, payload guards, lifecycle (`flush`/`shutdown`/`destroy`), runtime detection, plus a `browser-run.mjs` that drives real headless Chromium (Playwright) for the browser-only claims (`persistQueue`, `multiTabMode` leader election, `pagehide`/`visibilitychange` flush).
- **`tools/cli-feature-tests/`** — `@eventra_dev/eventra-cli` core detection rules not covered by any framework plugin: wrapper property-propagation shapes, casts/non-null assertions, cross-file resolution (barrel re-exports, default exports, tsconfig path aliases), `check`/`watch` exit behavior, and the full `send` API-key/endpoint-trust/retry flow.

Findings from running both suites plus the plugin-specific fixtures in `examples/frontend/{vue,astro,svelte}` — all 3 real bugs found are **fixed upstream as of `eventra-sdk@2.0.4` / `cli-plugin-astro@1.0.1`** (both pinned in this repo) and re-confirmed fixed live:

| # | Package | Finding | Status |
|---|---------|---------|--------|
| 1 | `eventra-sdk` | `track()` threw on a non-string event name (e.g. `track(123)`), contradicting the README's "track() never throws" guarantee | **Fixed in 2.0.4** — explicit `typeof name !== "string"` check added; re-tested live |
| 2 | `eventra-sdk` (browser) | The `visibilitychange` flush handler was registered on `window`, but the native event only ever fires on `document` — switching tabs away without closing them never flushed through this path | **Fixed in 2.0.4** — re-tested live in headless Chromium (6/6 browser scenarios pass) |
| 3 | `cli-plugin-astro` | The README's own interpolation example `` event=`a-${b}` `` (no braces) was silently ignored; braces are required: `` event={`a-${b}`} `` | **Fixed in 1.0.1** — README now documents this explicitly; re-tested live, still resolves correctly with braces |
| 4 | `eventra-sdk` | A short-lived process calling `track()` + `flush()` right before exit appeared to send the batch 3 times — initially suspected as `autoFlushOnExit` registering duplicate exit handlers | **Not a bug.** Root cause was this repo's own test harness: it drove the SDK from a subprocess spawned via Node's *blocking* `spawnSync`, which freezes the parent process's event loop — starving the in-process mock server the child was calling and forcing client-side timeouts + retries. Switching the harness to non-blocking `spawn` made the duplicates disappear entirely (confirmed: `[3,3,3]` → `[1,1,1]` physical POSTs). The underlying behavior — retries reusing the same `idempotencyKey` — is at-least-once delivery working exactly as designed; `eventra-sdk`'s README now states this explicitly ("delivery is at-least-once, not exactly-once"). |
| 5 | `eventra-cli` | An event name over 64 chars or outside `a-zA-Z0-9:_./-` is dropped with zero trace — not truncated, not flagged dynamic, no diagnostic | Not a bug — **documented upstream in 2.0.7** (the README now spells out exactly this behavior) |
| 6 | `eventra-cli` | `EVENTRA_ENDPOINT` bypasses the one-time `--trust-endpoint` approval gate, but only its *presence* matters — the request still targets whichever `endpoint` is written in `eventra.json` | Not a bug — **documented upstream in 2.0.7** (README now states the value is "not read or compared against anything" once an endpoint is already committed) |
| 7 | `cli-plugin-svelte` | The interpolated string form `event="a-{b}"` and the `{event}` shorthand (both supported by `cli-plugin-astro`) are silently ignored — not a broken promise (Svelte's README never claimed shorthand), just a real gap vs. Astro | Not a bug — **documented upstream in 1.0.1** (README now states this explicitly, matching what Astro's plugin already documented) |
| 9 | `cli-plugin-vue` | `plugin.version` reported a stale hardcoded literal (`"0.1.0"`) instead of the package's real, published version (`1.0.3` at the time) — any tooling that reads `plugin.version` to display or gate on the installed plugin version saw the wrong number | **Fixed in 1.0.4** — the version literal was replaced with `import pkg from "../package.json"` → `version: pkg.version`, plus a regression test asserting `plugin.version === pkg.version`. Re-tested live against the published `1.0.4` tarball in this repo (installed in [examples/frontend/vue](./examples/frontend/vue) and [examples/frontend/nuxt](./examples/frontend/nuxt)): `createCliPluginVue().version` now returns `"1.0.4"`, matching `package.json`. The same `pkg.version` fix is present in `cli-plugin-angular@1.0.2`'s published dist too (verified the same way: `createCliPluginAngular().version` returns `"1.0.2"`) — `cli-plugin-svelte`/`cli-plugin-astro` still ship the old hardcoded-literal pattern as of their current published `1.0.1` (harmless today only because the literal happens to already match `1.0.1`; would silently drift again on their next version bump unless republished with the same fix). |
| 8 | `cli-plugin-angular` | Two related issues found alongside the plugin's 2026-09-04 integration: (a) a text node starting with a control-flow-like word (e.g. a button labeled `@if control-flow event`) makes Angular's own compiler correctly raise a diagnostic (confirmed directly via `@angular/compiler`'s `parseTemplate` — expected behavior, not an Angular bug), but the plugin never surfaced that diagnostic: `transform()` silently returned an empty module, so `eventra sync` reported **2 events instead of 8** for the whole file with no warning or error printed anywhere; (b) the README's own `<button [event]="computedEventName">` example doesn't compile in a real Angular app — `ng build` fails with `NG8002` (`[event]` isn't a known property of a native element) | **Both halves fixed, (a) in 1.0.1 and (b) in 1.0.2** — `transform()` now throws on a non-empty `parseAngularTemplate()` error list instead of discarding it; the host CLI's existing per-file try/catch turns that into a `skip: <file> Plugin "angular" failed to transform <file>: Failed to parse Angular template <file>: <compiler diagnostic>` line and scanning continues for every other file (re-tested live: reproduced the exact `@if control-flow event` button, confirmed the `skip:` diagnostic appears and `sync` falls back to 2 events for just that file; restoring the template brings the count back to 8). As of `1.0.2`, the plugin's own README now recommends `[attr.event]="expr"` instead of `[event]="expr"` on a plain element and documents the `NG8002` failure mode explicitly (confirmed against the published `1.0.2` readme on npm, not just the changelog text) — `[attr.event]="expr"` builds correctly and the plugin detects it identically; this repo's example uses that form throughout. See the [Angular section](#angular-via-eventra_devcli-plugin-angular) above for both, with repro steps. |
| 10 | `eventra-cli` **2.2.0** | **Regression:** the core no longer scans `.svelte` files at all. Verified by version matrix on this repo's Svelte example: cli 2.1.0 (+plugin 1.0.3 or 1.0.4) finds 15 events and finds `on:click={() => trackFeature("svelte_inline_markup_click")}` even with `plugins: []`; cli 2.2.0 (+plugin 1.0.3 or 1.0.4) finds 14 and drops that inline-markup call; cli 2.2.0 with `plugins: []` finds only the 2 events from `.ts` files (also loses the `<script>` call `svelte_direct_click`). So the footnote above ("plain `track()` JS calls in `.svelte` are scanned natively since 2.0.7") is no longer true, and the plugin never covered inline handler expressions (its README only documents `<script>` + `event=` attributes). The 2.2.0 CLI README now says `.svelte` requires the plugin, but does not document the loss of inline-handler detection. `bash tools/verify-all.sh` fails on `frontend/svelte` because of it | **Resolved by `cli-plugin-svelte@1.0.5`** — the plugin now reads inline `on:event={...}` / `onevent={...}` handlers itself (re-verified live: Svelte example back to 15 events, `verify-all` green). Note the plugin is now **required** for any `.svelte` scanning with cli 2.2.0; the "scanned natively" footnote above applies only to cli ≤ 2.1.0 |

Everything else tested — SDK batching/retry/circuit-breaker/idempotency/payload-guards/persistence/multi-tab, and all of the CLI's core detection + `send` flow (70/70 scenarios) — behaves exactly as documented. As of this pass, both feature-test suites are fully green (`tools/sdk-feature-tests`: 24/24 + 6/6 browser; `tools/cli-feature-tests`: 70/70), and a full `bash tools/verify-all.sh` run passed cleanly across all 15 workspace examples at the time (re-run on 2026-10-15 with cli 2.2.0 / sdk 2.0.6 / cli-plugin-svelte 1.0.5: 0 CLI failures, 0 SDK failures; finding 10 is resolved by the plugin update) (re-confirmed after bumping `cli-plugin-vue` to `1.0.4` and `cli-plugin-angular` to `1.0.2`). `eventra-cli@2.0.8` and `cli-plugin-svelte@1.0.1` (both pinned here) are the releases that documented findings 5–7 above; finding 8's silent-data-loss half is fixed as of `cli-plugin-angular@1.0.1`, and its `[event]`-vs-`[attr.event]` compile-error half is fixed and documented upstream as of `cli-plugin-angular@1.0.2` (also pinned here). Finding 9 (`plugin.version` drift, `cli-plugin-vue`) is fixed as of `1.0.4` (also pinned here).

---

## Stress test: props of any name (cli 2.4.0 / plugins 1.2.1, 2026-10-27)

`eventra-cli` 2.3.2 and `cli-plugin-vue/astro/svelte/angular@1.2.0` (now 1.2.1) claim that a component prop (an input in Angular) that reaches a tracking call is found at every place the component is used, whatever the prop is called. I generated 71 component/usage pairs (React 25, Vue 13, Svelte 11, Astro 10, Angular 12) with one unique event name each, ran `eventra check`, and compared found vs. expected. Each pair also passed an unrelated second prop to confirm it is *not* reported. Re-run on `eventra-cli@2.4.0` (then re-run unchanged on plugins 1.2.1, which only fix the READMEs' props examples) after the first run on 2.3.2:

| Framework | cli 2.3.2 | cli 2.4.0 | Still not found on 2.4.0 |
|---|---|---|---|
| React (core) | 17/25 | **22/25** | prop spread through another component (`{...props}`), usage inside `.map()`, class components (`this.props.x`) |
| Vue | 10/13 | **11/13** | Options API (documented as unsupported) |
| Svelte | 9/11 | **10/11** | `{...spread}` (documented as unsupported) |
| Astro | 0/10 | **8/10** | `onclick={`...${prop}...`}` template literal (that was text, not a call; the plugin README example was corrected in 1.2.1), `<script define:vars>` |
| Angular | 10/12 | **11/12** | inline `template:` child (documented as unsupported) |

2.4.0 fixed `memo`/`forwardRef`/`memo(forwardRef())`, props handed on through other components (React, Vue, Svelte, Astro), the Angular setter input and Astro prop following in frontmatter. No false positives in any framework: a prop that never reaches tracking is never reported.

### CLI robustness (3,000-file synthetic project, unchanged in 2.4.0)

| Case | Result |
|---|---|
| 3,000 files, one wrapper each | all 3,000 events found, but **41 s and ~3 GB RSS** |
| Unicode file name, BOM, CRLF, wrapper import cycle, symlink loop | handled |
| File > 2 MB | skipped **with a clear warning** |
| File with a syntax error | **silently skipped**, `All good`, no `skip:` line |
| Event name containing an emoji | **silently dropped**, `All good` |
| Event name of 5,000 characters | **silently dropped**, `All good` |
| Wrapper-internal `t.track(n)` | listed under "Dynamic event names" once per wrapper, which drowns the report in large projects |

### To fix upstream

1. `cli-plugin-astro`: `<script define:vars>` is not followed.
2. `eventra-cli`: warn instead of staying silent on unparseable files and on event names that are dropped (emoji, over-long).
3. `eventra-cli`: do not list a wrapper's own forwarding call as a dynamic occurrence.
4. `eventra-cli`: memory/time on large projects (3,000 files: 41 s, ~3 GB).
5. React: `{...props}` spread, JSX inside `.map()`, class components.
6. Documented gaps worth closing: Vue Options API, Svelte spreads, Angular inline templates.

Everything else is green on 2.4.0: `verify-all` (0 CLI / 0 SDK failures), `cli-feature-tests` 74/74, `sdk-feature-tests` 24/24.

## Documentation

https://eventra.dev/docs

---

## License

MIT
