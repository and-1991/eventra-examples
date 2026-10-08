# Analytics fixture: ga4 (detector coverage, not a real app)

Static event discovery for **Google Analytics 4** (`gtag.js` (global), `react-ga4`, `@next/third-parties`, `vue-gtag`) with the Eventra CLI `sinks` preset `ga4` (needs `eventra-cli` >= 2.1.0). Every file also runs through `tsc --noEmit`; the third-party calls are only scanned, never executed.

```json
{ "sinks": [{ "preset": "ga4" }] }
```

## What is covered

- `lib/gtag.ts` — `gtag("event", name, params)` and `window.gtag(...)`; `gtag("js" | "config" | "set", ...)` are not events and are ignored
- `lib/react-ga.ts` — `ReactGA.event("x")` and `ReactGA.event({ category, action: "x" })`
- `components/NextEvents.tsx` — `sendGAEvent("event", "x")` from `@next/third-parties/google` and a `TrackedButton event="..."` JSX component prop
- `lib/vue-gtag.ts` — vue-gtag `event("x")` and `this.$gtag.event("x")`
- `lib/wrappers.ts` + `features/shop.ts` — wrappers, constants, enums, ternaries, template literals, names with spaces/colons
- `nuxt-gtag` (`useTrackEvent`, `useGtag`) is also supported by the preset but not included here
- `dual.ts` — Eventra SDK and Google Analytics 4 in one file: both are found by a single `eventra sync`

## Usage

```bash
cd tools/analytics-fixture-ga4

eventra init     # detects the package(s) in package.json and pre-selects the `ga4` preset
eventra sync     # 21 events
eventra check
eventra send     # first time: eventra send --trust-endpoint (mock endpoint)
pnpm typecheck
```

Calls through a wrapper that receive a ternary or template literal are listed as *dynamic* by `sync` together with the resolved names; the wrappers' own inner calls are listed as dynamic too. This is expected.
