# Eventra + Express

Express + **Eventra SDK** + **Eventra CLI**.

Backend code is plain TypeScript — **full CLI support** (no SFC). See [root README](../../../README.md#frameworks-without-cli-support) for Vue/Svelte/Nuxt patterns.

---

## Project structure

```
express/
├── eventra.json
├── services/tracker.ts
├── middleware/tracking.middleware.ts
└── routes/index.ts
```

---

## Run

```bash
pnpm dev:express
```

| Service | URL |
|---------|-----|
| Server | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```bash
cd examples/backend/express
eventra init
# "apiKey": "test", "endpoint": "http://localhost:4000/cli/events"
eventra sync
```

**Detected events:** `express_request`, `express_home`

---

## Docs

https://eventra.dev/docs
