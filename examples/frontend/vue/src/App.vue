<script setup lang="ts">
import { onMounted } from "vue";
import { trackVueClick, trackVuePageView } from "./events";

onMounted(() => {
  console.log("DOM ready");
  trackVuePageView();
});

function handleClick() {
  trackVueClick();
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
