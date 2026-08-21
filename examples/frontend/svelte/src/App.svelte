<script lang="ts">
  import { onMount } from "svelte";
  import { trackSvelteClick, trackSveltePageView } from "./lib/events";
  import { trackFeature } from "./lib/tracker";

  onMount(() => {
    trackSveltePageView();
  });

  function handleClick() {
    trackSvelteClick();
  }

  function handleDirectClick() {
    trackFeature("svelte_direct_click");
  }

  // --- cli-plugin-svelte template `event="..."` attribute coverage ---
  const dynamicResolvable = "svelte_dynamic_attr_resolved";
  const event = "svelte_shorthand_attr_click";
  const b = "y";
  let items = ["a", "b"];
  let asyncValue = Promise.resolve("done");

  function getRuntimeEventName() {
    return Math.random() > 2 ? "never" : "also_never";
  }
</script>

<main>
  <h1>Svelte Eventra</h1>
  <button on:click={handleClick}>
    Click me
  </button>
  <button on:click={handleDirectClick}>
    Direct-tracked click
  </button>
  <button on:click={() => trackFeature("svelte_inline_markup_click")}>
    Inline markup click
  </button>

  <!-- literal template attribute -->
  <button event="svelte_button_click">Attr click</button>

  <!-- dynamic, resolvable to a script-level const -->
  <button event={dynamicResolvable}>Dynamic attr click (resolvable)</button>

  <!-- dynamic, NOT resolvable to a literal (depends on a function call) -->
  <button event={getRuntimeEventName()}>Dynamic attr click (unresolvable)</button>

  <!-- {event} shorthand, sugar for event={event} -->
  <button {event}>Shorthand attr click</button>

  {#if items.length > 5}
    <button event="svelte_if_click">If branch</button>
  {:else if items.length > 0}
    <button event="svelte_elseif_click">Else-if branch</button>
  {:else}
    <button event="svelte_else_click">Else branch</button>
  {/if}

  {#each items as item}
    <button event="svelte_each_click">{item}</button>
  {/each}

  {#await asyncValue}
    <button event="svelte_await_pending_click">Pending</button>
  {:then value}
    <button event="svelte_await_then_click">{value}</button>
  {:catch error}
    <button event="svelte_await_catch_click">{error}</button>
  {/await}

  {#key items.length}
    <button event="svelte_key_click">Key block</button>
  {/key}

  <slot>
    <button event="svelte_slot_default_click">Slot default</button>
  </slot>

  <!-- edge cases -->
  <button event="">Empty literal event</button>
  <button event>Boolean-shorthand event (bare, no braces)</button>
  <button event="a-{b}">Interpolated event</button>
</main>
