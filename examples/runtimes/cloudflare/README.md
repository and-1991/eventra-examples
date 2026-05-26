# Eventra + Cloudflare Workers

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
