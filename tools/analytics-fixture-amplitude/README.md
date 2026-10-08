# Analytics fixture: amplitude (detector coverage, not a real app)

Static event discovery for **Amplitude** (`@amplitude/analytics-browser`, `@amplitude/analytics-node`, `amplitude-js`) with the Eventra CLI `sinks` preset `amplitude` (needs `eventra-cli` >= 2.1.0). Every file also runs through `tsc --noEmit`; the third-party calls are only scanned, never executed.

```json
{ "sinks": [{ "preset": "amplitude" }] }
```

## What is covered

- `lib/browser.ts` — `amplitude.track("x")` and the object form `amplitude.track({ event_type: "x" })`; `"bad name!"` is excluded
- `lib/legacy.ts` — amplitude-js `logEvent("x")`, `getInstance().logEvent("x")` and a client under another variable name
- `lib/server.ts` — `@amplitude/analytics-node` with constants and the object form
- `lib/wrappers.ts` + `features/signup.ts` — wrappers, constants, enums, ternaries, template literals. Known gap: `amplitude.track({ event_type: payload.event })` (a *property* of the wrapper parameter inside the object form) is not propagated in eventra-cli 2.1.0
- `dual.ts` — Eventra SDK and Amplitude in one file: both are found by a single `eventra sync`

## Usage

```bash
cd tools/analytics-fixture-amplitude

eventra init     # detects the package(s) in package.json and pre-selects the `amplitude` preset
eventra sync     # 19 events
eventra check
eventra send     # first time: eventra send --trust-endpoint (mock endpoint)
pnpm typecheck
```

Calls through a wrapper that receive a ternary or template literal are listed as *dynamic* by `sync` together with the resolved names; the wrappers' own inner calls are listed as dynamic too. This is expected.
