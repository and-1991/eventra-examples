# Test results

Last automatic run (CI: `test:cli`, `test:sdk`, `verify:cli`): **2026-11-10**. The browser and SDK-smoke rows need local dev servers/Chromium and were last run manually on 2026-11-10 (Node 24.11.1, pnpm 10.22.0, Linux). Everything green.

## Package versions under test

| Package | Version |
|---|---|
| `@eventra_dev/eventra-cli` | 2.6.7 |
| `@eventra_dev/eventra-sdk` | 2.0.12 |
| `@eventra_dev/cli-plugin-vue` | 1.3.2 |
| `@eventra_dev/cli-plugin-svelte` | 1.3.1 |
| `@eventra_dev/cli-plugin-astro` | 1.3.1 |
| `@eventra_dev/cli-plugin-angular` | 1.3.2 |

## Summary

| Suite | Command | Result |
|---|---|---|
| CLI feature tests (core detection, casts, cross-file, hooks, watch, check, send) | `pnpm test:cli` | **318 / 318** (110 + 172 + 36) |
| SDK feature tests (batching, retry, circuit breaker, idempotency, lifecycle, runtimes, 2.0.12 notes, Node 18, TypeScript `node16`) | `pnpm test:sdk` | **55 / 55** (28 + 27; also 27 / 27 on Node 18.18, which takes about 4.5 minutes) |
| SDK browser tests (Chromium: persistence, multi-tab, keepalive, visibilitychange) — *manual* | `pnpm --filter sdk-feature-tests test:browser` | **19 / 19** (6 + 13: page close, damaged `localStorage`, `null` user id) |
| Example matrix: `eventra sync` + `check` + expected-events | `pnpm verify:cli` | **23 / 23** |
| Example matrix: SDK smoke — real `POST` reaches mock server — *manual* | `pnpm verify` | **15 / 15** |

CLI test groups: core detection, send, casts, check exit codes, watch, cross-file, lazy hooks, hooks via useCallback/useMemo, maxFileSize, strict on oversized files, and one section per claim of the 2.6.5 / 1.3.1 release notes (`run-2.6.5-core.mjs`, `run-2.6.5-plugins.mjs`).

## Example matrix (`pnpm verify`)

| Area | Examples | CLI sync/check | SDK smoke |
|---|---|---|---|
| Frontend | react, vue, svelte, vanilla, next, nuxt, astro, angular | all pass | all pass |
| Backend | node, express, fastify, hono, nestjs | all pass | all pass |
| Runtimes | cloudflare, vercel | all pass | all pass |
| Analytics sinks | posthog, segment, amplitude, ga4 | all pass | — (CLI-only) |
| Analytics fixtures (`tools/analytics-fixture-*`) | same four, adversarial call shapes | all pass | — |

## Plugin coverage

| Plugin | Example | Events detected | Notes |
|---|---|---|---|
| vue | vue, nuxt | 14 (vue), 4 (nuxt) | SFC script/template, slots, `v-for`/`v-if`, external script/template; Options API props since 1.3.0 |
| svelte | svelte | 17 | `{#if}`/`{#each}`/`{#await}`/`{#key}`/slots; `{event}` shorthand and `event="a-{b}"` found since 1.3.0 |
| astro | astro | 9 | frontmatter, template `event=` (incl. template literals), body `<script>` since 1.3.0 |
| angular | angular | 8 | `event=""`, `[attr.event]`, inline `template:` since 1.3.0 |

## Open items / known limitations

Full list with evidence levels: [CLI-LIMITATIONS.md](./CLI-LIMITATIONS.md). Highlights:

- Computed event names (env, variable, template, call) are not resolved; declare them in `dynamicEvents`.
- `check` no longer prints `All good` when dynamic names exist (cli 2.6.0); judge it by exit code.
- Upstream peer warning from Nuxt's CLI (`cac@^6.7.14`, found 7.0.0) is not ours.
- The SDK intentionally warns on multiple instances; the SDK suite creates ~20 and prints the total instead of each warning.

History of bugs found and their status: [FINDINGS.md](./FINDINGS.md).
