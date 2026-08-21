# Eventra + Astro

Astro + **Eventra SDK** + **Eventra CLI** + **@eventra_dev/cli-plugin-astro**.

---

## CLI and Astro

`@eventra_dev/cli-plugin-astro` parses the **frontmatter fence** (`---`) of `.astro` files with the real Astro compiler — required, not optional: a `trackFeature(...)` call there is only picked up by `sync` with the plugin registered (verified live via A/B test — see the root README's [Svelte & Astro via CLI plugins](../../../README.md#svelte--astro-via-cli-plugins) section).

| Path | Detected? |
|------|-----------|
| `trackFeature(...)` in the frontmatter fence | Yes, with the plugin |
| Declarative `event="..."` / `event={expr}` / `{event}` shorthand template attribute — any tag, including inside `{cond && <div event="...">}` and `.map()` | Yes, with the plugin |
| `trackFeature(...)` inside a `<script>` tag in the file's **body markup** (not the frontmatter) | **No — still genuinely unscanned**, same as plain `.html` |

One documentation gap found: the plugin's own README shows `` event=`a-${b}` `` (no braces) as valid interpolation syntax, but it's silently ignored as written — the working form needs braces: `` event={`a-${b}`} ``.

| File | Role |
|------|------|
| `src/lib/tracker.ts` | SDK instance + `trackFeature()` wrapper |
| `src/events.ts` | Event literals for the "centralize in `.ts`" convention |
| `src/client.ts` | Browser entry — imports from `events.ts`, used by the body `<script>` (unscanned) path |
| `src/pages/index.astro` | Frontmatter direct call + the full `event="..."` template-attribute matrix (literal, dynamic, shorthand, conditional, `.map()`, edge cases) |

---

## Project structure

```
astro/
├── eventra.json
└── src/
    ├── lib/tracker.ts
    ├── events.ts
    ├── client.ts
    └── pages/
        └── index.astro
```

---

## Run

```bash
pnpm dev:astro
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| SDK | http://localhost:4000/track |

---

## Eventra CLI

```json
{
  "plugins": ["@eventra_dev/cli-plugin-astro"]
}
```

```bash
cd examples/frontend/astro
eventra init
eventra sync
```

**Detected events:** `astro_page_view`, `astro_click`, `astro_frontmatter_view`, `astro_button_click`, `astro_conditional_click`, `astro_dynamic_resolved`, `astro_interp_z`, `astro_map_item_click`, `astro_shorthand_event`

---

## Docs

https://eventra.dev/docs
