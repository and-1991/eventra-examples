# Eventra + Astro

Frontend example showing how to track events using **Eventra SDK** in an Astro application.

---

## What is this?

This example demonstrates how to:

- track page views 
- track user interactions (clicks)
- send events from the browser via Eventra SDK

Runs in the browser
No backend required
Uses client-side tracking

---

## Architecture

```id="arch-astro"
Browser (Astro)
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-astro"
pnpm dev:astro
```

App:

```id="srv-astro"
http://localhost:3000
```

Mock API:

```id="api-astro"
http://localhost:4000
```

---

## How it works

### 1. Initialize SDK

```ts id="astro1"
const tracker = new Eventra({
  apiKey: "test",
  endpoint: "http://localhost:4000/track"
})
```

---

### 2. Track page view

```ts id="astro2"
trackFeature("astro_page_view")
```

Triggered on:

```ts id="astro3"
window.addEventListener("DOMContentLoaded", ...)
```

---

### 3. Track clicks

```ts id="astro4"
btn.addEventListener("click", () => {
  trackFeature("astro_click")
})
```

---

### 4. Send event

```ts id="astro5"
tracker.track(name, data)
```

---

## Event Example

```json id="event-astro"
{
  "events": [
    {
      "name": "astro_click",
      "properties": {}
    }
  ]
}
```

---

## Flow

```id="flow-astro"
User opens page
     ↓
DOMContentLoaded
     ↓
trackFeature("astro_page_view")
     ↓
User clicks button
     ↓
trackFeature("astro_click")
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```id="test-astro"
http://localhost:3000
```

Click the button and check logs:

```id="logs-astro"
TRACK: astro_click
TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

- page load → `astro_page_view`
- button click → `astro_click`

---

## Why Astro?

Astro provides:

- minimal client-side JavaScript 
- fast page load performance 
- simple integration with browser SDKs

making it ideal for lightweight analytics

---

## Notes

- tracking runs in the browser 
- SDK handles batching automatically 
- no backend setup required 
- safe for production usage

---

## Docs

https://eventra.dev/docs

---
