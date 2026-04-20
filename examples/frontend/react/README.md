# Eventra + React

Frontend example showing how to track events using **Eventra SDK** in a React (Vite) application.

---

## What is this?

This example demonstrates how to:

- track page views 
- track user interactions (clicks)
- send events from the browser via Eventra SDK

Runs entirely in the browser
Built with React + Vite
No backend required

---

## Architecture

```id="arch-react"
Browser (React App)
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-react"
pnpm dev:react
```

App:

```id="srv-react"
http://localhost:3000
```

Mock API:

```id="api-react"
http://localhost:4000
```

---

## How it works

### 1. Initialize SDK

```ts id="react1"
const tracker = new Eventra({
  apiKey: "test",
  endpoint: "http://localhost:4000/track"
})
```

---

### 2. Track page view

```ts id="react2"
useEffect(() => {
  trackFeature("react_page_view")
}, [])
```

---

### 3. Track clicks

```ts id="react3"
<button onClick={handleClick}>
```

```ts id="react4"
const handleClick = () => {
  trackFeature("react_click")
}
```

---

### 4. Send event

```ts id="react5"
tracker.track(name, data)
```

---

## Event Example

```json id="event-react"
{
  "events": [
    {
      "name": "react_click",
      "properties": {}
    }
  ]
}
```

---

## Flow

```id="flow-react"
App loads
     ↓
useEffect()
     ↓
trackFeature("react_page_view")
     ↓
User clicks button
     ↓
trackFeature("react_click")
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```id="test-react"
http://localhost:3000
```

Click the button and check logs:

```id="logs-react"
TRACK: react_click
TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

- page load → `react_page_view`
- button click → `react_click`

---

## Why React + Vite?

- fast development with Vite 
- simple SPA architecture 
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
