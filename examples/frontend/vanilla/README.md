# Eventra + Vanilla (TypeScript)

TypeScript + Vite, no UI framework — **Eventra SDK** + **Eventra CLI**.

---

## CLI and Vanilla

All code is plain `.ts` — **full CLI support**, no SFC workarounds.

| File | Role |
|------|------|
| `src/events.ts` | Event literals |
| `src/tracker.ts` | SDK + `trackFeature()` |
| `src/client.ts` | DOM wiring |

Use `@eventra_dev/eventra-sdk` npm import (not CDN) so static analysis resolves the SDK.

---

## Project structure

```
vanilla/
├── eventra.json
├── index.html
└── src/
    ├── tracker.ts
    ├── events.ts
    └── client.ts
```

---

## Run

```bash
pnpm dev:vanilla
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```bash
cd examples/frontend/vanilla
eventra init
eventra sync
```

**Detected events:** `vanilla_page_view`, `vanilla_click`

---

## Docs

https://eventra.dev/docs
