# Eventra + Cloudflare Workers

Edge example showing how to track events using **Eventra SDK** in a Cloudflare Worker.

---

## What is this?

This example demonstrates how to:

- track requests in an edge environment 
- send events from Cloudflare Workers 
- use Eventra SDK without Node.js APIs

Runs on the edge (no server)
Uses standard `fetch` handler
Sends events via SDK

---

## Architecture

```id="arch-cf"
Incoming request
     ↓
Cloudflare Worker (fetch)
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-cf"
pnpm dev:cloudflare
```

Worker:

```id="srv-cf"
http://localhost:8787
```

Mock API:

```id="api-cf"
http://localhost:4000
```

---

## How it works

### 1. Fetch handler

```ts id="cf1"
export default {
  async fetch(request: Request): Promise<Response> {
```

---

### 2. Track request

```ts id="cf2"
tracker.track("cloudflare_request", {
  userId: "cf_user"
})
```

---

### 3. Return response

```ts id="cf3"
return new Response("OK", { status: 200 })
```

---

## Event Example

```json id="event-cf"
{
  "events": [
    {
      "name": "cloudflare_request",
      "properties": {
        "userId": "cf_user"
      }
    }
  ]
}
```

---

## Flow

```id="flow-cf"
HTTP Request
     ↓
Worker fetch()
     ↓
tracker.track()
     ↓
HTTP POST → Eventra API
     ↓
Response returned
```

---

## Test

Open:

```id="test-cf"
http://localhost:8787
```

Then check logs:

```id="logs-cf"
TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

- every request → `cloudflare_request`

---

## Script test (non-request)

You can also track events without HTTP:

```bash id="test-cf-script"
pnpm test
```

Example:

```ts id="cf-script"
tracker.track("cloudflare_test")

setTimeout(() => {
  tracker.track("cloudflare_after_timeout")
}, 1000)
```

---

## Edge specifics

Cloudflare Workers:

- run in isolate (no Node.js)
- use Web APIs only 
- require async-safe code

Eventra SDK works without Node dependencies

---

## Notes

- `track()` is async but can be fire-and-forget 
- no lifecycle hooks — manual tracking 
- works in edge runtimes (Cloudflare, Deno, etc.)
- batching handled by SDK
