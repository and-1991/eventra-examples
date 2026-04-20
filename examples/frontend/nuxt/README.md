# Eventra + Nuxt

Frontend example showing how to track events using **Eventra SDK** in a Nuxt application.

---

## What is this?

This example demonstrates how to:

- track page views 
- track user interactions (clicks)
- inject Eventra SDK via Nuxt plugin 
- send events from the browser

Runs in the browser
Uses Nuxt plugin system
No backend required

---

## Architecture

```id="arch-nuxt"
Browser (Nuxt)
     ↓
Nuxt Plugin (provide)
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-nuxt"
pnpm dev:nuxt
```

App:

```id="srv-nuxt"
http://localhost:3000
```

Mock API:

```id="api-nuxt"
http://localhost:4000
```

---

## How it works

### 1. Plugin (SDK injection)

```ts id="nuxt1"
export default defineNuxtPlugin(() => {
  return {
    provide: {
      trackFeature
    }
  }
})
```

---

### 2. Access in components

```ts id="nuxt2"
const { $trackFeature } = useNuxtApp()
```

---

### 3. Track page view

```ts id="nuxt3"
onMounted(() => {
  $trackFeature("nuxt_page_view")
})
```

---

### 4. Track clicks

```ts id="nuxt4"
<button @click="handleClick">
```

```ts id="nuxt5"
function handleClick() {
  $trackFeature("nuxt_click")
}
```

---

### 5. Send event

```ts id="nuxt6"
tracker.track(name, data)
```

---

## Event Example

```json id="event-nuxt"
{
  "events": [
    {
      "name": "nuxt_click",
      "properties": {}
    }
  ]
}
```

---

## Flow

```id="flow-nuxt"
Page loads
     ↓
onMounted()
     ↓
$trackFeature("nuxt_page_view")
     ↓
User clicks button
     ↓
$trackFeature("nuxt_click")
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```id="test-nuxt"
http://localhost:3000
```

Click the button and check logs:

```id="logs-nuxt"
TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

- page load → `nuxt_page_view`
- button click → `nuxt_click`

---

## Why Nuxt?

Nuxt provides:

- plugin system (dependency injection)
- composables (`useNuxtApp`)
- SSR + client separation

making SDK integration clean and reusable

---

## Notes

- tracking runs only on client (`onMounted`)
- plugin ensures single SDK instance 
- batching handled automatically 
- no backend required

---

## Docs

https://eventra.dev/docs

---
