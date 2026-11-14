# Versions

This repo is versioned with git tags. Each tag pins a specific set of Eventra packages, so you can reproduce how a given CLI/SDK/plugin combination behaved. Per-version notes: [CHANGELOG.md](../CHANGELOG.md).

## Compatibility table

| Repo version | Date | eventra-cli | eventra-sdk | vue | svelte | astro | angular | Highlights |
|---|---|---|---|---|---|---|---|---|
| **v1.4.5** | 2026-11-14 | 2.6.9 | 2.0.14 | 1.3.3 | 1.3.2 | 1.3.2 | 1.3.4 | automatic update |
| v1.4.4 | 2026-11-14 | 2.6.8 | 2.0.13 | 1.3.3 | 1.3.2 | 1.3.2 | 1.3.3 | cli 2.6.8, sdk 2.0.13, plugins 1.3.2/1.3.3: every release-note item tested; suites 365 + 67 + 26; GIFs re-recorded |
| v1.4.3 | 2026-11-10 | 2.6.7 | 2.0.12 | 1.3.2 | 1.3.1 | 1.3.1 | 1.3.2 | cli 2.6.7, sdk 2.0.12, vue/angular 1.3.2: every release-note item tested; suites 318 + 55 + 19 |
| v1.4.2 | 2026-11-06 | 2.6.4 | 2.0.11 | 1.3.0 | 1.3.0 | 1.3.0 | 1.3.0 | cli 2.6.4, sdk 2.0.11: strict on oversized files, redirect warning, hook helpers; suites 109 + 28 |
| v1.4.1 | 2026-11-04 | 2.6.1 | 2.0.9 | 1.3.0 | 1.3.0 | 1.3.0 | 1.3.0 | cli 2.6.1: stricter name rules, escaped odd characters |
| v1.4.0 | 2026-11-04 | 2.6.0 | 2.0.9 | 1.3.0 | 1.3.0 | 1.3.0 | 1.3.0 | cli 2.6.0 (strict check, dynamic-name reasons), plugins 1.3.0 |
| v1.3.0 | 2026-11-04 | 2.5.3 | 2.0.9 | 1.2.5 | 1.2.5 | 1.2.4 | 1.2.4 | latest packages, LICENSE, docs, GIFs, CI |
| v1.2.0 | 2026-10-27 | 2.5.0 | 2.0.6 | 1.2.2 | 1.2.2 | 1.2.2 | 1.2.2 | cli 2.5.0, props stress test |
| v1.1.1 | 2026-10-26 | 2.4.0 | 2.0.6 | 1.2.1 | 1.2.1 | 1.2.1 | 1.2.1 | plugins 1.2.1 |
| v1.1.0 | 2026-10-26 | 2.4.0 | 2.0.6 | 1.2.0 | 1.2.0 | 1.2.0 | 1.2.0 | cli 2.4.0 |
| v1.0.0 | 2026-10-26 | 2.3.2 | 2.0.6 | 1.2.0 | 1.2.0 | 1.2.0 | 1.2.0 | first release |
| v0.7.0 | 2026-10-16 | ^2.3.1 | ^2.0.6 | ^1.1.0 | ^1.1.0 | ^1.1.0 | ^1.1.0 | |
| v0.6.0 | 2026-10-08 | ^2.1.0 | ^2.0.5 | ^1.0.6 | ^1.0.3 | ^1.0.3 | ^1.0.3 | analytics examples |
| v0.5.0 | 2026-09-04 | ^2.0.8 | ^2.0.4 | ^1.0.4 | ^1.0.1 | ^1.0.1 | ^1.0.2 | angular plugin |
| v0.4.0 | 2026-08-21 | ^2.0.7 | ^2.0.4 | ^1.0.3 | ^1.0.1 | ^1.0.1 | — | feature-test suites |
| v0.3.0 | 2026-07-28 | ^2.0.0 | ^2.0.0 | ^1.0.0 | — | — | — | CLI/SDK 2.x |
| v0.2.0 | 2026-04-30 | ^0.1.16 | latest | — | — | — | — | CLI integrated |
| v0.1.0 | 2026-04-20 | — | latest | — | — | — | — | initial examples |

Exact installed versions for each tag are in that tag's `pnpm-lock.yaml`. Ranges (`^`) in `package.json` resolve to what the lockfile says, so use `--frozen-lockfile` (the switch script does).

## Switch between versions

```bash
pnpm use-version                # list all versions
pnpm use-version v1.2.0         # check out that tag (detached HEAD) and install its pinned deps
pnpm use-version latest         # back to main
```

The script exists from v1.3.0 on. Older tags don't contain it, so to return from one of them run `git switch main` (then `pnpm install`).

Equivalent by hand: `git switch --detach v1.2.0 && pnpm install --frozen-lockfile`.

The script refuses to switch if you have uncommitted changes to tracked files. After checking out a tag you are in *detached HEAD* — to make changes, branch off: `git switch -c my-fix`.

## Releasing a new version

**Automatic (default).** The **Auto-update** workflow runs daily (and on demand: Actions → Auto-update → Run workflow):

1. `tools/auto-update.mjs check` compares the six pinned `@eventra_dev/*` packages with npm.
2. If something is newer: bump every `package.json` and `pnpm-workspace.yaml`, `pnpm install`, then run `test:cli`, `test:sdk` and `verify:cli`.
3. If green: update the package tables in README/docs, `docs/TEST-RESULTS.md`, `docs/VERSIONS.md`, write a new `CHANGELOG.md` section (anything under *Unreleased* is carried into it) and bump the repo version — **minor** if a CLI/SDK/plugin minor or major moved, otherwise **patch**.
4. Commit, tag `vX.Y.Z`, push; the **Release** workflow then publishes the GitHub Release from the changelog section.
5. If the tests fail: nothing is committed or released and an issue is opened (once per version); the job retries the next day.

Repo setting required: *Settings → Actions → General → Workflow permissions → Read and write*. GitHub disables scheduled workflows after 60 days without repo activity — re-enable under the Actions tab if that happens.

**Manual** (new examples, restructures, major bumps): update `CHANGELOG.md`, the table above and `"version"` in `package.json`, commit, then `git tag -a vX.Y.Z -m "..."` and `git push --follow-tags` — the Release workflow does the rest.

**Dry run on GitHub** (safe, nothing is committed, tagged or released): Actions → Auto-update → Run workflow, then either fill `simulate_from` with an old tag such as `v1.2.0` (the job pretends the repo still pins that tag's packages, finds the real newer versions, bumps, installs and runs all tests) or tick `dry_run`. The job summary shows the changed files and the release notes that would be published.

Dry run of the automation locally: `AUTO_UPDATE_FAKE='{"@eventra_dev/eventra-cli":"9.9.9"}' node tools/auto-update.mjs check`.

Convention: patch = plugin/SDK patch bump or doc fix, minor = CLI/SDK/plugin minor bump or new examples, major = restructure or a change to how examples are run.

## Caveats

- Tags `v0.1.0`–`v0.7.0` were added retroactively (2026-11-04) to historic commits and were **not** re-run; they record what was pinned, not that everything passed.
- Old tags may not install today if a pinned package version was unpublished or if `minimumReleaseAge` rules in `pnpm-workspace.yaml` block it.
