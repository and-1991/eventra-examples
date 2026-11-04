# Changelog

Versions of **this examples repo** (git tags `vX.Y.Z`), not of the Eventra packages — each entry lists the package versions it pins. Format: [Keep a Changelog](https://keepachangelog.com/); versioning: [SemVer](https://semver.org/) applied to the repo (minor = new/updated packages or examples, major = restructure or breaking change to how examples are run).

Switch between versions: `pnpm use-version v1.2.0` (see [docs/VERSIONS.md](./docs/VERSIONS.md)).

> Tags before `v1.0.0` were added retroactively on 2026-11-04 to historic commits; they were not re-tested at that time. Pinned package ranges are read from the `package.json` files at each commit.

## [Unreleased]

_Nothing yet._

## [1.4.1] — 2026-11-04

Pinned: **cli 2.6.1 · sdk 2.0.9 · vue 1.3.0 · svelte 1.3.0 · astro 1.3.0 · angular 1.3.0**

### Changed
- `@eventra_dev/eventra-cli` 2.6.0 → 2.6.1 ([npm](https://www.npmjs.com/package/@eventra_dev/eventra-cli/v/2.6.1))
- Name rules follow cli 2.6.1: letters of any language, digits, space and `$ : _ . / - [ ] ( ) # @ + & , '` are accepted, `!` and other characters are rejected; the CLI suite checks truncation to 64, accepted real-world names (`Save & Continue`, `[Amplitude] Page Viewed`), rejection of `bad chars!@#$%` and the printed reason. Analytics fixtures lose `"bad name!"` again.
- Re-recorded all 21 GIFs on cli 2.6.1.

Upstream 2.6.1 release notes also list: fix for `eventra send` when a name was cut in the middle of a character, odd characters in names printed as plain escapes (verified: `\u202e`, `\x07`, `\u200b`), and event helpers handed back through `useCallback` (not reproduced for a plain SDK wrapper; see `docs/CLI-LIMITATIONS.md`). The upstream notes also say emoji are rejected, which corrects the 2.6.0 notes quoted under 1.4.0.

### Verified (local run)
CLI feature tests 90/90 · SDK feature tests 24/24 · SDK browser tests 6/6 · `pnpm verify`: 23 CLI + 15 SDK smoke, 0 failures.

## [1.4.0] — 2026-11-04

Pinned: **cli 2.6.0 · sdk 2.0.9 · vue 1.3.0 · svelte 1.3.0 · astro 1.3.0 · angular 1.3.0**

### Package updates
- `@eventra_dev/eventra-cli` 2.5.3 → 2.6.0 ([npm](https://www.npmjs.com/package/@eventra_dev/eventra-cli/v/2.6.0))
- `@eventra_dev/cli-plugin-vue` 1.2.5 → 1.3.0 ([npm](https://www.npmjs.com/package/@eventra_dev/cli-plugin-vue/v/1.3.0))
- `@eventra_dev/cli-plugin-svelte` 1.2.5 → 1.3.0 ([npm](https://www.npmjs.com/package/@eventra_dev/cli-plugin-svelte/v/1.3.0))
- `@eventra_dev/cli-plugin-astro` 1.2.4 → 1.3.0 ([npm](https://www.npmjs.com/package/@eventra_dev/cli-plugin-astro/v/1.3.0))
- `@eventra_dev/cli-plugin-angular` 1.2.4 → 1.3.0 ([npm](https://www.npmjs.com/package/@eventra_dev/cli-plugin-angular/v/1.3.0))

What the upstream release notes say changed (read as claims; the items marked verified were re-run here on 2026-11-04):
- `check` says "All good" only when events match and the scan was clean, otherwise "No drift, but the scan was not clean"; `--strict` fails on skipped files, syntax errors, rejected names and unresolved dynamic names (verified).
- The dynamic-name list is split into real dynamic names, each with a reason (`env`, `variable`, `template`, `call`, `expression`), and a separate "Inside a wrapper" list (verified).
- Event names are read the way the SDK sends them: over 64 chars is cut to 64, emoji and punctuation accepted, only empty or tab/newline names rejected (verified for length and punctuation).
- New `dynamicEvents` and `sync.maxFileSize` settings (`dynamicEvents` verified).
- Vue Options API props, React class components and props spread, Angular inline `template:` and a plugin note for `[event]` on plain elements, Svelte `{event}` and `event="a-{b}"`, Astro template-literal `event` (all verified); Astro `<script define:vars>` and Svelte/Astro `{...obj}` spread (not re-run here).

### Added
- CLI feature tests: `testDynamicReporting` (computed-name reasons, "Inside a wrapper" section, `dynamicEvents`, `check --strict` on dynamic names and syntax errors, `check` wording) and updated name rules (long names cut to 64, punctuation accepted).
- Svelte example now detects `svelte_shorthand_attr_click` (`{event}`) and `a-y` (`event="a-{b}"`), expected in `verify-all.sh`.
- `.github/workflows/release.yml`: pushing a `vX.Y.Z` tag now creates a GitHub Release automatically, with the matching section of this file as notes (`tools/release-notes.sh`). `v0.*` are marked pre-release.
- Auto-update dry run: `simulate_from` (pretend an older tag) and `dry_run` inputs on the workflow; the job summary previews the diff and release notes without committing, tagging or releasing.
- `.github/workflows/auto-update.yml` + `tools/auto-update.mjs`: daily check of npm for new `@eventra_dev/*` versions; on a new one it bumps all pins, runs `test:cli`, `test:sdk` and `verify:cli`, updates docs/CHANGELOG/VERSIONS, bumps the repo version, tags and releases — or opens an issue if tests fail.

### Fixed
- CI `verify:cli` failed on Nuxt (`nuxt_auto_import_click` missing) because the generated `.nuxt/` is no longer tracked: the Nuxt example now runs `nuxt prepare` on `postinstall` (and `verify-all.sh` falls back to it), and declares `"type": "module"`.

### Changed
- All 21 GIFs re-recorded on cli 2.6.0 (per-example `demo.gif`, `assets/demo.gif`, `assets/overview.gif`); the Vue session now runs on a throw-away copy of the example. `docs/DEMO.md` and `docs/CLI-LIMITATIONS.md` rewritten for 2.6.0 behavior.
- `tools/verify-all.sh` judges `eventra check` by its exit code: cli 2.6 prints "No drift, but the scan was not clean" instead of "All good" when dynamic names exist.
- Analytics fixtures: `"bad name!"` is now a found event (names are read the way the SDK sends them); fixture READMEs updated.
- Svelte example README: the `{event}` / `event="a-{b}"` gap is closed in cli-plugin-svelte 1.3.0.
- GitHub Actions: `actions/checkout` v7, `actions/setup-node` v7, `pnpm/action-setup` v6 (Node 24 runtime, removes the Node 20 deprecation warning) and runners pinned to `ubuntu-24.04` instead of `ubuntu-latest`.
- README rewritten without logo, badges or emoji (plain text and tables); icons/emoji removed from all docs; `assets/eventra-icon-animated.svg` deleted. Every example README now has the same CLI block (`EVENTRA_API_KEY`, `sync`, `check`) and a detected-events list regenerated from its `eventra.json` (Angular, React and Vue lists were stale).
- README no longer hard-codes test counts or a static test badge (the version badge reads the latest tag); `docs/TEST-RESULTS.md` marks the browser and SDK-smoke rows as manual.

### Verified (local run)
CLI feature tests 88/88 · SDK feature tests 24/24 · SDK browser tests 6/6 · `pnpm verify`: 23 CLI + 15 SDK smoke, 0 failures.

## [1.3.0] — 2026-11-04

Pinned: **eventra-cli 2.5.3 · eventra-sdk 2.0.9 · cli-plugin-vue 1.2.5 · cli-plugin-svelte 1.2.5 · cli-plugin-astro 1.2.4 · cli-plugin-angular 1.2.4**

### Added
- `LICENSE` (MIT, © 2026 Yuriy Korolik).
- Short presentation README with package table, compatibility matrix and test summary; the long research notes moved to `docs/FINDINGS.md`.
- `docs/TEST-RESULTS.md`, `docs/DEMO.md`, `docs/CLI-LIMITATIONS.md` (incl. how `~ dynamic` names are reported and what they mean).
- `demo.gif` in every example, `assets/overview.gif` (full `pnpm verify` run) and `assets/demo.gif` (Vue session) — all recorded from real command output.
- Scripts: `test:cli`, `test:sdk`, `verify:cli`, `use-version` / `versions`; `tools/use-version.sh`.
- CI now runs `test:cli`, `test:sdk` and `verify:cli` (previously only a `curl` against the mock server).
- FINDINGS #11 (CLI 2.5 warns about a committed `apiKey`) and a re-verification pass of the bug table.

### Changed
- All package pins bumped to the latest npm releases (see above); `minimumReleaseAgeExclude` trimmed to current versions.
- `eventra.json` in all examples now keeps `"apiKey": ""`; the CLI reads `EVENTRA_API_KEY` (set to `test` by `tools/verify-all.sh`). `eventra.local.json` is gitignored.
- SDK `apiKey` in example source is read from the environment with a `"test"` fallback (`EVENTRA_API_KEY`, `NEXT_PUBLIC_…`, `VITE_…`, `PUBLIC_…`).
- `tools/verify-all.sh` is portable (no hard-coded nvm path, `mktemp` log) and supports `VERIFY_MODE=cli`.
- Vercel example: Next 14 → 15 (+ react/react-dom 19); GA4 fixture: explicit `react-dom` 18 — removes peer warnings.
- SDK feature tests count the expected "multiple SDK instances" warning instead of printing it 21 times.

### Fixed
- NestJS example failed to compile once `process.env` was used — added `@types/node`.

### Removed
- Generated `.nuxt/` and `.astro/` files that were tracked in git; `.astro/`, `.angular/`, `.output/` added to `.gitignore`.

### Verified (cli 2.5.3 / sdk 2.0.9)
CLI feature tests 74/74 · SDK feature tests 24/24 · browser 6/6 · `pnpm verify` 23 CLI + 15 SDK, 0 failures.

## [1.2.0] — 2026-10-27
Pinned: cli 2.5.0 · sdk 2.0.6 · plugins vue/astro/svelte/angular 1.2.2
- Updated examples to cli 2.5.0 and plugins 1.2.2; stress-test results for props of any name (71 component/usage pairs).

## [1.1.1] — 2026-10-26
Pinned: cli 2.4.0 · sdk 2.0.6 · plugins 1.2.1
- Plugins bumped to 1.2.1.

## [1.1.0] — 2026-10-26
Pinned: cli 2.4.0 · sdk 2.0.6 · plugins 1.2.0
- CLI bumped to 2.4.0; stress-test results updated.

## [1.0.0] — 2026-10-26
Pinned: cli 2.3.2 · sdk 2.0.6 · plugins 1.2.0
- First tagged release: all examples (frontend, backend, runtimes, analytics), CLI/SDK feature suites, props-of-any-name stress-test results.

## [0.7.0] — 2026-10-16
Pinned: cli ^2.3.1 · sdk ^2.0.6 · plugins ^1.1.0
- Examples updated for CLI 2.3.x and plugins 1.1.0.

## [0.6.0] — 2026-10-08
Pinned: cli ^2.1.0 · sdk ^2.0.5 · vue ^1.0.6 · astro/svelte ^1.0.3 · angular ^1.0.3
- Added third-party analytics examples (PostHog, Segment, Amplitude, GA4) and the four `tools/analytics-fixture-*` projects (CLI `sinks`, introduced in CLI 2.1.0).

## [0.5.0] — 2026-09-04
Pinned: cli ^2.0.8 · sdk ^2.0.4 · vue ^1.0.4 · astro/svelte ^1.0.1 · angular ^1.0.2
- Added `@eventra_dev/cli-plugin-angular` and fixed related example bugs.

## [0.4.0] — 2026-08-21
Pinned: cli ^2.0.7 · sdk ^2.0.4 · vue ^1.0.3 · astro/svelte ^1.0.1
- Added `tools/cli-feature-tests` and `tools/sdk-feature-tests`; Vue/Astro/Svelte plugins; READMEs rewritten; build and test fixes.

## [0.3.0] — 2026-07-28
Pinned: cli ^2.0.0 · sdk ^2.0.0 · vue ^1.0.0
- Moved to CLI 2.x / SDK 2.x and the Vue plugin; added `tools/verify-all.sh`.

## [0.2.0] — 2026-04-30
Pinned: cli ^0.1.16 · sdk latest
- CLI integrated into the examples (`eventra.json` per example).

## [0.1.0] — 2026-04-20
Pinned: sdk latest
- Initial set: backend (Node, Express, Fastify, Hono, NestJS), frontend (React, Vue, Svelte, Astro, Next, Nuxt, Vanilla), runtimes (Cloudflare, Vercel) and the mock server.

[1.4.1]: https://github.com/and-1991/eventra-examples/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/and-1991/eventra-examples/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/and-1991/eventra-examples/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/and-1991/eventra-examples/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/and-1991/eventra-examples/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/and-1991/eventra-examples/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/and-1991/eventra-examples/compare/v0.7.0...v1.0.0
