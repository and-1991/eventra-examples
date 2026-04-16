# Eventra + Hono

Example of using Eventra SDK in Hono (Node + Edge).

## Install
pnpm install

## Run (Node)
pnpm dev

## Edge usage
export default {
fetch: app.fetch
};

## Usage

### Global tracking (middleware)
app.use("*", trackingMiddleware);

### Manual tracking (route)
trackFeature("hono_home");

## What is shown here
- Middleware-based tracking
- Edge-compatible setup
- Dual runtime (Node + Edge)
