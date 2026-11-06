# What the CLI does not cover

Static analysis cannot see everything. This is the consolidated list of known gaps for `eventra-cli` and its plugins, so you can set expectations before a demo or a migration.

**Current versions:** eventra-cli 2.6.4, cli-plugin-vue/svelte/astro/angular 1.3.0.

**Evidence level:**
- **verified** = re-run in this repo on 2.6.4 / 1.3.0 (2026-11-06), by the CLI feature suite, an example, or a throw-away fixture.
- **changelog** = stated in the upstream release notes, not re-run here.
- **earlier** = measured on 2.5.x in the stress test ([FINDINGS.md](./FINDINGS.md#stress-test-props-of-any-name-cli-250--plugins-122-2026-10-27)) and not repeated; the generator for those 71 component/usage pairs is not in the repo.

## 1. Names that are not static

| Gap | Behavior | Workaround | Evidence |
|---|---|---|---|
| Event name computed at runtime (`track(getName())`, `track(process.env.X)`, `track(variable)`, `` track(`a_${x}`) ``) | Listed under "Dynamic event names" with a reason (`env`, `variable`, `template`, `call`, `expression`), not added to `events` | Use constants/literals, or declare the possible names in `dynamicEvents` in `eventra.json` | verified |
| Remote imports (`https://esm.sh/...`), dynamic `import()` | Computed names; same handling | `dynamicEvents` | changelog |
| Nuxt `useNuxtApp().$trackFeature(...)` (runtime injection) | Not discovered by default | Add a `sinks` rule `{ "callee": "$trackFeature" }` or import a tracker module statically | changelog (rule), verified (default miss, Nuxt example) |
| Wrapper whose event is the **2nd** argument (`trackFeature(app, name)`) | Wrapper not recognized | Put the name first | earlier |
| Name over 64 chars | Cut to 64 characters (no longer dropped) | Keep names short | verified |
| Name with a character outside the allowed set | Rejected, listed with file, line and the rule ("the name has characters other than letters, digits and `$ : _ . / - [ ] ( ) # @ + & , '` and space"); `check --strict` fails | Rename the event | verified |
| Emoji, tab, line break, control or hidden characters (for example `\u202e`) in a name | Rejected and listed; odd characters are printed as plain escapes (`\u202e`, `\x07`) | | verified |
| `!`, `%`, `;`, `=`, `?`, `~`, `|`, `<`, `>`, `"`, `\` in a name | Rejected (2.6.0 accepted `!`; 2.6.1 does not) | | verified |
| Letters of any language, digits, space and `$ : _ . / - [ ] ( ) # @ + &  , '` (for example `[Amplitude] Page Viewed`, `Save & Continue`) | Accepted | | verified |

### 1a. How "dynamic" names are reported (2.6.0)

`eventra sync` / `check` print two separate lists. Verified on a fixture (`tools/cli-feature-tests/fixtures/dynamic-reporting`):

| Call in source | Printed as | In `events`? |
|---|---|---|
| `track("literal")`, constant, enum, `wrap("x")` | nothing (found) | yes |
| `track(cond ? "a" : "b")` | `~ ... (resolved: a, b)` | yes, both branches |
| `track(process.env.NAME)` | `~ ... [env: read from the environment]` | no |
| `track(variable)` | `~ ... [variable: a variable with no known value]` | no |
| `` track(`user_${x}`) `` | `~ ... [template: a template string with a part that is not known]` | no |
| `track(getName())` | `~ ... [call: the result of a call]` | no |
| `function wrap(name){ tracker.track(name) }` (the wrapper's own forwarding call) | under a separate heading, **"Inside a wrapper (each caller is checked on its own)"** | no (the real names are at the call sites) |

What this means:
1. A runtime value is never guessed. Until you list it in `dynamicEvents` it stays invisible to `check` and `send`.
2. Before 2.6.0 the forwarding call inside a wrapper looked exactly like a real runtime name; now it is listed apart and the reason is printed.
3. `check` exits 0 with dynamic names present, but no longer prints `All good`: it prints `No drift, but the scan was not clean: N dynamic event names.` `check --strict` exits 1 on dynamic names, skipped files, syntax errors and rejected names. Names declared in `dynamicEvents` count as found and stop failing `--strict`.

## 2. Framework dialects

2.6.0 / 1.3.0 closed most of the gaps measured in the 2.5.x stress test (64/71 events found). Status of each former gap:

| Area | Former gap | Now | Evidence |
|---|---|---|---|
| React | Props spread through another component (`{...props}`); class components (`this.props.x`) | Both found | verified (throw-away fixture: `t26_react_class`, `t26_react_spread`) |
| Vue | Options API props | Found | verified (`t26_vue_options`) |
| Vue | `v-bind="obj"` | Followed | changelog |
| Svelte | `event="a-{b}"` interpolation, `{event}` shorthand | Both found (`a-y`, `svelte_shorthand_attr_click` in the Svelte example) | verified |
| Svelte | `{...obj}` spread | Followed | changelog |
| Astro | `event={`...${x}`}` template literal | Found (`t26_astro_tpl_x`) | verified |
| Astro | `<script>` tag in the **body** | Now scanned (`trackFeature` call found) | verified |
| Astro | `<script define:vars>` | Read | changelog |
| Astro | `{...obj}` spread | Followed | changelog |
| Angular | Inline `template: "..."` | Read (`t26_ng_inline`) | verified |
| Angular | `[event]` on a plain element does not compile (`NG8002`) | Still invalid in Angular, but the plugin now warns: `[event] on <button> is a property binding that Angular rejects (NG8002) ... write [attr.event] instead` | verified |

Not re-measured: the stress-test counts per framework (the generator is not in the repo). Detection was conservative in 2.5.x (0 false positives in 71 pairs); that has not been re-measured on 2.6.0.

Hook helpers (re-measured on 2.6.4, cli suite `hook-callback`): a function a hook hands back through `useCallback` or `useMemo` is found when it is called as a member of the hook result (`const h = useTrack(); h.track("x")`, `useTrack().track("x")`), including the property forms `return { track: useCallback(...) }` and `const api = { track: useCallback(...) }; return api` (fixed in 2.6.4; on 2.6.3 the property forms were missed). Destructuring the result (`const { track } = useTrack()`) works on 2.6.4 only when the `react` types are installed (`@types/react`): then the type of the hook result survives. Without them (CI before install, a fresh clone) `useCallback`/`useMemo` return `any`, and destructuring is **not** followed, in a separate file or the same one, with or without renaming; the event is missed and the call stays in the "inside a wrapper" list. The upstream notes first said destructuring "already worked" (true with types) and later explained the untyped case; a fix for it is reported upstream but not published as of 2.6.4. This repo first mis-recorded the gap as unconditional because its throw-away fixture had no react types. A plain returned function (no `useCallback`) is followed in both forms. The suite pins this gap, so it fails the day upstream closes it.

## 3. Reporting and exit codes

- `check` prints `All good` only for a clean scan. With dynamic names it prints `No drift, but the scan was not clean` and still exits 0; `--strict` exits 1 (verified).
- Skipped files, syntax errors and rejected names are listed in the closing summary; `--strict` fails on them. A syntax error fails `--strict` (verified); files over the size limit (2,000,000 characters by default, raise it with `sync.maxFileSize`) are ignored with a warning and, since 2.6.4, **do** fail `--strict` (on 2.6.3 they exited 0; verified, CLI suite `maxFileSize`). Breaking for CI with a vendored or generated file over the limit: put it in `sync.exclude` or raise `sync.maxFileSize`.
- A closing line such as `The scan was not clean: ...` goes to **stderr**; scripts that capture only stdout will not see it.
- Tools that grep for `All good` (for example older versions of `tools/verify-all.sh`) break on 2.6.0; judge `check` by its exit code.

## 4. Config and security behavior (by design, easy to trip over)

- A non-empty `"apiKey"` in a committed `eventra.json` triggers a warning; use `EVENTRA_API_KEY` or gitignored `eventra.local.json` (verified).
- `EVENTRA_ENDPOINT` takes priority over `endpoint` in `eventra.json` since 2.6.3: when set and not empty, events and the API key go there, and the one-time `--trust-endpoint` approval is not needed. On 2.6.2 and earlier the variable only skipped the approval and the request still went to the committed endpoint (verified on 2.6.3, CLI suite).
- `send` prints a warning when the endpoint is plain `http` outside localhost (2.6.3); it still sends. `127.0.0.2` counts as outside localhost (verified).
- A 403 whose body says the key is "not valid for this endpoint" makes `send` print how to get a key with CLI access, and does not retry (2.6.3, verified against a mock). Which access a key has (SDK or CLI) is set in the dashboard; that part is not testable from this repo.
- The API key prompt is a password prompt: what you type is shown as `*` (2.6.3, verified in a pseudo-terminal).
- A changed `endpoint` re-blocks `send` until re-approved (verified).
- A non-default `endpoint` in `eventra.json` needs local approval before `send`; `EVENTRA_API_KEY` set in your shell overrides `eventra.local.json` (key priority is tested in the CLI suite; do not export a key when running that suite).

## 5. Third-party `sinks`

Presets: `posthog`, `segment`, `amplitude`, `ga4`. Anything else needs a custom `{ "callee": "...", "nameArg": N }` rule. The adversarial fixtures in `tools/analytics-fixture-*` cover wrappers, re-exports, legacy `amplitude-js`, `gtag`, `@next/third-parties` and `vue-gtag` (verified, all four pass); other shapes (for example a client built by a factory) were not tested.

## 6. Not tested here

- Windows and macOS (suites ran on Linux, Node 24 only; CI uses Node 20).
- Projects larger than the synthetic 3,000-file shapes of the 2.4/2.5 stress test; the earlier 41 s / ~3 GB report was not reproducible. Upstream says several thousand files take tens of seconds and a few GB.
- Monorepos with several `eventra.json` roots beyond this repo's per-example layout.
- `<script define:vars>` and `{...obj}` spreads in Svelte/Astro, `v-bind="obj"` in Vue (changelog only).
