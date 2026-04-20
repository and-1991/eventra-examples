# Eventra + Fastify

Backend example showing how to track events using **Eventra SDK** in a Fastify server.

---

## What is this?

This example demonstrates how a backend application can:

- track incoming requests 
- track responses and status codes 
- send events to Eventra automatically

The server does **NOT receive events**
It **sends them via SDK**

---

## Architecture

```id="arch1"
HTTP Request
     ↓
Fastify (hooks)
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run1"
pnpm dev:fastify
```

Server:

```id="srv1"
http://localhost:3000
```

Mock API:

```id="api1"
http://localhost:4000
```

---

## How it works

### 1. Tracker plugin

```ts id="plugin1"
app.register(trackerPlugin)
```

Creates SDK instance:

```ts id="plugin2"
const tracker = new Eventra({
  apiKey: "test",
  endpoint: "http://localhost:4000/track"
})
```

And injects it:

```ts id="plugin3"
app.decorate("tracker", tracker)
```

---

### 2. Global tracking (hooks)

#### onRequest

```ts id="hook1"
app.addHook("onRequest", async () => {
  app.tracker.track("fastify_request")
})
```

#### onResponse

```ts id="hook2"
app.addHook("onResponse", async (req, reply) => {
  app.tracker.track("fastify_response", {
    statusCode: reply.statusCode
  })
})
```

---

### 3. Route-level tracking

```ts id="route1"
app.get("/", async () => {
  app.tracker.track("fastify_home")
})
```

---

## Event Example

```json id="event1"
{
  "events": [
    {
      "name": "fastify_request",
      "properties": {
        "userId": "fastify_user"
      }
    }
  ]
}
```

---

## Flow

```id="flow1"
Incoming request
     ↓
onRequest hook
     ↓
tracker.track()
     ↓
Route handler
     ↓
onResponse hook
     ↓
tracker.track()
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```id="test1"
http://localhost:3000
```

Then check logs:

```id="test2"
TRACK HIT
EVENT: { ... }
```

---

## ⚙What is being tracked

- every request → `fastify_request`
- every response → `fastify_response`
- homepage → `fastify_home`

---

## Why Fastify here?

Fastify allows:

- lifecycle hooks (onRequest / onResponse)
- plugin-based architecture 
- type-safe injection (`app.tracker`)

 making tracking fully automatic and centralized

---

## Notes

- SDK handles batching automatically 
- No manual HTTP calls 
- Plugin ensures single tracker instance 
- Safe for production usage

---

## Docs

https://eventra.dev/docs

---
