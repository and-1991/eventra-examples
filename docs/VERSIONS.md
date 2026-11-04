# Versions

This repo is versioned with git tags. Each tag pins a specific set of Eventra packages, so you can reproduce how a given CLI/SDK/plugin combination behaved. Per-version notes: [CHANGELOG.md](../CHANGELOG.md).

## Compatibility table

| Repo version | Date | eventra-cli | eventra-sdk | vue | svelte | astro | angular | Highlights |
|---|---|---|---|---|---|---|---|---|
| **v1.3.0** | 2026-11-04 | 2.5.3 | 2.0.9 | 1.2.5 | 1.2.5 | 1.2.4 | 1.2.4 | latest packages, LICENSE, docs, GIFs, CI |
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

Equivalent by hand: `git switch --detach v1.2.0 && pnpm install --frozen-lockfile`.

The script refuses to switch if you have uncommitted changes to tracked files. After checking out a tag you are in *detached HEAD* — to make changes, branch off: `git switch -c my-fix`.

## Releasing a new version

1. Bump packages, run `pnpm test:cli && pnpm test:sdk && pnpm verify`.
2. Update `CHANGELOG.md`, the table above and `"version"` in the root `package.json`.
3. Commit, then `git tag -a vX.Y.Z -m "eventra-examples vX.Y.Z: eventra-cli A, sdk B, plugins C"` and `git push --follow-tags`.

Convention: patch = plugin/SDK patch bump or doc fix, minor = CLI/SDK/plugin minor bump or new examples, major = restructure or a change to how examples are run.

## Caveats

- Tags `v0.1.0`–`v0.7.0` were added retroactively (2026-11-04) to historic commits and were **not** re-run; they record what was pinned, not that everything passed.
- Old tags may not install today if a pinned package version was unpublished or if `minimumReleaseAge` rules in `pnpm-workspace.yaml` block it.
