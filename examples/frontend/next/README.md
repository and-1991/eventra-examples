# Eventra + Next.js

Frontend example showing how to track events using **Eventra SDK** in a Next.js App Router application.

---

## What is this?

This example demonstrates how to:

- track page views 
- track user interactions (clicks)
- send events from the browser via Eventra SDK

Runs in the browser (client components)
Uses Next.js App Router
No backend required for tracking

---

## Architecture

```id="arch-next"
Browser (Next.js Client Component)
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-next"
pnpm dev:next
```

App:

```id="srv-next"
http://localhost:3000
```

Mock API:

```id="api-next"
http://localhost:4000
```

---

## How it works

### 1. Client component

Tracking runs only on the client:

```ts id="next1"
"use client"
```

---

### 2. Initialize SDK

```ts id="next2"
const tracker = new Eventra({
  apiKey: "test",
  endpoint: "http://localhost:4000/track"
})
```

---

### 3. Track page view

```ts id="next3"
useEffect(() => {
  trackFeature("next_page_view")
}, [])
```

---

### 4. Track clicks

```ts id="next4"
<button onClick={() => trackFeature("next_click")}>
```

---

### 5. Send event

```ts id="next5"
tracker.track(name, data)
```

---

## Event Example

```json id="event-next"
{
  "events": [
    {
      "name": "next_click",
      "properties": {}
    }
  ]
}
```

---

## Flow

```id="flow-next"
Page loads
     ↓
useEffect()
     ↓
trackFeature("next_page_view")
     ↓
User clicks button
     ↓
trackFeature("next_click")
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```id="test-next"
http://localhost:3000
```

Click the button and check logs:

```id="logs-next"
TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

- page load → `next_page_view`
- button click → `next_click`

---

## Why Next.js App Router?

- clear separation of server / client components
- `"use client"` ensures browser execution 
- ideal for modern React apps

tracking runs only where it should — in the browser

---

## Notes

- SDK runs only in client components 
- do NOT call tracking in server components 
- batching handled automatically 
- no backend required

---

## Docs

https://eventra.dev/docs

---
