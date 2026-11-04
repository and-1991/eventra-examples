# Test results

Run on **2026-11-04**, Node 24.11.1, pnpm 10.22.0, Linux. All suites green.

## Package versions under test

| Package | Version |
|---|---|
| `@eventra_dev/eventra-cli` | 2.5.3 |
| `@eventra_dev/eventra-sdk` | 2.0.9 |
| `@eventra_dev/cli-plugin-vue` | 1.2.5 |
| `@eventra_dev/cli-plugin-svelte` | 1.2.5 |
| `@eventra_dev/cli-plugin-astro` | 1.2.4 |
| `@eventra_dev/cli-plugin-angular` | 1.2.4 |

## Summary

| Suite | Command | Result |
|---|---|---|
| CLI feature tests (core detection, casts, cross-file, hooks, watch, check, send) | `pnpm test:cli` | **74 / 74** |
| SDK feature tests (batching, retry, circuit breaker, idempotency, lifecycle, runtimes) | `pnpm test:sdk` | **24 / 24** |
| SDK browser tests (Chromium: persistence, multi-tab, keepalive, visibilitychange) | `node tools/sdk-feature-tests/browser-run.mjs` | **6 / 6** |
| Example matrix: `eventra sync` + `check` + expected-events | `pnpm verify` | **23 / 23** |
| Example matrix: SDK smoke — real `POST` reaches mock server | `pnpm verify` | **15 / 15** |

CLI test groups: core detection 28, send 17, casts 11, check exit codes 5, watch 5, cross-file 4, lazy hooks 4.

## Example matrix (`pnpm verify`)

| Area | Examples | CLI sync/check | SDK smoke |
|---|---|---|---|
| Frontend | react, vue, svelte, vanilla, next, nuxt, astro, angular | ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ |
| Backend | node, express, fastify, hono, nestjs | ✅ ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ ✅ |
| Runtimes | cloudflare, vercel | ✅ ✅ | ✅ ✅ |
| Analytics sinks | posthog, segment, amplitude, ga4 | ✅ ✅ ✅ ✅ | — (CLI-only) |
| Analytics fixtures (`tools/analytics-fixture-*`) | same four, adversarial call shapes | ✅ ✅ ✅ ✅ | — |

## Plugin coverage

| Plugin | Example | Events detected | Notes |
|---|---|---|---|
| vue | vue, nuxt | 14 (vue) | SFC script/template, slots, `v-for`/`v-if`, external script/template |
| svelte | svelte | 15 | `{#if}`/`{#each}`/`{#await}`/`{#key}`/slots; interpolated `a-{b}` and `{event}` shorthand **not** detected (open, finding #7) |
| astro | astro | 9 | frontmatter only; interpolation/shorthand supported |
| angular | angular | 2 | `event=""`, `[attr.event]` |

## Open items / known limitations

Full list with evidence levels: [CLI-LIMITATIONS.md](./CLI-LIMITATIONS.md). Highlights:

- Svelte plugin: no `event="a-{b}"` / `{event}` shorthand ([FINDINGS #7](./FINDINGS.md)).
- Astro plugin scans only the frontmatter fence, not body `<script>` tags.
- Upstream peer warning from Nuxt's CLI (`cac@^6.7.14`, found 7.0.0) — not ours.
- The SDK intentionally warns on multiple instances; the SDK suite creates ~20 and prints the total instead of each warning.

History of bugs found and their status: [FINDINGS.md](./FINDINGS.md).
