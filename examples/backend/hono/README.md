# Eventra + Fastify

Example of using Eventra SDK with Fastify plugins and hooks.

## Install
pnpm install

## Run
pnpm dev

## Usage

### Global tracking (hook)
app.addHook("onRequest", () => {
app.tracker.track("fastify_request").catch(() => {});
});

### Manual tracking (route)
app.tracker.track("fastify_home").catch(() => {});

## What is shown here
- Fastify plugin (decorate)
- Hook-based tracking
- Non-blocking SDK usage
