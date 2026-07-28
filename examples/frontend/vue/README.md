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

**Detection sources exercised here:**

- Direct wrapper call in `<script setup>` → `trackFeature("vue_page_view")`
- Literal template attribute → `<TrackedButton event="vue_click">`
- Dynamic template attribute resolved through script scope → `<TrackedButton :event="SECONDARY_CLICK">`

---

## Project structure

```
vue/
├── eventra.json
└── src/
    ├── tracker.ts
    ├── components/
    │   └── TrackedButton.vue
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

**Detected events:** `vue_page_view`, `vue_click`, `vue_secondary_click`

---

## Docs

https://eventra.dev/docs
