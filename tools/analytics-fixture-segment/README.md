# Analytics fixture: segment (detector coverage, not a real app)

Static event discovery for **Segment** (`@segment/analytics-next`, `@segment/analytics-node`) with the Eventra CLI `sinks` preset `segment` (needs `eventra-cli` >= 2.1.0). Every file also runs through `tsc --noEmit`; the third-party calls are only scanned, never executed.

```json
{ "sinks": [{ "preset": "segment" }, { "callee": "audit.log", "nameArg": 1 }] }
```

## What is covered

- `lib/browser.ts` — `const [analytics] = await AnalyticsBrowser.load(...)`, `analytics.track("x", props)`; `"bad name!"` is excluded
- `lib/server.ts` — analytics-node `client.track({ userId, event })`, including a typed class field
- `components/Buttons.tsx` — direct calls and a `TrackedButton event="..."` JSX component prop
- `lib/wrappers.ts` + `features/orders.ts` — wrappers, constants, enums, ternaries, template literals, names with spaces/colons (`Order Completed`, `App: Trial Started`)
- `lib/audit.ts` — a **custom sink** rule in `eventra.json`: `{ "callee": "audit.log", "nameArg": 1 }`
- `dual.ts` — Eventra SDK and Segment in one file: both are found by a single `eventra sync`

## Usage

```bash
cd tools/analytics-fixture-segment

eventra init     # detects the package(s) in package.json and pre-selects the `segment` preset
eventra sync     # 18 events
eventra check
eventra send     # first time: eventra send --trust-endpoint (mock endpoint)
pnpm typecheck
```

Calls through a wrapper that receive a ternary or template literal are listed as *dynamic* by `sync` together with the resolved names; the wrappers' own inner calls are listed as dynamic too. This is expected.
