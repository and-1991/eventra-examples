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
  <a href="#frameworks-without-cli-support"><b>Vue / Svelte / …</b></a> •
  <a href="#examples"><b>Examples</b></a> •
  <a href="https://eventra.dev/docs"><b>Docs</b></a>
</p>

---

## What is this?

This repository demonstrates:

- **Eventra SDK** — send analytics events from browser, Node.js, and edge runtimes
- **Eventra CLI** ([@eventra_dev/eventra-cli](https://www.npmjs.com/package/@eventra_dev/eventra-cli) **0.3.12+**) — statically discover event names in TypeScript/JavaScript

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
| Mock CLI endpoint | http://localhost:3000/cli/events |

---

## Eventra CLI

### Per-example workflow

```bash
cd examples/frontend/react   # or any example

eventra init                 # creates eventra.json

# Edit only mock fields:
#   "apiKey": "test"
#   "endpoint": "http://localhost:3000/cli/events"

eventra sync                 # scan and update events list
eventra check                # validate config vs codebase (optional)
eventra watch                # live updates to eventra.json on save (0.3.12+)
```

### What the CLI scans

After `eventra init`, `sync.include` is:

```json
"**/*.{ts,tsx,js,jsx}"
```

| Scanned | Not scanned (no SFC / template parser) |
|---------|----------------------------------------|
| `.ts`, `.tsx`, `.js`, `.jsx` | `.vue`, `.svelte`, `.astro`, `.html` |

The CLI uses the **TypeScript compiler API** on plain source files. It does **not** understand Vue `<script>`, Svelte components, or Astro frontmatter as separate dialects.

### What gets detected

- Direct calls: `tracker.track("event.name")` on `Eventra` from `@eventra_dev/eventra-sdk`
- Function wrappers: `trackFeature("event.name")` (often auto-added to `functionWrappers` by `sync`)

---

## Frameworks without CLI support

SDK works in any framework. **CLI only sees event name literals in `.ts` / `.tsx` / `.js` / `.jsx`.**

If you write `trackFeature("my_event")` inside `App.vue` or `Page.svelte`, **`eventra sync` will not find it** with the default config.

### Recommended pattern (used in this repo)

Split **runtime** and **CLI discovery**:

```
my-app/
├── eventra.json
├── tracker.ts          # Eventra SDK + trackFeature(name)
├── events.ts           # event name literals + small helpers
└── App.vue             # import { trackPageView } from "./events" — no string literals here
```

**Rules:**

1. Put every **event name string** in a `.ts` file (`events.ts`, `lib/events.ts`, `utils/events.ts`).
2. Export named functions (`trackPageView`, `trackClick`) that call `trackFeature("…")`.
3. In `.vue` / `.svelte` / `.astro` pages — only call those functions, no `"event_name"` literals.
4. Keep `import { Eventra } from "@eventra_dev/eventra-sdk"` in `.ts` (not CDN URLs).
5. Run `eventra sync` from the example root (where `eventra.json` lives).

### By framework (this repository)

| Framework | UI files (CLI ignores) | Where events live for CLI |
|-----------|--------------------------|---------------------------|
| **Vue** | `App.vue` | `src/events.ts` |
| **Svelte** | `App.svelte` | `src/lib/events.ts` |
| **Nuxt** | `pages/*.vue` | `utils/events.ts` |
| **Astro** | `*.astro` | `src/events.ts` (+ `client.ts` imports helpers) |
| **React** | `App.tsx` *(tsx is scanned, but we still centralize)* | `src/events.ts` |
| **Next.js** | `app/page.tsx` | `lib/events.ts` |
| **Angular** | `app.component.ts` *(ts is scanned)* | `src/app/events.ts` |
| **Vanilla** | `index.html` | `src/events.ts`, `src/client.ts` |
| Express, Hono, … | — | `services/tracker.ts`, routes, middleware |

### Anti-patterns (CLI will miss events)

```vue
<!-- App.vue — NOT discovered by default -->
<script setup>
import { useNuxtApp } from '#app'
const { $trackFeature } = useNuxtApp()
$trackFeature('nuxt_click')   // ❌ inside .vue
</script>
```

```ts
// ✅ utils/events.ts
export function trackNuxtClick() {
  trackFeature('nuxt_click')
}
```

```vue
<script setup>
import { trackNuxtClick } from '../utils/events'
trackNuxtClick()   // ✅ OK in .vue — literal is in .ts
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
| CLI mock / config | `http://localhost:3000/cli/events` |

---

## Examples

### Frontend

| Framework | Example | CLI note |
|-----------|---------|----------|
| React | [./examples/frontend/react](./examples/frontend/react) | Events in `src/events.ts` |
| Vue | [./examples/frontend/vue](./examples/frontend/vue) | **`.vue` not scanned** → `src/events.ts` |
| Svelte | [./examples/frontend/svelte](./examples/frontend/svelte) | **`.svelte` not scanned** → `src/lib/events.ts` |
| Vanilla (TS + Vite) | [./examples/frontend/vanilla](./examples/frontend/vanilla) | All in `src/*.ts` |
| Next.js | [./examples/frontend/next](./examples/frontend/next) | Events in `lib/events.ts` |
| Nuxt | [./examples/frontend/nuxt](./examples/frontend/nuxt) | **`.vue` not scanned** → `utils/events.ts` |
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
Component / route → events.ts → trackFeature() → tracker.track()
                 → Eventra SDK → POST http://localhost:4000/track
```

---

## Why this repo exists

- Validate SDK across environments
- Show **copy-paste** integrations for frameworks CLI does not parse natively
- Test `sync` / `check` / `watch` on real codebases

---

## Documentation

https://eventra.dev/docs

---

## License

MIT
