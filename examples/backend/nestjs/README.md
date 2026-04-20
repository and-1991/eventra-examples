# Eventra + NestJS

Backend example showing how to track events using **Eventra SDK** in a NestJS application.

---

## What is this?

This example demonstrates how a backend application can:

- track incoming requests 
- track responses and execution time 
- send events to Eventra via SDK

The server does **NOT receive events**
It **sends them via SDK**

---

## Architecture

```id="arch-nest"
HTTP Request
     ↓
NestJS (Interceptor)
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-nest"
pnpm dev:nest
```

Server:

```id="srv-nest"
http://localhost:3000
```

Mock API:

```id="api-nest"
http://localhost:4000
```

---

## How it works

### 1. Tracker Service (DI)

```ts id="svc1"
@Injectable()
export class TrackerService {
  track(name: string, data?: any) {
    this.tracker.track(name, data)
  }
}
```

---

### 2. Global interceptor

```ts id="int1"
app.useGlobalInterceptors(
  app.get(TrackingInterceptor)
)
```

---

### 3. Request tracking

```ts id="int2"
this.tracker.track("nestjs_request", {
  path: req.url,
  method: req.method
})
```

---

### 4. Response tracking

```ts id="int3"
tap(() => {
  this.tracker.track("nestjs_response", {
    statusCode,
    duration
  })
})
```

---

### 5. Route tracking

```ts id="route-nest"
@Get()
getHello() {
  this.tracker.track("nestjs_home")
}
```

---

## Event Example

```json id="event-nest"
{
  "events": [
    {
      "name": "nestjs_request",
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

```id="flow-nest"
Incoming request
     ↓
Interceptor (before)
     ↓
tracker.track("nestjs_request")
     ↓
Controller
     ↓
Interceptor (after)
     ↓
tracker.track("nestjs_response")
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```id="test-nest"
http://localhost:3000
```

Then check logs:

```id="logs-nest"
TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

- every request → `nestjs_request`
- every response → `nestjs_response`
- execution time → `duration`
- homepage → `nestjs_home`

---

## Why NestJS?

Nest provides:

- dependency injection (TrackerService)
- interceptors (request lifecycle control)
- clean separation of concerns

making tracking centralized and scalable

---

## Notes

- SDK handles batching automatically 
- interceptor ensures full lifecycle tracking 
- no manual HTTP calls required 
- production-ready architecture pattern

---

## Docs

https://eventra.dev/docs

---
