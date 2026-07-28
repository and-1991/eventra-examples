<script setup lang="ts">
import { onMounted } from "vue";
import { trackFeature } from "./tracker";
import TrackedButton from "./components/TrackedButton.vue";

const SECONDARY_CLICK = "vue_secondary_click";

onMounted(() => {
  console.log("DOM ready");
  trackFeature("vue_page_view");
});
</script>

<template>
  <main style="padding: 40px">
    <h1>Vue Eventra</h1>

    <TrackedButton event="vue_click">Click me</TrackedButton>
    <TrackedButton :event="SECONDARY_CLICK">Secondary action</TrackedButton>
  </main>
</template>
