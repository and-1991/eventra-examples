# Analytics fixture: posthog (detector coverage, not a real app)

Static event discovery for **PostHog** (`posthog-js`, `posthog-node`, `posthog-js/react`) with the Eventra CLI `sinks` preset `posthog` (needs `eventra-cli` >= 2.1.0). Every file also runs through `tsc --noEmit`; the third-party calls are only scanned, never executed.

```json
{ "sinks": [{ "preset": "posthog" }] }
```

## What is covered

- `lib/browser.ts` — `posthog.capture("x")` on the posthog-js singleton; `$pageview` and `"bad name!"` are excluded
- `lib/server.ts` — posthog-node `client.capture({ distinctId, event })`, including a typed class field (`this.analytics.capture(...)`)
- `components/Buttons.tsx` — `usePostHog()` under any variable name, the re-exported hook (`hooks.ts`: `usePostHog as useAnalytics`) and a `TrackedButton event="..."` JSX component prop
- `lib/wrappers.ts` + `features/*.ts` — wrappers (plain, property of the parameter, destructured+aliased, arrow), constants, enums, object members, ternaries, template literals, names with spaces, resolved cross-file
- `dual.ts` — Eventra SDK and PostHog in one file: both are found by a single `eventra sync`

## Usage

```bash
cd tools/analytics-fixture-posthog

eventra init     # detects the package(s) in package.json and pre-selects the `posthog` preset
eventra sync     # 19 events
eventra check
eventra send     # first time: eventra send --trust-endpoint (mock endpoint)
pnpm typecheck
```

Calls through a wrapper that receive a ternary or template literal are listed as *dynamic* by `sync` together with the resolved names; the wrappers' own inner calls are listed as dynamic too. This is expected.
