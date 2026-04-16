# Eventra + NestJS

Example of using Eventra SDK in NestJS.

## Install
pnpm install

## Run
pnpm start:dev

## Usage

### Global tracking (interceptor)
app.useGlobalInterceptors(
app.get(TrackingInterceptor)
);

### Manual tracking (service)
this.tracker.track("nestjs_home");

## What is shown here
- Global tracking via interceptor
- Service-based SDK usage
- Integration with Nest DI system
