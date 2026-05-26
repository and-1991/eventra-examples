# Eventra + Vercel Edge

Vercel Edge (Next.js API route) + **Eventra SDK** + **Eventra CLI**.

Events in `app/api/track/route.ts` — plain TypeScript, full CLI support.

For App Router pages with `.vue`/`.tsx` UI, see [root README](../../../README.md#frameworks-without-cli-support).

---

## Project structure

```
vercel/
├── eventra.json
└── app/api/track/route.ts
```

---

## Run

```bash
pnpm dev:vercel
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```bash
cd examples/runtimes/vercel
eventra init
eventra sync
```

**Detected events:** `vercel_request`, `vercel_api_hit`

---

## Docs

https://eventra.dev/docs
