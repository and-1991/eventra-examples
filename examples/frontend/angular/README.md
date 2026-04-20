# Eventra + Angular (CLI)

Frontend example showing how to track events using **Eventra SDK** in an Angular application powered by Angular CLI.

---

## What is this?

This example demonstrates how to:

- track page views
- track user interactions (clicks)
- send events from the browser via Eventra SDK

Runs in the browser  
Uses Angular CLI  
Uses client-side tracking

---

## Architecture

```text
Browser (Angular)
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash
pnpm dev:angular
```

App:

```
http://localhost:3000
```

Mock API:

```
http://localhost:4000
```

---

## How it works

### 1. Initialize SDK

```ts
const tracker = new Eventra({
  apiKey: "test",
  endpoint: "http://localhost:4000/track"
})
```

---

### 2. Track page view

```ts
constructor() {
  tracker.track("angular_page_view")
}
```

---

### 3. Track clicks

```ts
handleClick() {
  tracker.track("angular_click")
}
```

---

### 4. Send event

```ts
tracker.track(name, data)
```

---

## Event Example

```json
{
  "events": [
    {
      "name": "angular_click",
      "properties": {}
    }
  ]
}
```

---

## Flow

```text
App loads
     ↓
constructor()
     ↓
track("angular_page_view")
     ↓
User clicks button
     ↓
track("angular_click")
     ↓
HTTP POST → Eventra API
```

---

## Test

Open:

```
http://localhost:4200
```

Click the button and check logs:

```
App mounted
clicked
```

---

## What is being tracked

- page load → `angular_page_view`
- button click → `angular_click`

---

## Why Angular CLI?

Angular CLI provides:

- stable and official Angular environment
- zero-config setup
- built-in tooling and optimizations

making it ideal for production-ready applications

---

## Notes

- tracking runs in the browser
- SDK handles batching automatically
- no backend setup required
- safe for production usage

---

## Docs

https://eventra.dev/docs
