<script setup lang="ts">
import { onMounted } from "vue";
import { trackFeature } from "../utils/tracker";

const DYNAMIC_FEATURE = "nuxt_dynamic_feature";

onMounted(() => {
  console.log("DOM ready");
  trackFeature("nuxt_page_view");
});
</script>

<template>
  <main style="padding: 40px">
    <h1>Nuxt Eventra</h1>

    <TrackedButton event="nuxt_click">Click me</TrackedButton>
    <TrackedButton :event="DYNAMIC_FEATURE">Dynamic feature</TrackedButton>
  </main>
</template>
