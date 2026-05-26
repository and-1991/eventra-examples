# Eventra + Astro

Astro + **Eventra SDK** + **Eventra CLI**.

---

## CLI and Astro

Eventra CLI **does not parse `.astro` files**. Client-side tracking is wired in TypeScript.

| File | Role |
|------|------|
| `src/events.ts` | Event literals — **CLI reads this** |
| `src/lib/tracker.ts` | SDK + `trackFeature()` |
| `src/client.ts` | Browser entry — imports from `events.ts` |
| `src/pages/*.astro` | Markup only — no event strings |

---

## Project structure

```
astro/
├── eventra.json
└── src/
    ├── lib/tracker.ts
    ├── events.ts
    ├── client.ts
    └── pages/
```

---

## Run

```bash
pnpm dev:astro
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```bash
cd examples/frontend/astro
eventra init
eventra sync
```

**Detected events:** `astro_page_view`, `astro_click`

---

## Docs

https://eventra.dev/docs
