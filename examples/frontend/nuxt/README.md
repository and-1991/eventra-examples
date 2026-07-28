# Eventra + Nuxt

Nuxt 3 + **Eventra SDK** + **Eventra CLI** + **@eventra_dev/cli-plugin-vue**.

---

## CLI and Nuxt

Nuxt pages/layouts/components are ordinary `.vue` SFCs, so `@eventra_dev/cli-plugin-vue` parses them the same way it parses standalone Vue components — no extra config beyond listing the plugin.

| File | Role |
|------|------|
| `utils/tracker.ts` | SDK instance + `trackFeature()` wrapper |
| `pages/index.vue` | Calls `trackFeature("nuxt_page_view")` directly in `<script setup>`; tracks clicks declaratively via `event="…"` |
| `components/TrackedButton.vue` | Generic button that fires whatever `event` prop it's given |

**Detection sources exercised here:**

- Direct wrapper call in `<script setup>` → `trackFeature("nuxt_page_view")`
- Literal template attribute → `<TrackedButton event="nuxt_click">`
- Dynamic template attribute resolved through script scope → `<TrackedButton :event="DYNAMIC_FEATURE">`

---

## Project structure

```
nuxt/
├── eventra.json
├── utils/
│   └── tracker.ts
├── components/
│   └── TrackedButton.vue
└── pages/index.vue
```

---

## Run

```bash
pnpm dev:nuxt
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
cd examples/frontend/nuxt
eventra init
eventra sync
```

**Detected events:** `nuxt_page_view`, `nuxt_click`, `nuxt_dynamic_feature`

---

## Docs

https://eventra.dev/docs
