# Eventra + Amplitude (Express)

An Express API using **@amplitude/analytics-node**: a `trackEvent` wrapper plus a direct `amplitude.track({ event_type })` call. Enabled in `eventra.json` through the `amplitude` preset:

```json
{ "sinks": [{ "preset": "amplitude" }] }
```

| File | Amplitude usage |
|------|-----------------|
| `src/lib/analytics.ts` | `amplitude.init`, `trackEvent()` wrapper |
| `src/lib/events.ts` | event names (spaces are fine: `Order Placed`) |
| `src/routes/*.ts` | wrapper calls with constants/literals + the object form |

```bash
pnpm dev:amplitude

cd examples/analytics/amplitude
eventra init
eventra sync              # 4 events
eventra check
```

Browser SDK and legacy `amplitude-js` shapes are covered by the detector fixture in [`tools/analytics-fixture-amplitude`](../../../tools/analytics-fixture-amplitude).
