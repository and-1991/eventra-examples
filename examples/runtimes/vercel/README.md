# Eventra + Vercel Edge

Edge example showing how to track events using **Eventra SDK** in a Vercel Edge Function (Next.js App Router).

---

## What is this?

This example demonstrates how to:

- track API requests in an edge runtime 
- send events via Eventra SDK 
- use tracking inside Next.js App Router

Runs on Vercel Edge
No Node.js APIs
Uses Web Fetch runtime

---

## Architecture

```id="arch-vercel"
HTTP Request
     ↓
Vercel Edge Function (GET)
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-vercel"
pnpm dev:vercel
```

App:

```id="srv-vercel"
http://localhost:3000
```

Mock API:

```id="api-vercel"
http://localhost:4000
```

---

## How it works

### 1. Edge runtime

```ts id="vercel1"
export const runtime = "edge"
```

---

### 2. API route (App Router)

```ts id="vercel2"
export async function GET(request: Request)
```

---

### 3. Track request

```ts id="vercel3"
tracker.track("vercel_request", {
  path: new URL(request.url).pathname
})
```

---

### 4. Additional tracking

```ts id="vercel4"
tracker.track("vercel_api_hit")
```

---

### 5. Return response

```ts id="vercel5"
return new Response(JSON.stringify({ ok: true }))
```

---

## Event Example

```json id="event-vercel"
{
  "events": [
    {
      "name": "vercel_request",
      "properties": {
        "path": "/api/track"
      }
    }
  ]
}
```

---

## Flow

```id="flow-vercel"
HTTP Request
     ↓
Edge GET handler
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

```id="test-vercel"
http://localhost:3000/api/track
```

Then check logs:

```id="logs-vercel"
TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

- every API call → `vercel_request`
- generic hit → `vercel_api_hit`

---

## 🧠 Why Vercel Edge?

- ultra-low latency (edge execution)
- runs without Node.js 
- native Web API environment 
- perfect for lightweight tracking

---

## Notes

- `track()` is async (fire-and-forget)
- no lifecycle hooks — manual tracking 
- works in all edge runtimes 
- batching handled by SDK
