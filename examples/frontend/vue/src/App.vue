<script setup lang="ts">
import { onMounted } from "vue";
import { trackFeature } from "./tracker";

onMounted(() => {
  console.log("DOM ready");

  trackFeature("vue_page_view");
});

function handleClick() {
  trackFeature("vue_click");
}
</script>

<template>
  <main style="padding: 40px">
    <h1>Vue Eventra</h1>

    <button @click="handleClick">
      Click me
    </button>
  </main>
</template>
