# Eventra + Svelte

Frontend example showing how to track events using **Eventra SDK** in a Svelte application.

---

## What is this?

This example demonstrates how to:

- track page views 
- track user interactions (clicks)
- send events from the browser via Eventra SDK

Runs entirely in the browser
Built with Svelte + Vite
No backend required

---

## Architecture

```id="arch-svelte"
Browser (Svelte App)
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-svelte"
pnpm dev:svelte
```

App:

```id="srv-svelte"
http://localhost:3000
```

Mock API:

```id="api-svelte"
http://localhost:4000
```

---

## How it works

### 1. Initialize SDK

```ts id="svelte1"
const tracker = new Eventra({
  apiKey: "test",
  endpoint: "http://localhost:4000/track"
})
```

---

### 2. Track page view

```ts id="svelte2"
onMount(() => {
  trackFeature("svelte_page_view")
})
```

---

### 3. Track clicks

```ts id="svelte3"
<button on:click={handleClick}>
```

```ts id="svelte4"
function handleClick() {
  trackFeature("svelte_click")
}
```

---

### 4. Send event

```ts id="svelte5"
tracker.track(name, data)
```

---

## Event Example

```json id="event-svelte"
{
  "events": [
    {
      "name": "svelte_click",
      "properties": {}
    }
  ]
}
```

---

## Flow

```id="flow-svelte"
App mounts
     ↓
onMount()
     ↓
trackFeature("svelte_page_view")
     ↓
User clicks button
     ↓
trackFeature("svelte_click")
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```id="test-svelte"
http://localhost:3000
```

Click the button and check logs:

```id="logs-svelte"
TRACK HIT
EVENT: { ... }
```

---

##  What is being tracked

- page load → `svelte_page_view`
- button click → `svelte_click`

---

## Why Svelte?

- minimal runtime overhead 
- simple lifecycle (`onMount`)
- no heavy framework abstraction

ideal for lightweight analytics integration

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
