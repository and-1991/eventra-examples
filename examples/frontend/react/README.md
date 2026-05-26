# Eventra + React

React (Vite) + **Eventra SDK** + **Eventra CLI**.

---

## CLI and React

`.tsx` files **are** scanned, but this example keeps **all event name literals** in `src/events.ts` so the list stays in one place (same pattern as Vue/Svelte).

| File | Role |
|------|------|
| `src/events.ts` | Literals + `trackReactPageView()` / `trackReactClick()` |
| `src/tracker.ts` | SDK + `trackFeature()` |
| `src/App.tsx` | UI — no `"event_name"` strings |

---

## Project structure

```
react/
├── eventra.json
└── src/
    ├── tracker.ts
    ├── events.ts
    └── App.tsx
```

---

## Run

```bash
pnpm dev:react
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```bash
cd examples/frontend/react
eventra init
eventra sync
```

**Detected events:** `react_page_view`, `new_event`, `check_mode`, `react_click`, `react_click_enum`

---

## Docs

https://eventra.dev/docs
