# Eventra + NestJS

NestJS + **Eventra SDK** + **Eventra CLI**.

Tracking in `.ts` via `TrackerService` and interceptor — CLI resolves `this.tracker.track()` through the service layer.

---

## Project structure

```
nestjs/
├── eventra.json
└── src/tracker/
    ├── tracker.service.ts
    └── tracking.interceptor.ts
```

---

## Run

```bash
pnpm dev:nest
```

| Service | URL |
|---------|-----|
| Server | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```bash
cd examples/backend/nestjs
eventra init
eventra sync
```

**Detected events:** `nestjs_request`, `nestjs_response`, `nestjs_home`

---

## Docs

https://eventra.dev/docs
