# What the CLI does not cover

Static analysis cannot see everything. This is the consolidated list of known gaps for `eventra-cli` and its plugins, so you can set expectations before a demo or a migration.

**Evidence level:** **verified** = re-verified on cli 2.5.3 / plugins 1.2.4–1.2.5 (2026-11-04) · **stress test** = measured on cli 2.5.0 / plugins 1.2.2 in the stress test ([FINDINGS.md](./FINDINGS.md#stress-test-props-of-any-name-cli-250--plugins-122-2026-10-27)); detection was identical between 2.4.0 and 2.5.0, not re-run on 2.5.3 · **README** = stated in the package's own README.

## 1. Names that are not static

| Gap | Behavior | Workaround | Evidence |
|---|---|---|---|
| Event name computed at runtime (`track(getName())`) | Listed under "Dynamic event names" (`~`), not added to `events` | Use constants/literals; add to `events` by hand | verified |
| Name > 64 chars or outside `a-zA-Z0-9:_./-` (emoji, spaces) | Not added. Since 2.5 it is **listed** with file/line/reason; before it was dropped silently. `check` still ends with `All good`, exit 0 | Keep to the allowed charset | stress test, README |
| Runtime dependency injection (`const { $trackFeature } = useNuxtApp()`) | Not discovered | Import a tracker module statically | verified (Nuxt example) |
| Wrapper whose event is the **2nd** argument (`trackFeature(app, name)`) | Wrapper not recognized | Put the name first | README |
| Remote/CDN imports (`https://esm.sh/...`) | Static resolution breaks | Use package imports | README |
| Dynamic `import("./x.js")` | File may sit outside the analysis graph | Static imports | README |

## 1a. How the CLI labels "dynamic" names — and why it can mislead

`eventra sync` prints every call whose name argument it cannot reduce to a string literal under **"Dynamic event names" (`~`)**. Checked on cli 2.5.3 with a scratch file (verified):

| Call in source | What the CLI prints | Added to `events`? |
|---|---|---|
| `track("literal")`, `track(CONST)`, `track(Enum.A)`, `wrap("x")` | nothing (found) | yes |
| `track(cond ? "a" : "b")` | `~ file:line tracker.track(...) (resolved: a, b)` | yes, both branches |
| `track(process.env.EVENT_NAME)` | `~ file:line tracker.track(...)` | **no** |
| `track(runtimeVar)` | `~ file:line tracker.track(...)` | **no** |
| `` track(`user_${x}`) `` | `~ file:line tracker.track(...)` | **no** |
| `wrap(runtimeVar)` (through a wrapper) | `~ file:line wrap(...)` | **no** |
| `function wrap(name){ tracker.track(name) }` (the wrapper's own forwarding call) | `~ file:line tracker.track(...)` — **identical to a real runtime name** | no (correctly: the real names are at the `wrap(...)` call sites) |

So `~` means "I could not determine the name here", nothing more. Three things to keep in mind:

1. **A runtime value is never guessed.** An env var or computed name is not added to `eventra.json`; that event stays invisible to `check`/`send` until you add it by hand or switch to a literal/constant.
2. **The label does not say why.** The harmless wrapper-internal forward and a genuinely missed runtime event look the same; only the "resolved: …" suffix distinguishes the partially-resolved case. In every example in this repo the lone `~ tracker.track(...)` is the wrapper's forward.
3. **It is not a failure.** `check` still prints `All good` and exits 0 with `~` lines present.

Suggested upstream improvement: separate "wrapper forward" from "unresolved at call site" and print the reason (`env`, `variable`, `template`).

## 2. Framework dialects

| Area | Not covered | Evidence |
|---|---|---|
| **React (core)** | Props spread through another component (`{...props}`); class components (`this.props.x`) — 23/25 in stress set | stress test |
| **Vue** | Options API (documented unsupported) — 12/13 | stress test, README |
| **Svelte** | `event="a-{b}"` interpolation and `{event}` shorthand; `{...spread}` — 10/11 | verified, stress test |
| **Astro** | Only the frontmatter fence is parsed: `<script>` tags in the body, `<script define:vars>`, and `onclick={`...${prop}...`}` template literals are invisible — 8/10 | stress test, README |
| **Angular** | Inline `template:` in the component decorator (only `.html` templates are parsed); `[event]="x"` is detected but does not compile on a plain element — use `[attr.event]` — 11/12 | stress test, README |

Detection is conservative: **0 false positives** in 71 generated component/usage pairs (a prop that never reaches tracking is never reported). Overall 64/71 true events found.

## 3. Reporting and exit codes

- `check` prints `All good` and exits `0` even after listing skipped names or files with syntax errors; `sync --strict` also exits `0` in that case (stress test).
- A wrapper's own forwarding call (`t.track(n)` inside the wrapper) is listed as a dynamic occurrence — noise, not an error (verified, see 1a).
- Files over 2 MB are skipped with a warning (stress test).
- A file with a syntax error is still scanned, but events after the error may be missed (stress test).

## 4. Config and security behavior (by design, easy to trip over)

- A non-empty `"apiKey"` in a committed `eventra.json` triggers a warning in 2.5.x — use `EVENTRA_API_KEY` or gitignored `eventra.local.json` verified.
- `EVENTRA_ENDPOINT` only bypasses the one-time `--trust-endpoint` gate; it does **not** redirect the request, which targets the `endpoint` in `eventra.json` verified (CLI suite).
- A changed `endpoint` re-blocks `send` until re-approved verified.

## 5. Third-party `sinks`

Presets: `posthog`, `segment`, `amplitude`, `ga4`. Anything else needs a custom `{ "callee": "...", "nameArg": N }` rule. The adversarial fixtures in `tools/analytics-fixture-*` cover wrappers, re-exports, legacy `amplitude-js`, `gtag`, `@next/third-parties` and `vue-gtag` (verified 4/4 pass); other shapes (e.g. a client built by a factory) were not tested.

## 6. Not tested here

- Windows/macOS (suites ran on Linux, Node 24 only; CI uses Node 20).
- Projects larger than the synthetic 3,000-file shapes; the earlier 41 s / ~3 GB report was not reproducible (stress test).
- Monorepos with several `eventra.json` roots beyond this repo's per-example layout.
