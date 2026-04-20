# Eventra + Hono

Backend example showing how to track events using **Eventra SDK** in a Hono server.

---

## What is this?

This example demonstrates how a backend application can:

- track incoming requests 
- track outgoing responses 
- send events to Eventra via SDK

The server does **NOT receive events**
It **sends them via SDK**

---

## Architecture

```id="arch-hono"
HTTP Request
     ↓
Hono Middleware
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-hono"
pnpm dev:hono
```

Server:

```id="srv-hono"
http://localhost:3000
```

Mock API:

```id="api-hono"
http://localhost:4000
```

---

## How it works

### 1. Global middleware

```ts id="mw1"
app.use("*", trackingMiddleware)
```

---

### 2. Request tracking

```ts id="mw2"
trackFeature("hono_request", {
  path: c.req.path,
  method: c.req.method
})
```

---

### 3. Response tracking

```ts id="mw3"
await next()

trackFeature("hono_response", {
  status: c.res.status
})
```

---

### 4. Route tracking

```ts id="route-hono"
app.get("/", (c) => {
  trackFeature("hono_home")
})
```

---

## Event Example

```json id="event-hono"
{
  "events": [
    {
      "name": "hono_request",
      "properties": {
        "path": "/",
        "method": "GET"
      }
    }
  ]
}
```

---

## Flow

```id="flow-hono"
Incoming request
     ↓
trackingMiddleware (before)
     ↓
tracker.track("hono_request")
     ↓
Route handler
     ↓
trackingMiddleware (after)
     ↓
tracker.track("hono_response")
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```id="test-hono"
http://localhost:3000
```

Then check logs:

```id="logs-hono"
TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

- every request → `hono_request`
- every response → `hono_response`
- homepage → `hono_home`

---

## Why Hono?

Hono provides:

- minimal and fast middleware system 
- edge-first compatibility 
- same code works in Node and edge runtimes

making it ideal for lightweight tracking layers

---

## Node vs Edge

### Node

```bash id="node-hono"
pnpm dev:hono
```

### Edge (example)

```bash id="edge-hono"
pnpm dev:edge
```

---

## Notes

- SDK handles batching automatically
- `track()` is async but safely ignored 
- Middleware ensures full request lifecycle tracking 
- Works in server and edge environments

---

## Docs

https://eventra.dev/docs

---
