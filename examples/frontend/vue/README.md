# Eventra + Vue

Vue 3 (Vite) + **Eventra SDK** + **Eventra CLI** + **@eventra_dev/cli-plugin-vue**.

---

## CLI and Vue

The CLI core only walks `.ts`/`.tsx`/`.js`/`.jsx` — `@eventra_dev/cli-plugin-vue` teaches it `.vue` on top of that, so `track()` calls (direct or via `trackFeature()`) work the same inside `<script setup>` as in a plain `.ts` file, and `event="…"` attributes in `<template>` are picked up too.

| File | Role |
|------|------|
| `src/tracker.ts` | `Eventra` SDK instance + `trackFeature()` wrapper |
| `src/App.vue` | Calls `trackFeature("vue_page_view")` directly in `<script setup>`; tracks clicks declaratively via `event="…"` |
| `src/components/TrackedButton.vue` | Generic button that fires whatever `event` prop it's given |
| `src/fixtures/DynamicEvents.vue` | `:event="const"` resolving to a literal, and an unresolvable `:event` reported as a dynamic occurrence |
| `src/fixtures/StructuralEvents.vue` | `v-if`, `v-for`, a `<slot>`, and multiple tracked siblings in one file |
| `src/fixtures/ExternalBlocks.vue` (+ `.logic.ts` / `.template.html`) | `<script src="...">` and `<template src="...">` — both resolved and scanned |
| `src/fixtures/MixedScript.vue` | `<script>` and `<script setup>` present together in the same file, both merged and scanned |

**Detection sources exercised here:**

- Direct wrapper call in `<script setup>` → `trackFeature("vue_page_view")`
- Literal template attribute → `<TrackedButton event="vue_click">`
- Dynamic template attribute resolved through script scope → `<TrackedButton :event="SECONDARY_CLICK">`
- Dynamic template attribute that does **not** resolve to a literal → reported as a dynamic occurrence, not dropped
- `v-if` / `v-for` / slots / multiple tracked elements in one component
- External `<script src>` / `<template src>` blocks
- `<script>` + `<script setup>` merged in the same file

See [examples/frontend/nuxt](../nuxt) for the same plugin covering Nuxt's auto-import composables end-to-end.

---

## Project structure

```
vue/
├── eventra.json
└── src/
    ├── tracker.ts
    ├── components/
    │   └── TrackedButton.vue
    ├── fixtures/
    │   ├── DynamicEvents.vue
    │   ├── StructuralEvents.vue
    │   ├── ExternalBlocks.vue (+ .logic.ts, .template.html)
    │   └── MixedScript.vue
    └── App.vue
```

---

## Run

```bash
pnpm dev:vue
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```json
{
  "plugins": ["@eventra_dev/cli-plugin-vue"]
}
```

```bash
cd examples/frontend/vue
eventra init
# "apiKey": "test", "endpoint": "http://localhost:4000/cli/events"
eventra sync
```

**Detected events:** `vue_page_view`, `vue_click`, `vue_secondary_click`, `vue_dynamic_resolved`, `vue_external_script_click`, `vue_external_template_click`, `vue_for_click`, `vue_if_click`, `vue_mixed_script_click`, `vue_mixed_template_click`, `vue_multi_a`, `vue_multi_b`, `vue_slot_click`

---

## Docs

https://eventra.dev/docs
