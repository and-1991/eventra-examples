# Eventra + Express

Backend example showing how to track events using **Eventra SDK** in an Express server.

---

## What is this?

This example demonstrates how a backend application can:

- track API usage 
- send events to Eventra 
- monitor server-side behavior

The server does **NOT receive events**
It **sends them via SDK**

---

## Architecture

```
HTTP Request
     ↓
Express Server
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash
pnpm dev:express
```

Server:

```
http://localhost:3000
```

Mock API:

```
http://localhost:4000
```

---

## How it works

### 1. Auto tracking (middleware)

```ts
app.use(trackingMiddleware)
```

Every request triggers:

```ts
trackFeature("express_request")
```

---

### 2. Route tracking

```ts
router.get("/", () => {
  trackFeature("express_home")
})
```

---

### 3. SDK sends events

```ts
tracker.track(name, {
  userId: "express_user"
})
```

---

## Event Example

```json
{
  "events": [
    {
      "name": "express_request",
      "properties": {
        "userId": "express_user"
      }
    }
  ]
}
```

---

## Flow

```
GET / → Express
     ↓
trackingMiddleware
     ↓
tracker.track()
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```
http://localhost:3000
```

Then check logs:

```
TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

- every request (`express_request`)
- homepage visits (`express_home`)

---

## Notes

- SDK handles batching automatically 
- No manual HTTP calls required 
- Safe for production usage 
- Works in any Node.js environment

