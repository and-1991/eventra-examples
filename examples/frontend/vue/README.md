# Eventra + Vue

Vue 3 (Vite) + **Eventra SDK** + **Eventra CLI**.

---

## CLI and Vue

Eventra CLI **does not parse `.vue` files**. It only scans `**/*.{ts,tsx,js,jsx}`.

| File | Role |
|------|------|
| `src/events.ts` | Event name literals — **CLI reads this** |
| `src/tracker.ts` | `Eventra` SDK + `trackFeature()` |
| `src/App.vue` | UI only — calls `trackVuePageView()` / `trackVueClick()` |

Do **not** put `trackFeature("…")` string literals in `<script>` of `.vue` if you rely on `eventra sync`.

---

## Project structure

```
vue/
├── eventra.json
└── src/
    ├── tracker.ts
    ├── events.ts
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

```bash
cd examples/frontend/vue
eventra init
# "apiKey": "test", "endpoint": "http://localhost:3000/cli/events"
eventra sync
```

**Detected events:** `vue_page_view`, `vue_click`

---

## Docs

https://eventra.dev/docs
