# Changelog

Versions of **this examples repo** (git tags `vX.Y.Z`), not of the Eventra packages — each entry lists the package versions it pins. Format: [Keep a Changelog](https://keepachangelog.com/); versioning: [SemVer](https://semver.org/) applied to the repo (minor = new/updated packages or examples, major = restructure or breaking change to how examples are run).

Switch between versions: `pnpm use-version v1.2.0` (see [docs/VERSIONS.md](./docs/VERSIONS.md)).

> Tags before `v1.0.0` were added retroactively on 2026-11-04 to historic commits; they were not re-tested at that time. Pinned package ranges are read from the `package.json` files at each commit.

## [Unreleased]

### Added
- `.github/workflows/release.yml`: pushing a `vX.Y.Z` tag now creates a GitHub Release automatically, with the matching section of this file as notes (`tools/release-notes.sh`). `v0.*` are marked pre-release.

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

[1.3.0]: https://github.com/and-1991/eventra-examples/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/and-1991/eventra-examples/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/and-1991/eventra-examples/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/and-1991/eventra-examples/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/and-1991/eventra-examples/compare/v0.7.0...v1.0.0
