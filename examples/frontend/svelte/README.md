# Eventra + Svelte

Svelte (Vite) + **Eventra SDK** + **Eventra CLI** + **@eventra_dev/cli-plugin-svelte**.

---

## CLI and Svelte

Two independent detection paths, verified live (see the root README's [Svelte & Astro via CLI plugins](../../../README.md#svelte--astro-via-cli-plugins) section for the full A/B test):

| Path | Needs the plugin? | Example in this repo |
|------|--------------------|-----------------------|
| Plain `track()`/`trackFeature()` **JS calls** in `<script>` or inline in the markup | No — `eventra-cli@2.0.7` scans `.svelte` files natively | `trackSveltePageView()` in `App.svelte`'s `<script>`; `trackFeature("svelte_direct_click")`; `on:click={() => trackFeature("svelte_inline_markup_click")}` |
| Declarative **`event="..."` template attribute** (same convention as Vue's `TrackedButton`) | **Yes** — this is genuinely plugin-exclusive | `<button event="svelte_button_click">`, plus one inside every Svelte block type: `{#if}/{:else if}/{:else}`, `{#each}`, `{#await}/{:then}/{:catch}`, `{#key}`, `<slot>` |

Known gap vs. `cli-plugin-astro`: the interpolated string form `event="a-{b}"` and the `{event}` shorthand are both silently ignored by this plugin (Svelte's own README never claims shorthand support, so this isn't a broken promise — just a real capability difference).

| File | Role |
|------|------|
| `src/lib/tracker.ts` | SDK instance + `trackFeature()` wrapper |
| `src/lib/events.ts` | Event literals for the "centralize in `.ts`" convention — **CLI reads this either way** |
| `src/App.svelte` | Exercises both detection paths above |

---

## Project structure

```
svelte/
├── eventra.json
└── src/
    ├── lib/tracker.ts
    ├── lib/events.ts
    └── App.svelte
```

---

## Run

```bash
pnpm dev:svelte
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```json
{
  "plugins": ["@eventra_dev/cli-plugin-svelte"]
}
```

```bash
cd examples/frontend/svelte
eventra init
eventra sync
```

**Detected events:** `svelte_page_view`, `svelte_click`, `svelte_direct_click`, `svelte_inline_markup_click`, `svelte_button_click`, `svelte_dynamic_attr_resolved`, `svelte_if_click`, `svelte_elseif_click`, `svelte_else_click`, `svelte_each_click`, `svelte_await_pending_click`, `svelte_await_then_click`, `svelte_await_catch_click`, `svelte_key_click`, `svelte_slot_default_click`

---

## Docs

https://eventra.dev/docs
