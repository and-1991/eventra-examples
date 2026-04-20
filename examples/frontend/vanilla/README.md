# Eventra + Vanilla JS

Frontend example showing how to track events using **Eventra SDK** in a plain JavaScript application.

---

## What is this?

This example demonstrates how to:

- track page views 
- track user interactions (clicks)
- use Eventra SDK without any framework 
- load SDK directly from CDN (ESM)

No framework
No build step required
Pure browser JavaScript

---

## Architecture

```id="arch-vanilla"
Browser (Vanilla JS)
     ↓
Eventra SDK (CDN / ESM)
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-vanilla"
pnpm dev:vanilla
```

App:

```id="srv-vanilla"
http://localhost:3000
```

Mock API:

```id="api-vanilla"
http://localhost:4000
```

---

## How it works

### 1. Load SDK from CDN

```js id="vanilla1"
import { Eventra } from "https://esm.sh/@eventra_dev/eventra-sdk"
```

---

### 2. Initialize tracker

```js id="vanilla2"
const tracker = new Eventra({
  apiKey: "test",
  endpoint: "http://localhost:4000/track"
})
```

---

### 3. Track page view

```js id="vanilla3"
document.addEventListener("DOMContentLoaded", () => {
  trackFeature("vanilla_page_view")
})
```

---

### 4. Track clicks

```js id="vanilla4"
btn.addEventListener("click", () => {
  trackFeature("vanilla_click")
})
```

---

### 5. Send event

```js id="vanilla5"
tracker.track(name, data)
```

---

## Event Example

```json id="event-vanilla"
{
  "events": [
    {
      "name": "vanilla_click",
      "properties": {}
    }
  ]
}
```

---

## Flow

```id="flow-vanilla"
Page loads
     ↓
DOMContentLoaded
     ↓
trackFeature("vanilla_page_view")
     ↓
User clicks button
     ↓
trackFeature("vanilla_click")
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```id="test-vanilla"
http://localhost:3000
```

Click the button and check logs:

```id="logs-vanilla"
TRACK: vanilla_click
TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

- page load → `vanilla_page_view`
- button click → `vanilla_click`

---

## Why Vanilla JS?

- zero dependencies 
- no framework lock-in 
- fastest possible setup 
- works anywhere (CDN-based)

ideal for quick integrations and scripts

---

## Notes

- SDK is loaded via ESM CDN (`esm.sh`)
- no bundler required 
- works in modern browsers only 
- batching handled automatically

---

## Docs

https://eventra.dev/docs

---

