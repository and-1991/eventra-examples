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
  <a href="#frameworks-without-cli-support"><b>Svelte / Astro</b></a> •
  <a href="#examples"><b>Examples</b></a> •
  <a href="https://eventra.dev/docs"><b>Docs</b></a>
</p>

---

## What is this?

This repository demonstrates:

- **Eventra SDK** ([@eventra_dev/eventra-sdk](https://www.npmjs.com/package/@eventra_dev/eventra-sdk) **2.0.0+**) — send analytics events from browser, Node.js, and edge runtimes
- **Eventra CLI** ([@eventra_dev/eventra-cli](https://www.npmjs.com/package/@eventra_dev/eventra-cli) **2.0.0+**) — statically discover event names in TypeScript/JavaScript, with cross-file wrapper propagation
- **@eventra_dev/cli-plugin-vue** ([npm](https://www.npmjs.com/package/@eventra_dev/cli-plugin-vue) **1.0.0+**) — teaches the CLI to parse `.vue` SFCs directly (used by the Vue and Nuxt examples)

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

| Scanned | Requires a plugin | Not scanned |
|---------|--------------------|-------------|
| `.ts`, `.tsx`, `.js`, `.jsx` | `.vue` (via `@eventra_dev/cli-plugin-vue`) | `.svelte`, `.astro`, `.html` |

The CLI uses the **TypeScript compiler API** on plain source files. Framework dialects it doesn't understand natively (Vue SFCs, Svelte components, Astro frontmatter) need a plugin — only Vue has one today.

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

## Frameworks without CLI support

Svelte and Astro have no official CLI plugin yet — the CLI can't parse `.svelte` or `.astro` files at all, plugin or not.

### Recommended pattern (used in this repo)

Split **runtime** and **CLI discovery**:

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
3. In `.svelte` / `.astro` pages — only call those functions, no `"event_name"` literals.
4. Keep `import { Eventra } from "@eventra_dev/eventra-sdk"` in `.ts` (not CDN URLs).
5. Run `eventra sync` from the example root (where `eventra.json` lives).

### By framework (this repository)

| Framework | UI files (CLI ignores) | Where events live for CLI |
|-----------|--------------------------|---------------------------|
| **Svelte** | `App.svelte` | `src/lib/events.ts` |
| **Astro** | `*.astro` | `src/events.ts` (+ `client.ts` imports helpers) |
| **React** | `App.tsx` *(tsx is scanned, but we still centralize)* | `src/events.ts` |
| **Next.js** | `app/page.tsx` | `lib/events.ts` |
| **Angular** | `app.component.ts` *(ts is scanned)* | `src/app/events.ts` |
| **Vanilla** | `index.html` | `src/events.ts`, `src/client.ts` |
| Express, Hono, … | — | `services/tracker.ts`, routes, middleware |

Vue and Nuxt are no longer in this table — see the [plugin section](#vue--nuxt-via-eventra_devcli-plugin-vue) above.

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
| Svelte | [./examples/frontend/svelte](./examples/frontend/svelte) | **`.svelte` not scanned** → `src/lib/events.ts` |
| Vanilla (TS + Vite) | [./examples/frontend/vanilla](./examples/frontend/vanilla) | All in `src/*.ts` |
| Next.js | [./examples/frontend/next](./examples/frontend/next) | Events in `lib/events.ts` |
| Nuxt | [./examples/frontend/nuxt](./examples/frontend/nuxt) | **Scanned via `@eventra_dev/cli-plugin-vue`** — tracked directly in `pages/index.vue` |
| Astro | [./examples/frontend/astro](./examples/frontend/astro) | **`.astro` not scanned** → `src/events.ts` |
| Angular | [./examples/frontend/angular](./examples/frontend/angular) | Events in `src/app/events.ts` |

### Backend

| Framework | Example |
|-----------|---------|
| Node.js | [./examples/backend/node](./examples/backend/node) |
| Express | [./examples/backend/express](./examples/backend/express) |
| Fastify | [./examples/backend/fastify](./examples/backend/fastify) |
| Hono | [./examples/backend/hono](./examples/backend/hono) |
| NestJS | [./examples/backend/nestjs](./examples/backend/nestjs) |

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

For Svelte, Astro, and other frameworks without a CLI plugin, `trackFeature()` is called from a dedicated `events.ts` rather than from the component directly (see [Frameworks without CLI support](#frameworks-without-cli-support)).

---

## Why this repo exists

- Validate SDK across environments
- Show **copy-paste** integrations for frameworks CLI does not parse natively
- Test `sync` / `check` / `watch` / `send` on real codebases

---

## Documentation

https://eventra.dev/docs

---

## License

MIT
