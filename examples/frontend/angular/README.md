# Eventra + Angular

Angular (CLI) + **Eventra SDK** + **Eventra CLI**.

---

## CLI and Angular

Component file is `.ts` (scannable), but **event literals** live in `src/app/events.ts` so tracking logic is not mixed with templates.

| File | Role |
|------|------|
| `src/app/events.ts` | `tracker.track("…")` literals |
| `src/app/app.component.ts` | Calls `trackAngularPageView()` / `trackAngularClick()` |

Uses direct SDK `track()` (no `trackFeature` wrapper).

---

## Project structure

```
angular/
├── eventra.json
└── src/app/
    ├── events.ts
    └── app.component.ts
```

---

## Run

```bash
pnpm dev:angular
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```bash
cd examples/frontend/angular
eventra init
eventra sync
```

**Detected events:** `angular_page_view`, `angular_click`

---

## Docs

https://eventra.dev/docs
