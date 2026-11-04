# Eventra + Hono

![demo](./demo.gif)
<sub>Real session on eventra-cli 2.5.3 / eventra-sdk 2.0.9: `sync`, `check`, detected events, and an SDK call reaching the mock server.</sub>

Hono + **Eventra SDK** + **Eventra CLI**.

Plain TypeScript — full CLI support.

---

## Project structure

```
hono/
├── eventra.json
├── services/tracker.ts
├── middleware/tracking.middleware.ts
└── routes/index.ts
```

---

## Run

```bash
pnpm dev:hono
```

| Service | URL |
|---------|-----|
| Server | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```bash
cd examples/backend/hono
export EVENTRA_API_KEY=test   # mock key; eventra.json keeps "apiKey": ""
eventra sync                  # discover events and write them to eventra.json
eventra check                 # exit code 1 on drift (CI gate)
```

**Detected events:** `hono_home`, `hono_request`, `hono_response`

---

## Docs

https://eventra.dev/docs
