# Eventra + Svelte

Svelte (Vite) + **Eventra SDK** + **Eventra CLI**.

---

## CLI and Svelte

Eventra CLI **does not parse `.svelte` files**. Event names must live in TypeScript.

| File | Role |
|------|------|
| `src/lib/events.ts` | Event literals — **CLI reads this** |
| `src/lib/tracker.ts` | SDK + `trackFeature()` |
| `src/App.svelte` | UI — imports `trackSveltePageView()` / `trackSvelteClick()` |

Even with `<script lang="ts">` inside `.svelte`, the CLI does not run Svelte SFC analysis. Keep literals in `.ts`.

---

## Project structure

```
svelte/
├── eventra.json
└── src/
    ├── lib/tracker.ts
    ├── lib/events.ts
    └── App.svelte
```

---

## Run

```bash
pnpm dev:svelte
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```bash
cd examples/frontend/svelte
eventra init
eventra sync
```

**Detected events:** `svelte_page_view`, `svelte_click`

---

## Docs

https://eventra.dev/docs
