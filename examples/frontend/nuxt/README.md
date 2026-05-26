# Eventra + Nuxt

Nuxt 3 + **Eventra SDK** + **Eventra CLI**.

---

## CLI and Nuxt

Eventra CLI **does not parse `.vue` pages** or Nuxt aliases in SFCs.

| File | Role |
|------|------|
| `utils/events.ts` | Event literals — **CLI reads this** |
| `utils/tracker.ts` | SDK + `trackFeature()` |
| `pages/index.vue` | Calls `trackNuxtPageView()` / `trackNuxtClick()` only |
| `plugins/eventra.client.ts` | Optional runtime `$trackFeature` — not used for CLI discovery |

**Avoid** `$trackFeature("event")` directly in `.vue` — use helpers from `utils/events.ts` instead.

---

## Project structure

```
nuxt/
├── eventra.json
├── utils/
│   ├── tracker.ts
│   └── events.ts
├── plugins/eventra.client.ts
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

```bash
cd examples/frontend/nuxt
eventra init
eventra sync
```

**Detected events:** `nuxt_page_view`, `nuxt_click`, `nuxt_dynamic_feature`

---

## Docs

https://eventra.dev/docs
