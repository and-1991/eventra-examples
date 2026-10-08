# Eventra + Google Analytics 4 (Vite + React)

A Vite + React shop using **react-ga4**: a `trackEvent` wrapper around `ReactGA.event(...)` plus a direct `ReactGA.event({ category, action })` call. Enabled in `eventra.json` through the `ga4` preset:

```json
{ "sinks": [{ "preset": "ga4" }] }
```

| File | GA4 usage |
|------|-----------|
| `src/lib/ga.ts` | `ReactGA.initialize`, `trackEvent()` wrapper; `ReactGA.send({ hitType: "pageview" })` is not an event |
| `src/lib/events.ts` | event names |
| `src/components/*.tsx` | wrapper calls with constants + `ReactGA.event({ action })` |

```bash
pnpm dev:ga4

cd examples/analytics/ga4
eventra init
eventra sync              # 4 events
eventra check
```

Other GA4 shapes (`gtag("event", ...)`, `@next/third-parties`, `vue-gtag`, `nuxt-gtag`) are covered by the detector fixture in [`tools/analytics-fixture-ga4`](../../../tools/analytics-fixture-ga4).
