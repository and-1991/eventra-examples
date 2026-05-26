<script lang="ts">
  import { onMount } from "svelte";
  import { trackSvelteClick, trackSveltePageView } from "./lib/events";

  onMount(() => {
    trackSveltePageView();
  });

  function handleClick() {
    trackSvelteClick();
  }
</script>

<main>
  <h1>Svelte Eventra</h1>
  <button on:click={handleClick}>
    Click me
  </button>
</main>
