# Eventra + Vue

Frontend example showing how to track events using **Eventra SDK** in a Vue (Vite) application.

---

## What is this?

This example demonstrates how to:

- track page views 
- track user interactions (clicks)
- send events from the browser via Eventra SDK

Runs entirely in the browser
Built with Vue + Vite
No backend required

---

## Architecture

```id="arch-vue"
Browser (Vue App)
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-vue"
pnpm dev:vue
```

App:

```id="srv-vue"
http://localhost:3000
```

Mock API:

```id="api-vue"
http://localhost:4000
```

---

## How it works

### 1. Initialize SDK

```ts id="vue1"
const tracker = new Eventra({
  apiKey: "test",
  endpoint: "http://localhost:4000/track"
})
```

---

### 2. Track page view

```ts id="vue2"
onMounted(() => {
  trackFeature("vue_page_view")
})
```

---

### 3. Track clicks

```ts id="vue3"
<button @click="handleClick">
```

```ts id="vue4"
function handleClick() {
  trackFeature("vue_click")
}
```

---

### 4. Send event

```ts id="vue5"
tracker.track(name, data)
```

---

## Event Example

```json id="event-vue"
{
  "events": [
    {
      "name": "vue_click",
      "properties": {}
    }
  ]
}
```

---

## Flow

```id="flow-vue"
App mounts
     ↓
onMounted()
     ↓
trackFeature("vue_page_view")
     ↓
User clicks button
     ↓
trackFeature("vue_click")
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```id="test-vue"
http://localhost:3000
```

Click the button and check logs:

```id="logs-vue"
TRACK: vue_click
TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

* page load → `vue_page_view`
* button click → `vue_click`

---

## Why Vue?

- simple lifecycle (`onMounted`)
- reactive and lightweight 
- easy integration with browser SDKs

ideal for client-side analytics

---

## Notes

- tracking runs in the browser 
- SDK handles batching automatically 
- no backend required 
- safe for production usage

---

## Docs

https://eventra.dev/docs

---
