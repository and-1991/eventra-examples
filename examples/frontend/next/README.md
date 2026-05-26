# Eventra + Next.js

Next.js App Router + **Eventra SDK** + **Eventra CLI**.

---

## CLI and Next.js

`app/page.tsx` is scannable (`.tsx`), but event literals are centralized in `lib/events.ts` — recommended for any App Router project.

| File | Role |
|------|------|
| `lib/events.ts` | Event literals — **primary CLI source** |
| `lib/tracker.ts` | SDK + `trackFeature()` |
| `app/page.tsx` | Client component — calls helpers only |

---

## Project structure

```
next/
├── eventra.json
├── lib/
│   ├── tracker.ts
│   └── events.ts
└── app/page.tsx
```

---

## Run

```bash
pnpm dev:next
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```bash
cd examples/frontend/next
eventra init
eventra sync
```

**Detected events:** `next_page_view`, `next_click`

---

## Docs

https://eventra.dev/docs
