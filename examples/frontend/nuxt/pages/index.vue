<script setup lang="ts">
import { onMounted } from "vue";
import { useNuxtApp } from "#app";

const { $trackFeature } = useNuxtApp();

onMounted(() => {
  console.log("DOM ready");
  $trackFeature("nuxt_page_view");
});

function handleClick() {
  $trackFeature("nuxt_click");
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
