# Eventra + Node.js

Minimal Node.js + **Eventra SDK** + **Eventra CLI**.

All tracking in `.ts` files — native CLI support.

---

## Project structure

```
node/
├── eventra.json
└── src/
    ├── tracker.ts
    └── index.ts
```

---

## Run

```bash
pnpm dev:node
```

SDK: http://localhost:4000/track

---

## Eventra CLI

```bash
cd examples/backend/node
eventra init
eventra sync
```

**Detected events:** `node_started`

---

## Docs

https://eventra.dev/docs
