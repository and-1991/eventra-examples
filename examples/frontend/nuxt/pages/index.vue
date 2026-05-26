<script setup lang="ts">
import { onMounted } from "vue";
import { trackNuxtClick, trackNuxtPageView } from "../utils/events";

onMounted(() => {
  console.log("DOM ready");
  trackNuxtPageView();
});

function handleClick() {
  trackNuxtClick();
}
</script>

<template>
  <main style="padding: 40px">
    <h1>Nuxt Eventra</h1>

    <button @click="handleClick">
      Click me
    </button>
  </main>
</template>
