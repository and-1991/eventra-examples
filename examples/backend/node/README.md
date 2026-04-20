# Eventra + Node.js

Backend example showing how to track events using **Eventra SDK** in a plain Node.js application.

---

## What is this?

This example demonstrates how to:

- track events from a standalone Node.js script 
- send data to Eventra without any framework 
- instrument background jobs, workers, or CLI tools

No HTTP server
No framework
Just SDK

---

## Architecture

```id="arch-node"
Node Script
     ↓
Eventra SDK
     ↓
Eventra API (http://localhost:4000/track)
```

---

## Run

```bash id="run-node"
pnpm dev:node
```

---

## How it works

### 1. Create tracker

```ts id="node1"
const tracker = new Eventra({
  apiKey: "test",
  endpoint: "http://localhost:4000/track"
})
```

---

### 2. Track event

```ts id="node2"
await tracker.track("node_started", {
  userId: "node_user"
})
```

---

### 3. Script execution

```ts id="node3"
async function main() {
  await trackFeature("node_started")
}
```

---

## Event Example

```json id="event-node"
{
  "events": [
    {
      "name": "node_started",
      "properties": {
        "userId": "node_user"
      }
    }
  ]
}
```

---

## Flow

```id="flow-node"
Script starts
     ↓
trackFeature()
     ↓
tracker.track()
     ↓
HTTP POST → Eventra API
```

---

## Test

Run:

```bash id="test-node"
pnpm dev:node
```

Then check logs:

```id="logs-node"
 TRACK HIT
EVENT: { ... }
```

---

## What is being tracked

- app start → `node_started`

---

## Use cases

- background jobs 
- cron tasks 
- CLI tools 
- workers 
- data pipelines

---

## Notes

- `track()` returns a Promise → await it if needed 
- no lifecycle hooks — manual tracking 
- SDK handles batching automatically 
- works in any Node.js environment

