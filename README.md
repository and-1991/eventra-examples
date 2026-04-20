<p align="center">
  <img src="./assets/eventra-icon-animated.svg" width="120" />
</p>

<h1 align="center">Eventra Examples</h1>

<p align="center">
  Production-grade examples of using <b>Eventra SDK</b> across frontend, backend, and edge runtimes.
</p>

<p align="center">
  <a href="#quick-start"><b>Quick Start</b></a> •
  <a href="#examples"><b>Examples</b></a> •
  <a href="https://eventra.dev/docs"><b>Docs</b></a>
</p>

---

## What is this?

This repository demonstrates how to use **Eventra SDK** in real-world environments:

- Track feature usage 
- Analyze product behavior 
- Monitor backend activity 
- Validate cross-runtime compatibility

---

## Quick Start

```bash
pnpm install
pnpm dev:react
```

Open: http://localhost:3000
Mock API: http://localhost:4000

---

## Examples

### Frontend

| Framework  | Example                             |
|------------| ----------------------------------- |
| React      | [View](./examples/frontend/react)   |
| Vue        | [View](./examples/frontend/vue)     |
| Svelte     | [View](./examples/frontend/svelte)  |
| Vanilla JS | [View](./examples/frontend/vanilla) |
| Next.js    | [View](./examples/frontend/next)    |
| Nuxt       | [View](./examples/frontend/nuxt)    |
| Astro      | [View](./examples/frontend/astro)   |

---

### Backend

| Framework | Example                            |
|-----------| ---------------------------------- |
| Node.js   | [View](./examples/backend/node)    |
| Express   | [View](./examples/backend/express) |
| Fastify   | [View](./examples/backend/fastify) |
| Hono      | [View](./examples/backend/hono)    |
| NestJS    | [View](./examples/backend/nestjs)  |

---

### Edge / Runtimes

| Runtime            | Example                                |
| ------------------ | -------------------------------------- |
|  Vercel Edge       | [View](./examples/runtimes/vercel)     |
| Cloudflare Workers | [View](./examples/runtimes/cloudflare) |

---

## Run Any Example

```bash
pnpm dev:react
pnpm dev:vue
pnpm dev:nuxt
pnpm dev:astro
pnpm dev:svelte
pnpm dev:vanilla

pnpm dev:node
pnpm dev:express
pnpm dev:fastify
pnpm dev:hono
pnpm dev:nest

pnpm dev:vercel
pnpm test:cf
```

---

## Event Flow

All examples send events to:

```bash
http://localhost:4000/track
```

Example output:

```bash
TRACK HIT
EVENT: {
  "name": "feature.used",
  "properties": {}
}
```

---

## Why this repo exists

* Validate SDK behavior across environments
* Provide copy-paste ready integrations
* Test CLI static analysis
* Ensure runtime compatibility (browser, server, edge)

---

## Tech Coverage

* Browsers (React, Vue, Svelte, Vanilla)
* SSR frameworks (Next.js, Nuxt, Astro)
* Node runtimes (Express, Fastify, NestJS)
* Edge (Vercel, Cloudflare)

---

## Documentation

https://eventra.dev/docs

---

## Local Mock Server

All examples run with a built-in mock ingestion API:

```bash
http://localhost:4000
```

No external services required.

---

## Philosophy

> Build once. Track everywhere.

Eventra SDK is designed to work consistently across all runtimes without configuration.

---

## License

MIT
