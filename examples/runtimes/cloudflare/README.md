# Eventra + Cloudflare Workers

![demo](./demo.gif)
<sub>Real session on eventra-cli 2.5.3 / eventra-sdk 2.0.9: `sync`, `check`, detected events, and an SDK call reaching the mock server.</sub>

Cloudflare Workers + **Eventra SDK** + **Eventra CLI**.

Edge worker — all events in `src/*.ts` (no framework SFC).

---

## Project structure

```
cloudflare/
├── eventra.json
└── src/
    ├── index.ts
    └── test.ts
```

---

## Run

```bash
pnpm test:cf
```

SDK: http://localhost:4000/track

---

## Eventra CLI

```bash
cd examples/runtimes/cloudflare
eventra init
eventra sync
```

**Detected events:** `cloudflare_request`, `cloudflare_test`, `cloudflare_after_timeout`

---

## Docs

https://eventra.dev/docs
