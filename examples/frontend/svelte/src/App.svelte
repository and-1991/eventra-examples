<script lang="ts">
  import { onMount } from "svelte";
  import { trackFeature } from "./lib/tracker";

  onMount(() => {
    // global tracking
    trackFeature("svelte_page_view");
  });

  function handleClick() {
    // manual tracking
    trackFeature("svelte_click");
  }
</script>

<main>
  <h1>Svelte Eventra</h1>
  <button on:click={handleClick}>
    Click me
  </button>
</main>
