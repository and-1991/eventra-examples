# Eventra + Express

Example of using Eventra SDK in an Express application.

## Install
pnpm install

## Run
pnpm dev

## Usage

### Global tracking (middleware)
app.use(trackingMiddleware);

### Manual tracking (route)
trackFeature("express_home");

## What is shown here
- Global tracking via middleware
- Route-level tracking
- Safe non-blocking SDK usage
